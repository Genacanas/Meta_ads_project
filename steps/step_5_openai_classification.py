import os
import sys
import time
import json
import logging
import concurrent.futures

# Add parent directory to sys.path so we can import from db and config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

from db.postgres_client import (
    get_conn,
    fetch_classification_pending_pages,
    fetch_page_ads_bodies,
    save_openai_batch,
    get_pending_openai_batches,
    update_openai_batch_status,
    mark_page_classification,
    mark_page_status
)

try:
    from openai import OpenAI
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
    from openai import OpenAI

load_dotenv()
logger = logging.getLogger(__name__)

# Single source of truth for categories
VALID_CATEGORIES = [
    "Print on demand", "Personalized products", "Mix of everything", "Clothes",
    "Car accessories", "Pets", "Kids", "Jewelry", "Outdoors/Survival",
    "Home decor", "Electronics", "Phone cases", "Make up", "Fitness",
    "Health", "Tools", "Videos", "Health care", "Others", "Phone program",
    "Computer program", "Books", "Food", "Travel", "Real estate", "Furniture"
]

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY missing from .env file")
    return OpenAI(api_key=api_key)

def construct_prompt(page_name, bodies):
    request = f"Page name: {page_name}\r\n"
    if bodies:
        for i, body in enumerate(bodies):
            request += f"Ad {i + 1}: {body}\r\n"

    request += "\r\nYour task: Classify this Facebook page into EXACTLY ONE category from the list below.\r\n\r\n"
    request += "CRITICAL RULES:\r\n"
    request += "1. Output ONLY the category name, nothing else\r\n"
    request += "2. Do NOT add punctuation, explanations, or extra text\r\n"
    request += "3. Copy the category name EXACTLY as written\r\n"
    request += "4. If unsure or doesn't fit clearly, output: Others\r\n\r\n"
    request += "VALID CATEGORIES:\r\n"
    request += ", ".join(VALID_CATEGORIES) + "\r\n\r\n"
    request += "Examples:\r\n"
    request += "Input: Custom t-shirt designs → Output: Print on demand\r\n"
    request += "Input: Dog toys and treats → Output: Pets\r\n"
    request += "Input: Kitchen utensils → Output: Home decor\r\n\r\n"
    request += "Now classify the page above:"
    return request

def process_upload_batch():
    """Find pending pages, create JSONL file, upload to OpenAI Batch API."""
    conn = get_conn()
    try:
        pages = fetch_classification_pending_pages(conn, limit=1000)
    finally:
        conn.close()

    if not pages:
        return

    logger.info(f"[Step 5] Found {len(pages)} pages pending classification. Preparing `.jsonl`...")

    batch_requests = []
    pages_to_process = []
    
    conn = get_conn()
    try:
        for page in pages:
            page_id = page[0]
            page_name = page[1]
            bodies = fetch_page_ads_bodies(conn, page_id)
            
            # If no descriptions, we could maybe skip or fallback. But prompt allows empty bodies too.
            # But normally we require it to classify decently.
            # We will send whatever we have.
            prompt = construct_prompt(page_name, bodies)
            
            request = {
                "custom_id": str(page_id),
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-4o-mini",
                    "temperature": 0.2,
                    "max_tokens": 4096,
                    "messages": [
                        {"role": "system", "content": "You are a precise classification system. You output ONLY the exact category name from the provided list, with no additional text, punctuation, or explanation."},
                        {"role": "user", "content": prompt}
                    ]
                }
            }
            batch_requests.append(request)
            pages_to_process.append(page_id)
    finally:
        conn.close()

    if not batch_requests:
        return

    # Write JSONL
    filename = f"batch_{int(time.time())}.jsonl"
    with open(filename, 'w', encoding='utf-8') as f:
        for req in batch_requests:
            f.write(json.dumps(req) + "\n")
            
    client = get_openai_client()
    try:
        logger.info(f"[Step 5] Uploading file {filename} to OpenAI...")
        with open(filename, "rb") as file_to_upload:
            batch_input_file = client.files.create(
                file=file_to_upload,
                purpose="batch"
            )
            
        logger.info("[Step 5] Creating batch job...")
        batch = client.batches.create(
            input_file_id=batch_input_file.id,
            endpoint="/v1/chat/completions",
            completion_window="24h"
        )
        
        batch_id = batch.id
        logger.info(f"[Step 5] Batch created successfully: {batch_id}")
        
        # Save batch_id to DB and mark pages as processing
        conn = get_conn()
        try:
            save_openai_batch(conn, batch_id)
            for pid in pages_to_process:
                mark_page_status(conn, pid, 'classification_status', 'processing')
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"[Step 5] Error uploading batch: {e}")
    finally:
        # Cleanup the file
        if os.path.exists(filename):
            os.remove(filename)

