
import os
import sys
import logging
import time
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# Ensure correct path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.postgres_client import get_conn, fetch_media_pending_pages, mark_page_status, reset_stuck_pages, increment_media_retry
from config.settings import MEDIA_CONCURRENCY, PLAYWRIGHT_HEADLESS

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def create_table_if_not_exists(conn):
    """Create the page_top_creatives table if it doesn't exist."""
    create_sql = """
    CREATE TABLE IF NOT EXISTS page_top_creatives (
        page_id VARCHAR(255) PRIMARY KEY,
        ad_id VARCHAR(255),
        media_type VARCHAR(50),
        media_url TEXT,
        eu_total_reach BIGINT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (page_id) REFERENCES pages(page_id),
        FOREIGN KEY (ad_id) REFERENCES ads(ad_id)
    );
    """
    try:
        with conn.cursor() as cur:
            cur.execute(create_sql)
        conn.commit()
    except Exception as e:
        logger.error(f"Error creating table: {e}")
        conn.rollback()

def get_top_ads_for_page(conn, page_id, limit=5):
    """Find the top ads with the highest eu_total_reach for a given page."""
    query = """
    SELECT ad_id, ad_snapshot_url, eu_total_reach
    FROM ads
    WHERE page_id = %s AND ad_snapshot_url IS NOT NULL
    ORDER BY eu_total_reach DESC
    LIMIT %s;
    """
    with conn.cursor() as cur:
        cur.execute(query, (page_id, limit))
        return cur.fetchall()

async def scrape_media_from_url(page_obj, url):
    """
    Uses Playwright to navigate to the ad snapshot URL and extract media.
    Returns (media_type, media_url) or (None, None).
    """
    try:
        await page_obj.goto(url, timeout=60000, wait_until="domcontentloaded")
        
        # Wait for video or a significant image to appear (up to 10s), fallback silently
        try:
            await page_obj.wait_for_selector('video, img', timeout=10000)
        except Exception:
            pass  # Content may still be there, continue scraping
        
        # 1. Try to find a VIDEO
        video_element = await page_obj.query_selector('video')
        if video_element:
            src = await video_element.get_attribute('src')
            if src:
                return 'VIDEO', src
        
        # 2. Try to find the main IMAGE
        images = await page_obj.query_selector_all('img')
        best_image = None
        max_area = 0
        
        for img in images:
            box = await img.bounding_box()
            if box:
                area = box['width'] * box['height']
                if area > 10000 and area > max_area:
                    max_area = area
                    best_image = img
        
        if best_image:
            src = await best_image.get_attribute('src')
            return 'IMAGE', src

        return None, None

    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
        return None, None

def upsert_creative(conn, page_id, ad_id, media_type, media_url, reach):
    """Upsert the found creative into the database."""
    sql = """
    INSERT INTO page_top_creatives (page_id, ad_id, media_type, media_url, eu_total_reach, updated_at)
    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
    ON CONFLICT (page_id) DO UPDATE SET
        ad_id = EXCLUDED.ad_id,
        media_type = EXCLUDED.media_type,
        media_url = EXCLUDED.media_url,
        eu_total_reach = EXCLUDED.eu_total_reach,
        updated_at = CURRENT_TIMESTAMP;
    """
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (page_id, ad_id, media_type, media_url, reach))
        conn.commit()
    except Exception as e:
        logger.error(f"Error upserting creative: {e}")
        conn.rollback()

async def process_page_media(context, page_row):
    """
    Process a single page to find media.
    Acquires semaphore to limit concurrency.
    """
    page_id, page_name = page_row
    
    conn = get_conn() 
    if not conn:
        return

    # Mark as processing
    try:
        mark_page_status(conn, page_id, 'media_status', 'processing')
    except Exception:
        pass

    page_obj = await context.new_page()
    
    try:
        # Check if we already have a top creative
        with conn.cursor() as cur:
            cur.execute("SELECT ad_id FROM page_top_creatives WHERE page_id = %s", (page_id,))
            existing = cur.fetchone()
            
        # Get candidates (Top 5 ads)
        candidates = get_top_ads_for_page(conn, page_id, limit=3)
        
        if not candidates:
            logger.info(f"No ads found for page {page_name} ({page_id})")
            # Mark as not_found (no ads to process)
            mark_page_status(conn, page_id, 'media_status', 'not_found')
            return

        found_media = False
        for ad_candidate in candidates:
            ad_id, snapshot_url, reach = ad_candidate
            
            # Check existance
            if existing and existing[0] == str(ad_id):
                logger.info(f"Page {page_name}: Creative for ad {ad_id} already exists. Skipping.")
                found_media = True
                break
            
            logger.info(f"Page {page_name}: Checking candidate ad {ad_id} (Reach: {reach})")
            
            if not snapshot_url:
                continue

            media_type, media_url = await scrape_media_from_url(page_obj, snapshot_url)
            
            if media_url:
                logger.info(f"  FOUND {media_type}: {media_url[:50]}...")
                upsert_creative(conn, page_id, ad_id, media_type, media_url, reach)
                found_media = True
                break 
            else:
                logger.info(f"  No media found for {ad_id}, checking next candidate...")
        
        if not found_media:
            logger.warning(f"Page {page_name}: Could not find valid media in top 5 ads.")
        
        # Mark as completed or not_found
        if found_media:
            mark_page_status(conn, page_id, 'media_status', 'completed')
        else:
            mark_page_status(conn, page_id, 'media_status', 'not_found')

    except Exception as e:
        logger.error(f"Error processing page {page_id}: {e}")
        new_status = increment_media_retry(conn, page_id)
        logger.warning(f"Page {page_id} marked as '{new_status}' after retry increment.")
    finally:
        await page_obj.close()
        conn.close()

async def worker(queue, context):
    while True:
        page_row = await queue.get()
        if page_row is None:
            queue.task_done()
            break

        await process_page_media(context, page_row)
        queue.task_done()

async def main_async():
    logger.info("Starting Media Downloader (Step 4) (Async)...")
    
    # 1. Fetch pages to check
    conn = get_conn()
    if not conn:
        logger.error("Could not connect to DB.")
        return

    #create_table_if_not_exists(conn)                       --------------- perdida de tiempo ----------------

    # Reset any stuck pages from previous interrupted runs (media_status only)
    try:
        media_reset = reset_stuck_pages(conn)
        if media_reset > 0:
            logger.info(f"Reset {media_reset} media-stuck pages to 'pending'.")
    except Exception as e:
        logger.error(f"Error resetting stuck pages: {e}")

    # Fetch pending pages
    try:
        pages = fetch_media_pending_pages(conn)
    except Exception as e:
        logger.error(f"Error fetching pages: {e}")
        pages = []
    finally:
        conn.close() 

    logger.info(f"Found {len(pages)} pages pending media download.")

    if not pages:
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=PLAYWRIGHT_HEADLESS)
        context = await browser.new_context()

        queue = asyncio.Queue()

        for page in pages:
            await queue.put(page)

        workers = [
            asyncio.create_task(worker(queue, context))
            for _ in range(MEDIA_CONCURRENCY)
        ]

        await queue.join()

        for _ in workers:
            await queue.put(None)

        await asyncio.gather(*workers)

        await browser.close()
    
    logger.info("Media Downloader Step Completed.")

if __name__ == "__main__":
    asyncio.run(main_async())
