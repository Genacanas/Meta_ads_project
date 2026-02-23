from db.postgres_client import get_conn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Add columns to pages table
            logger.info("Adding category column to pages table...")
            cur.execute("ALTER TABLE pages ADD COLUMN IF NOT EXISTS category VARCHAR;")
            
            logger.info("Adding openai_category_raw column to pages table...")
            cur.execute("ALTER TABLE pages ADD COLUMN IF NOT EXISTS openai_category_raw VARCHAR;")
            
            logger.info("Adding classification_status column to pages table...")
            cur.execute("ALTER TABLE pages ADD COLUMN IF NOT EXISTS classification_status VARCHAR DEFAULT 'pending';")
            
            # Update existing rows to 'pending' if null
            cur.execute("UPDATE pages SET classification_status = 'pending' WHERE classification_status IS NULL;")
            
            # Create openai_batches table
            logger.info("Creating openai_batches table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS openai_batches (
                    batch_id VARCHAR PRIMARY KEY,
                    status VARCHAR NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
        conn.commit()
        logger.info("Migration successful!")
    except Exception as e:
        conn.rollback()
        logger.error(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
