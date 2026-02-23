import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DB_URL")

def apply_migration():
    if not DB_URL:
        print("Missing DB_URL in .env")
        return

    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Adding manual_status column to pages table...")
        current_command = """
        ALTER TABLE pages 
        ADD COLUMN IF NOT EXISTS manual_status VARCHAR(20) DEFAULT 'unprocessed';
        """
        cur.execute(current_command)
        
        print("Updating existing rows to 'unprocessed' if null...")
        update_command = """
        UPDATE pages SET manual_status = 'unprocessed' WHERE manual_status IS NULL;
        """
        cur.execute(update_command)
        
        print("Migration applied successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    apply_migration()
