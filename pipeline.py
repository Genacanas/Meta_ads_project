
import logging
import threading
import asyncio
import time
import sys
import os

from db.postgres_client import fetch_terms, get_conn, fetch_ads_pending_pages

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from steps.step_2_pages import process_all_terms
from steps.step_3_ads import process_all_pages
from steps.step_4_media import main_async as step_4_main

POLL_INTERVAL = 5  # seconds between polling for new pending work


# ─── Step 3 polling loop ────────────────────────────────────────────────────

def step_3_polling_loop(step2_done_event: threading.Event):
    """
    Polls for ads-pending pages and processes them in batches.
    Stops when: no more pending pages AND step2_done_event is set.
    """
    from db.postgres_client import fetch_ads_pending_pages
    meta_client_ref = [None]  # lazy init

    logger.info("[Step 3] Polling loop started.")
    while True:
        conn = get_conn()
        try:
            pages = fetch_ads_pending_pages(conn)
        except Exception as e:
            logger.error(f"[Step 3] Error fetching pending pages: {e}")
            pages = []
        finally:
            conn.close()

        if pages:
            logger.info(f"[Step 3] Found {len(pages)} pending pages — processing...")
            process_all_pages(pages)
        else:
            # No work right now
            if step2_done_event.is_set():
                # Step 2 is done and no more pending — we're done
                logger.info("[Step 3] No pending pages and Step 2 is done. Exiting.")
                break
            else:
                logger.info(f"[Step 3] No pending pages yet. Waiting {POLL_INTERVAL}s...")
                time.sleep(POLL_INTERVAL)


# ─── Step 4 polling loop ────────────────────────────────────────────────────

async def step_4_polling_loop(step3_done_event: threading.Event):
    """
    Polls for media-pending pages and processes them in batches.
    Stops when: no more pending pages AND step3_done_event is set.
    """
    from playwright.async_api import async_playwright
    from steps.step_4_media import process_page_media
    from db.postgres_client import get_conn, fetch_media_pending_pages, reset_stuck_pages
    from config.settings import MEDIA_CONCURRENCY, PLAYWRIGHT_HEADLESS

    logger.info("[Step 4] Polling loop started.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=PLAYWRIGHT_HEADLESS)
        context = await browser.new_context()

        try:
            while True:
                conn = get_conn()
                try:
                    reset_stuck_pages(conn)
                    pages = fetch_media_pending_pages(conn)
                except Exception as e:
                    logger.error(f"[Step 4] Error fetching pending pages: {e}")
                    pages = []
                finally:
                    conn.close()

                if pages:
                    logger.info(f"[Step 4] Found {len(pages)} pending pages — processing...")

                    # Process batch concurrently using worker queue
                    queue = asyncio.Queue()
                    for page in pages:
                        await queue.put(page)

                    async def worker(q):
                        while True:
                            item = await q.get()
                            if item is None:
                                q.task_done()
                                break
                            await process_page_media(context, item)
                            q.task_done()

                    workers = [
                        asyncio.create_task(worker(queue))
                        for _ in range(min(MEDIA_CONCURRENCY, len(pages)))
                    ]
                    await queue.join()
                    for _ in workers:
                        await queue.put(None)
                    await asyncio.gather(*workers)

                else:
                    # No work right now
                    if step3_done_event.is_set():
                        logger.info("[Step 4] No pending pages and Step 3 is done. Exiting.")
                        break
                    else:
                        logger.info(f"[Step 4] No pending media yet. Waiting {POLL_INTERVAL}s...")
                        await asyncio.sleep(POLL_INTERVAL)

        finally:
            await browser.close()


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()
    logger.info("=== Starting Facebook Ads Data Pipeline (STREAMING v3) ===")

    # Events to signal step completion
    step2_done = threading.Event()
    step3_done = threading.Event()

    # --- Step 1: Fetch Terms ---
    logger.info("\n--- Step 1: Fetching Search Terms ---")
    t1 = time.time()
    conn = get_conn()
    try:
        terms = fetch_terms(conn)
    finally:
        conn.close()
    logger.info(f"Step 1 finished in {time.time() - t1:.2f}s. Found {len(terms)} term(s).")

    if not terms:
        logger.info("No unprocessed terms. Running Steps 3 & 4 on existing pending work only.")
        step2_done.set()  # Signal immediately — no Step 2 work

    # --- Step 3: Start polling loop in background thread ---
    def run_step3():
        try:
            step_3_polling_loop(step2_done)
        except Exception as e:
            logger.error(f"[Step 3] Fatal error: {e}")
        finally:
            step3_done.set()
            logger.info(f"[Step 3] Done.")

    t3 = threading.Thread(target=run_step3, daemon=True, name="Step3-Poller")
    t3.start()

    # --- Step 4: Start async polling loop in background thread ---
    def run_step4():
        try:
            asyncio.run(step_4_polling_loop(step3_done))
        except Exception as e:
            logger.error(f"[Step 4] Fatal error: {e}")
        logger.info("[Step 4] Done.")

    t4 = threading.Thread(target=run_step4, daemon=True, name="Step4-Poller")
    t4.start()

    # --- Step 2: Process terms (blocks until done, then signals) ---
    if terms:
        logger.info(f"\n--- Step 2: Searching Pages for {len(terms)} Term(s) ---")
        t2 = time.time()
        try:
            process_all_terms(terms)
        except Exception as e:
            logger.error(f"[Step 2] Error: {e}")
        logger.info(f"Step 2 finished in {time.time() - t2:.2f}s.")

    step2_done.set()  # Allow Step 3 to drain and exit
    logger.info("Step 2 done — signaled Step 3.")

    # Wait for Steps 3 and 4 to finish
    t3.join()
    logger.info("Step 3 finished.")
    # step3_done is set inside run_step3's finally block
    t4.join()
    logger.info("Step 4 finished.")

    elapsed = time.time() - start_time
    logger.info(f"\n=== Pipeline Completed in {elapsed:.2f} seconds ===")


if __name__ == "__main__":
    main()
