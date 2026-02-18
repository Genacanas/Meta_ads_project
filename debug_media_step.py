import os
import sys
import logging
from playwright.sync_api import sync_playwright

# Ensure correct path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.postgres_client import get_conn
from steps.step_3_media_downloader import get_best_ad_for_page, scrape_media_from_url, upsert_creative, create_table_if_not_exists

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_single_page(page_name_filter):
    conn = get_conn()
    if not conn:
        logger.error("Could not connect to DB.")
        return

    create_table_if_not_exists(conn)

    with conn.cursor() as cur:
        # Find a page that matches the name (or just any page if None)
        cur.execute("SELECT page_id, name FROM pages WHERE name LIKE %s LIMIT 1", (f"%{page_name_filter}%",))
        page = cur.fetchone()
    
    if not page:
        logger.error(f"No page found matching {page_name_filter}")
        return

    page_id, page_name = page
    logger.info(f"Debugging for Page: {page_name} ({page_id})")

    best_ad = get_best_ad_for_page(conn, page_id)
    if not best_ad:
        logger.error("No ads found for this page.")
        return

    ad_id, snapshot_url, reach = best_ad
    logger.info(f"Best Ad: {ad_id} | Reach: {reach} | URL: {snapshot_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page_obj = browser.new_page()
        
        media_type, media_url = scrape_media_from_url(page_obj, snapshot_url)
        browser.close()

    if media_url:
        logger.info(f"Scraped {media_type}: {media_url}")
        upsert_creative(conn, page_id, ad_id, media_type, media_url, reach)
        
        # VERIFY IMMEDIATELLY
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM page_top_creatives WHERE page_id = %s", (page_id,))
            row = cur.fetchone()
            if row:
                logger.info(f"✅ SUCCESS! Row found in DB: {row}")
            else:
                logger.error("❌ FAILURE! Row NOT found in DB after upsert.")
    else:
        logger.warning("No media found to scrape.")

    conn.close()

if __name__ == "__main__":
    # Use the page name from the logs that we know works: "Behrentin Communication GmbH"
    debug_single_page("Behrentin")
