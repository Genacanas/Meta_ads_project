from db.postgres_client import get_conn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            logger.info("Adding ad_creative_bodies column to ads table...")
            cur.execute("ALTER TABLE ads ADD COLUMN IF NOT EXISTS ad_creative_bodies TEXT;")
        conn.commit()
        logger.info("Migration successful!")
    except Exception as e:
        conn.rollback()
        logger.error(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
