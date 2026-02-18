from db.postgres_client import get_conn, fetch_unprocessed_terms
import logging

logger = logging.getLogger(__name__)

def fetch_terms():
    """
    Fetches unprocessed search terms from the database.
    Returns:
        list: A list of logic dictionaries containing term data.
    """
    conn = get_conn()
    try:
        terms = fetch_unprocessed_terms(conn)
        logger.info(f"Step 1: Fetched {len(terms)} unprocessed terms.")
        return terms
    except Exception as e:
        logger.error(f"Step 1 Failed: {e}")
        return []
    finally:
        conn.close()
