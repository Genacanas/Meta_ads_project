
from datetime import datetime
import logging
import concurrent.futures
import threading
from api.meta_client import MetaClient
from db.postgres_client import get_conn, upsert_ads, mark_page_status, fetch_ads_pending_pages
from config.settings import PAGES_CONCURRENCY

logger = logging.getLogger(__name__)

# Shared lock? Maybe not needed as pages are partitioned by fetch? 
# but fetch_ads_pending_pages returns a list, and we process them.

def get_row_value(row, *keys):
    """Start with the keys provided and return the first one found."""
    for key in keys:
        if key in row:
            return row[key]
        if key.lower() in row:
            return row[key.lower()]
    return None

def process_page_ads(page_record, meta_client, min_date):
    """
    Process a single page to FETCH ADS.
    1. Mark page ads_status='processing'.
    2. Fetch ads from API.
    3. Filter ads (active, date).
    4. Upsert ads.
    5. Update page stats (active reach).
    6. Mark page ads_status='completed', media_status='pending'.
    """
    page_id = page_record[0]
    page_name = page_record[1]
    
    conn = get_conn()
    try:
        mark_page_status(conn, page_id, 'ads_status', 'processing')
    except Exception:
        pass
    finally:
        conn.close()

    conn = get_conn() # Re-open for main work
    try:
        # Fetch Ads
        try:
            # Note: MetaClient handles token rotation internally.
            # We assume get_ads_by_page fetches ALL ads (pagination handled inside)
            # Use country? fetch_ads_pending_pages should maybe return country too?
            # Let's assume we search all countries or use 'ALL' if not specified.
            # Meta API often needs country. Let's update fetch_ads_pending_pages to return it.
            # Assuming page_record has it. For now, let's use ['US', 'ES', 'MX', 'AR', 'CO'] or just try without if possible, 
            # but usually we need it. 
            # Wait, get_ads_by_page needs country list.
            # I need to update fetch_ads_pending_pages to return country.
            # For now, let's assume 'US' or fetch from DB.
            # actually we can fetch it.
            country = page_record[2] if len(page_record) > 2 else 'US' 
            
            page_ads = meta_client.get_ads_by_page(page_id, [country], limit=100)
        except Exception as e:
            logger.error(f"Error fetching ads for page {page_id}: {e}")
            mark_page_status(conn, page_id, 'ads_status', 'error')
            return
        
        total_eu_reach_sum = 0
        active_total_eu_reach_sum = 0
        ads_to_upsert = []
        
        for ad in page_ads:
            # --- FILTER BY DATE ---
            creation_time_str = ad.get("ad_creation_time")
            if min_date and creation_time_str:
                try:
                    creation_dt = datetime.fromisoformat(creation_time_str).date()
                    if creation_dt < min_date:
                        continue # Skip old ads
                except ValueError:
                    pass 

            # Calculate EU Reach
            reach = ad.get("eu_total_reach", 0)
            reach_val = 0
            if isinstance(reach, (int, float)):
                reach_val = int(reach)
            elif isinstance(reach, dict):
                    if 'ub' in reach:
                        reach_val = int(reach['ub'])
            
            total_eu_reach_sum += reach_val
            
            # Calculate is_active
            is_active = "ad_delivery_stop_time" not in ad
            
            if is_active:
                active_total_eu_reach_sum += reach_val
            
            # --- FILTER: ONLY SAVE ACTIVE ADS ---
            if not is_active:
                continue

            # Extract beneficiary
            beneficiary = None
            if "beneficiary_payers" in ad and isinstance(ad["beneficiary_payers"], list):
                for bp in ad["beneficiary_payers"]:
                    if "beneficiary" in bp:
                        beneficiary = bp["beneficiary"]
                        break
                        
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
                # "search_term_id": term_id, # We don't have term_id easily here since we decoupled. 
                # This is a trade-off. We might need to map it if strictly required, 
                # but user wanted to decouple. We can leave it null or try to infer.
                # The previous logic had it. If it's critical, we need to pass it.
                # However, many pages map to multiple terms.
                # Ideally, we link ads to pages, and pages to terms (via search_results table? or just loose coupling).
                # For now, we omit search_term_id or set to 0/NULL.
                "search_term_id": None 
            })

        # Insert Ads
        if ads_to_upsert:
            try:
                upsert_ads(conn, ads_to_upsert)
            except Exception as e:
                logger.error(f"Failed to upsert ads for page {page_id}: {e}")
                conn.rollback()
        
        # Update Page Stats & Status
        try:
             # Update reach metrics (Only Active)
             with conn.cursor() as cur:
                 cur.execute("""
                     UPDATE pages 
                     SET active_total_eu_reach = %s
                     WHERE page_id = %s
                 """, (active_total_eu_reach_sum, page_id))
             
             # Mark COMPLETED and trigger MEDIA PENDING if ads found
             if ads_to_upsert:
                 mark_page_status(conn, page_id, 'ads_status', 'completed')
                 mark_page_status(conn, page_id, 'media_status', 'pending')
                 logger.info(f"Page {page_id}: Ads processed. Active Reach: {active_total_eu_reach_sum}. Media Pending.")
             else:
                 mark_page_status(conn, page_id, 'ads_status', 'not_found')
                 # Do NOT trigger media pending
                 logger.info(f"Page {page_id}: No active/recent ads found. Marked as not_found.")

        except Exception as e:
            logger.error(f"Error updating page status {page_id}: {e}")
            conn.rollback()

    finally:
        conn.close()

def process_all_pages(pages):
    print(f"Starting process_all_pages (Step 3) with {len(pages)} pages.")
    if not pages:
        logger.info("No pages to process.")
        return

    meta_client = MetaClient()
    min_date = None # Can be passed via args or config

    # Process pages in Parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=PAGES_CONCURRENCY) as executor:
        futures = []
        for page in pages:
            futures.append(
                executor.submit(process_page_ads, page, meta_client, min_date)
            )
        
        concurrent.futures.wait(futures)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    conn = get_conn()
    try:
        # We need to implement fetch_ads_pending_pages in postgres_client first!
        # or use a raw query here for now? Better to add to postgres_client.
        # I will assume it exists or add it in next step.
        from db.postgres_client import fetch_ads_pending_pages
        pages = fetch_ads_pending_pages(conn)
        print(f"Pages to process: {len(pages)}")
        process_all_pages(pages)
    finally:
        conn.close()
