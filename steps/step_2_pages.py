
from datetime import datetime
import logging
import concurrent.futures
import threading
from api.meta_client import MetaClient
from db.postgres_client import get_conn, get_existing_page_ids, upsert_pages, mark_term_status, fetch_terms
from config.settings import TERMS_CONCURRENCY

logger = logging.getLogger(__name__)

# Shared lock for existing_page_ids set
page_ids_lock = threading.Lock()

def get_row_value(row, *keys):
    """Start with the keys provided and return the first one found."""
    for key in keys:
        if key in row:
            return row[key]
        if key.lower() in row:
            return row[key.lower()]
    return None

def process_term_pages(term_record, meta_client, existing_page_ids):
    """
    Process a single search term to FIND PAGES only.
    1. Mark term as processing.
    2. Search for ads to find pages.
    3. Upsert pages with ads_status='pending'.
    4. Mark term as completed.
    """
    term_id = get_row_value(term_record, "id")
    term = get_row_value(term_record, "Search_term", "search_term")
    country = get_row_value(term_record, "Country", "country")
    
    if not term or not country:
        logger.warning(f"Skipping invalid term record: {term_record}")
        return

    # Mark term as processing
    conn = get_conn()
    try:
        if term_id:
            mark_term_status(conn, term_id, 'processing')
    except Exception as e:
        logger.error(f"Error marking term {term_id} as processing: {e}")
    finally:
        conn.close()

    logger.info(f"Searching Pages for term: '{term}' in '{country}' (ID: {term_id})")

    try:
        # 1. Search for Pages via Ads
        try:
             # Note: Client handles token rotation
            ads_results = meta_client.search_ads(term, [country])
        except Exception as e:
            logger.error(f"Error searching ads for term '{term}': {e}")
            raise  # Re-raise so the outer handler marks term as 'error'

        unique_pages = {}
        for ad in ads_results:
            pid = ad.get("page_id")
            pname = ad.get("page_name")
            if pid and pid not in unique_pages:
                unique_pages[pid] = pname

        # 2. Filter out pages that are already known (optional, but good for logs)
        new_pages = []
        with page_ids_lock:
            for pid, pname in unique_pages.items():
                if str(pid) not in existing_page_ids:
                    new_pages.append({
                        "page_id": pid, 
                        "name": pname, 
                        "country": country,
                        "total_eu_reach": 0  # Default for new pages
                    })
        
        logger.info(f"Term '{term}': Found {len(unique_pages)} pages. New: {len(new_pages)}")

        # 3. Upsert Pages
        if new_pages:
            conn = get_conn()
            try:
                upsert_pages(conn, new_pages) # This sets ads_status='pending' by default in DB or upsert logic
                with page_ids_lock:
                    for p in new_pages:
                        existing_page_ids.add(str(p['page_id']))
            except Exception as e:
                logger.error(f"Error upserting pages for term {term}: {e}")
            finally:
                conn.close()

        # Mark term as completed
        if term_id:
            conn = get_conn()
            try:
                logger.info(f"Marking term ID {term_id} as completed.")
                mark_term_status(conn, term_id, 'completed')
            finally:
                conn.close()
                
    except Exception as e:
        logger.error(f"Error processing term {term}: {e}")
        if term_id:
            conn = get_conn()
            try:
                 mark_term_status(conn, term_id, 'error')
            finally:
                conn.close()

def process_all_terms(terms):
    print(f"Starting process_all_terms (Step 2) with {len(terms)} terms.")
    if not terms:
        logger.info("No terms to process.")
        return


    conn = get_conn()
    existing_page_ids = set()
    
    try:
        # Load existing pages once
        try:
            existing_page_ids = get_existing_page_ids(conn)
            logger.info(f"Loaded {len(existing_page_ids)} existing pages from DB.")
        except Exception as e:
            logger.error(f"Failed to load existing pages: {e}")
            existing_page_ids = set()
    finally:
        conn.close()

    meta_client = MetaClient()
    
    # Process terms in Parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=TERMS_CONCURRENCY) as executor:
        futures = []
        for term in terms:
           # print(f"Submitting term: {term}")
            futures.append(
                executor.submit(process_term_pages, term, meta_client, existing_page_ids)
            )
        
        concurrent.futures.wait(futures)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    conn = get_conn()
    try:
        terms = fetch_terms(conn)
        print(f"Terms to process: {len(terms)}")
        process_all_terms(terms)
    finally:
        conn.close()
