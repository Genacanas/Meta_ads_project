import os
import sys

# Ensure correct path for imports
sys.path.append(os.getcwd())

from db.postgres_client import get_conn

def check_media():
    conn = get_conn()
    if not conn:
        print("No DB connection")
        return

    with conn.cursor() as cur:
        cur.execute("SELECT media_type, media_url FROM page_top_creatives JOIN pages ON page_top_creatives.page_id = pages.page_id WHERE pages.name LIKE '%Behrentin%'")
        row = cur.fetchone()
        if row:
            print(f"Media Type: {row[0]}") # Should be 'IMAGE' or 'VIDEO'
            print(f"Media URL: {row[1]}")
        else:
            print("No record found for Behrentin")
    
    conn.close()

if __name__ == "__main__":
    check_media()
