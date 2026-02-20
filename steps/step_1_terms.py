from db.postgres_client import get_conn, fetch_terms
import logging

logger = logging.getLogger(__name__)

def fetch_terms_step(limit=None):
    conn = get_conn()
    try:
        terms = fetch_terms(conn, limit=limit)
        logger.info(f"Step 1: Fetched {len(terms)} terms.")
        return terms
    except Exception as e:
        logger.error(f"Step 1 Failed: {e}")
        return []
    finally:
        conn.close()
