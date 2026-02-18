import logging
import sys
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

from steps.step_1_terms import fetch_terms
from steps.step_2_processing import process_all_terms

def main():
    start_time = time.time()
    logger.info("=== Starting Facebook Ads Pipeline ===")
    
    # Step 1: Fetch Terms
    logger.info("\n--- Step 1: Fetching Search Terms ---")
    terms = fetch_terms()
    
    if not terms:
        logger.info("No unprocessed terms found. Exiting.")
        return

    # Step 2: Process Terms (Search -> Filter -> Upsert)
    logger.info(f"\n--- Step 2: Processing {len(terms)} Terms ---")
    process_all_terms(terms)
    
    elapsed = time.time() - start_time
    logger.info(f"\n=== Pipeline Completed in {elapsed:.2f} seconds ===")

if __name__ == "__main__":
    main()
