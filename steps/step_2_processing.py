from datetime import datetime
import logging
from api.meta_client import MetaClient
from db.postgres_client import get_conn, get_existing_page_ids, upsert_pages, upsert_ads, update_term_status, fetch_unprocessed_terms

logger = logging.getLogger(__name__)

def get_row_value(row, *keys):
    """Start with the keys provided and return the first one found."""
    for key in keys:
        if key in row:
            return row[key]
        if key.lower() in row:
            return row[key.lower()]
    return None

def process_term(term_record, meta_client, existing_page_ids, conn):
    """
    Process a single search term:
    1. Search for ads to find pages.
    2. Filter out existing pages.
    3. For each new page, fetch its ads.
    4. Filter ads by min_ad_creation_time.
    5. Upsert pages and ads to DB.
    """
    term_id = get_row_value(term_record, "id")
    term = get_row_value(term_record, "Search_term", "search_term")
    country = get_row_value(term_record, "Country", "country")
    min_date_str = get_row_value(term_record, "min_ad_creation_time")
    
    if not term or not country:
        logger.warning(f"Skipping invalid term record: {term_record}")
        return

    # Parse min_date if present
    min_date = None
    if min_date_str:
        try:
            # Handle full timestamp (e.g. 2026-02-10 00:00:00+00:00) or just date
            # Taking the first 10 characters "YYYY-MM-DD" is a robust quick fix
            date_part = str(min_date_str)[:10]
            min_date = datetime.strptime(date_part, "%Y-%m-%d").date()
            logger.info(f"Applying filter: Ads created >= {min_date}")
        except ValueError as e:
            logger.warning(f"Invalid min_ad_creation_time format '{min_date_str}': {e}")


    logger.info(f"Processing term: '{term}' for country: '{country}' (ID: {term_id})")

    # 1. Search for Pages via Ads
    try:
        ads_results = meta_client.search_ads(term, [country], limit=50) 
    except Exception as e:
        logger.error(f"Error searching ads for term '{term}': {e}")
        return

    unique_page_ids = set()
    for ad in ads_results:
        pid = ad.get("page_id")
        if pid:
            unique_page_ids.add(pid)

    # 2. Filter out pages that are already processed
    pages_to_process = [pid for pid in unique_page_ids if str(pid) not in existing_page_ids]
    # pages_to_process = list(unique_page_ids) # Force process ALL for backfill
    
    logger.info(f"Found {len(unique_page_ids)} unique pages. New to process: {len(pages_to_process)}")

    # 3. Process each Page
    for page_id in pages_to_process:
        try:
            page_ads = meta_client.get_ads_by_page(page_id, [country], limit=100)
        except Exception as e:
            logger.error(f"Error fetching ads for page {page_id}: {e}")
            continue
        
        total_eu_reach_sum = 0
        page_name = None
        ads_to_upsert = []
        
        for ad in page_ads:
            # Capture page name
            if not page_name and "page_name" in ad:
                page_name = ad["page_name"]
            
            # --- FILTER BY DATE ---
            creation_time_str = ad.get("ad_creation_time")
            if min_date and creation_time_str:
                try:
                    creation_dt = datetime.fromisoformat(creation_time_str).date()
                    if creation_dt < min_date:
                        continue # Skip old ads
                except ValueError:
                    pass # Keep if format unparseable (safe default?) or skip? Keeping for now.

            # Calculate EU Reach
            reach = ad.get("eu_total_reach", 0)
            reach_val = 0
            if isinstance(reach, (int, float)):
                reach_val = int(reach)
            elif isinstance(reach, dict):
                    if 'ub' in reach:
                        reach_val = int(reach['ub'])
            
            total_eu_reach_sum += reach_val
            
            # Extract beneficiary
            beneficiary = None
            if "beneficiary_payers" in ad and isinstance(ad["beneficiary_payers"], list):
                for bp in ad["beneficiary_payers"]:
                    if "beneficiary" in bp:
                        beneficiary = bp["beneficiary"]
                        break
            
            # Calculate is_active
            is_active = "ad_delivery_stop_time" not in ad
                        
            # Collect Ad Data
            ads_to_upsert.append({
                "ad_id": ad.get("id"),
                "page_id": page_id,
                "ad_creation_time": ad.get("ad_creation_time"),
                "ad_delivery_start_time": ad.get("ad_delivery_start_time"),
                "ad_delivery_stop_time": ad.get("ad_delivery_stop_time"),
                "ad_snapshot_url": ad.get("ad_snapshot_url"),
                "eu_total_reach": reach_val,
                "is_active": is_active,
                "beneficiary": beneficiary,
                "search_term_id": term_id,
            })

        # Upsert Page FIRST
        if page_name: 
            logger.info(f"Page {page_id} ('{page_name}') Total Reach: {total_eu_reach_sum}")
            try:
                upsert_pages(conn, [{
                    "page_id": page_id,
                    "name": page_name,
                    "country": country,
                    "total_eu_reach": total_eu_reach_sum
                }])
                existing_page_ids.add(str(page_id)) 
            except Exception as e:
                logger.error(f"Failed to upsert page {page_id}: {e}")
                conn.rollback() 
        
        # Batch Upsert Ads
        if ads_to_upsert:
            try:
                upsert_ads(conn, ads_to_upsert)
            except Exception as e:
                logger.error(f"Failed to upsert ads for page {page_id}: {e}")
                conn.rollback()

    # Mark term as processed
    if term_id:
        logger.info(f"Marking term ID {term_id} as processed.")
        update_term_status(conn, term_id)

def process_all_terms(terms):
    print(f"Starting process_all_terms with {len(terms)} terms.")
    if not terms:
        logger.info("No terms to process.")
        return

    conn = get_conn()
    meta = MetaClient()
    
    try:
        # Load existing pages once
        try:
            existing_page_ids = get_existing_page_ids(conn)
            logger.info(f"Loaded {len(existing_page_ids)} existing pages from DB.")
        except Exception as e:
            logger.error(f"Failed to load existing pages: {e}")
            existing_page_ids = set()

        for term in terms:
            print(f"Processing term: {term}")
            process_term(term, meta, existing_page_ids, conn)
            
    finally:
        conn.close()

if __name__ == "__main__":
    # Setup basic logging to stdout
    logging.basicConfig(level=logging.INFO)
    conn = get_conn()
    try:
        terms = fetch_unprocessed_terms(conn)
        print(f"Terms to process: {len(terms)}")
        process_all_terms(terms)
    finally:
        conn.close()
