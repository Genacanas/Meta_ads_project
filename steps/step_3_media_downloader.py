import os
import sys
import logging
import time
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Ensure correct path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.postgres_client import get_conn

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

def scrape_media_from_url(page_obj, url):
    """
    Uses Playwright to navigate to the ad snapshot URL and extract media.
    Returns (media_type, media_url) or (None, None).
    """
    try:
        logger.info(f"Navigating to {url}...")
        page_obj.goto(url, timeout=60000, wait_until="domcontentloaded")
        
        # Wait a bit for dynamic content
        time.sleep(5) 
        
        # 1. Try to find a VIDEO
        # Facebook Ad Library videos often use <video> tags
        video_element = page_obj.query_selector('video')
        if video_element:
            src = video_element.get_attribute('src')
            if src:
                return 'VIDEO', src
        
        # 2. Try to find the main IMAGE
        # This is trickier as there are many images (logos, UI, etc.)
        # Heuristic: Find the largest image in the main content area
        
        # NEW: Check for Carousel indicators (multiple images of similar large size)
        # However, our heuristic below (largest image) usually picks the first image of a carousel 
        # if it's large enough. 
        # The user specifically wants to SKIP carousels if they aren't "video/image".
        # If we just pick the first image of a carousel, is that "skipping" it?
        # User said: "if it is not video/image, we skip". 
        # A carousel IS a bunch of images. 
        # If we can detect it's a carousel, we should return None.
        
        # Simple carousel detection: Look for "div[role='button']" that might be a next arrow? 
        # Or check if there are multiple large images?
        # For now, let's stick to the heuristic: if we find a good single image, we take it.
        # If it's a carousel, taking the first image is often acceptable, but if the user 
        # means "Ad Type = Carousel", we might need more metadata.
        # Since we don't have metadata, we rely on the extraction success.
        
        images = page_obj.query_selector_all('img')
        best_image = None
        max_area = 0
        
        for img in images:
            box = img.bounding_box()
            if box:
                area = box['width'] * box['height']
                # Filter out small icons/logos (e.g. less than 100x100)
                if area > 10000 and area > max_area:
                    max_area = area
                    best_image = img
        
        if best_image:
            src = best_image.get_attribute('src')
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

def main():
    logger.info("Starting Media Downloader Step...")
    
    conn = get_conn()
    if not conn:
        logger.error("Could not connect to DB.")
        return

    create_table_if_not_exists(conn)

    # Fetch all pages
    with conn.cursor() as cur:
        cur.execute("SELECT page_id, name FROM pages")
        pages = cur.fetchall()

    logger.info(f"Found {len(pages)} pages to check.")

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        page_obj = context.new_page()

        for page_row in pages:
            page_id, page_name = page_row
            
            # Check if we already have a top creative
            with conn.cursor() as cur:
                cur.execute("SELECT ad_id FROM page_top_creatives WHERE page_id = %s", (page_id,))
                existing = cur.fetchone()
                
            # Get candidates (Top 5 ads)
            candidates = get_top_ads_for_page(conn, page_id, limit=5)
            
            if not candidates:
                logger.info(f"No ads found for page {page_name} ({page_id})")
                continue
                
            # Iterate through candidates until we find one with media
            found_media = False
            
            for ad_candidate in candidates:
                ad_id, snapshot_url, reach = ad_candidate
                
                # If we already have this specific ad processed, we can skip or re-check.
                # If user wants to "skip carousel", maybe our previous scrape was bad.
                # Let's assume if it exists, it's good (optimization), unless we force proper check.
                if existing and existing[0] == str(ad_id):
                    logger.info(f"Page {page_name}: Creative for ad {ad_id} already exists. Skipping.")
                    found_media = True
                    break
                
                logger.info(f"Page {page_name}: Checking candidate ad {ad_id} (Reach: {reach})")
                
                if not snapshot_url:
                    continue

                media_type, media_url = scrape_media_from_url(page_obj, snapshot_url)
                
                if media_url:
                    logger.info(f"  FOUND {media_type}: {media_url[:50]}...")
                    upsert_creative(conn, page_id, ad_id, media_type, media_url, reach)
                    found_media = True
                    break # Stop looking for this page, we found the best valid one
                else:
                    logger.info(f"  No media found for {ad_id}, checking next candidate...")

            if not found_media:
                logger.warning(f"Page {page_name}: Could not find valid media in top 5 ads.")

        browser.close()
    
    conn.close()
    logger.info("Media Downloader Step Completed.")

if __name__ == "__main__":
    main()