def validate_category(result_text):
    """Same exact matching logic as functions.cs"""
    if not result_text:
        return "Others"
        
    result_text = result_text.strip().rstrip('.!?,;:')
    
    # Exact Match
    for c in VALID_CATEGORIES:
        if c.lower() == result_text.lower():
            return c
            
    # Partial Match
    for c in VALID_CATEGORIES:
        if result_text.lower() in c.lower() or c.lower() in result_text.lower():
            logger.info(f"Partial match found: '{result_text}' -> '{c}'")
            return c
            
    logger.warning(f"Invalid category returned: '{result_text}'. Defaulting to 'Others'")
    return "Others"

def process_download_batches():
    """Check pending batches, download results, update DB."""
    conn = get_conn()
    try:
        batches = get_pending_openai_batches(conn)
    finally:
        conn.close()

    if not batches:
        return

    client = get_openai_client()
    
    for batch_id in batches:
        try:
            batch_status = client.batches.retrieve(batch_id)
        except Exception as e:
            logger.error(f"[Step 5] Error retrieving batch {batch_id}: {e}")
            continue
            
        logger.info(f"[Step 5] Batch {batch_id} status: {batch_status.status}")
        
        if batch_status.status == 'completed':
            output_file_id = batch_status.output_file_id
            if not output_file_id:
                logger.error(f"[Step 5] Batch {batch_id} completed but no output_file_id!")
                continue
                
            try:
                # Download results
                content = client.files.content(output_file_id).text
                lines = content.strip().split('\\n')
                
                updates = 0
                conn = get_conn()
                try:
                    for line in lines:
                        if not line.strip():
                            continue
                        res = json.loads(line)
                        page_id = res.get('custom_id')
                        
                        raw_response = None
                        try:
                            raw_response = res['response']['body']['choices'][0]['message']['content']
                        except KeyError:
                            raw_response = ""
                            
                        # Validate
                        final_category = validate_category(raw_response)
                        
                        mark_page_classification(conn, page_id, final_category, raw_response, 'completed')
                        updates += 1
                        
                    # Mark batch completed
                    update_openai_batch_status(conn, batch_id, 'completed')
                    logger.info(f"[Step 5] Batch {batch_id} successfully parsed and updated {updates} pages.")
                finally:
                    conn.close()
                    
            except Exception as e:
                logger.error(f"[Step 5] Error downloading/parsing file for batch {batch_id}: {e}")
                
        elif batch_status.status in ['failed', 'expired', 'cancelled']:
            logger.error(f"[Step 5] Batch {batch_id} failed with status: {batch_status.status}")
            conn = get_conn()
            try:
                update_openai_batch_status(conn, batch_id, batch_status.status)
                # optionally reset corresponding pages to 'pending' ?
                # The easy logic would be: UPDATE pages SET classification_status='pending' WHERE classification_status='processing'
                # but we'll leave it as error/processing for now or implement a reset.
            finally:
                conn.close()

def main_sync():
    """Called periodically by pipeline."""
    process_download_batches()
    # process_upload_batch() # Temporarily disabled for testing

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main_sync()
