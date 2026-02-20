from db.postgres_client import get_conn

def check():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM pages WHERE media_status = 'processing'")
            media_processing = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM pages WHERE ads_status = 'processing'")
            ads_processing = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM pages WHERE media_status = 'not_found'")
            media_not_found = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM pages WHERE ads_status = 'not_found'")
            ads_not_found = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM pages WHERE media_status = 'crashed'")
            media_crashed = cur.fetchone()[0]
            
            print(f"Pages stuck in MEDIA processing: {media_processing}")
            print(f"Pages stuck in ADS processing: {ads_processing}")
            print(f"Pages with MEDIA not_found: {media_not_found}")
            print(f"Pages with ADS not_found: {ads_not_found}")
            print(f"Pages permanently crashed (MEDIA): {media_crashed}")
            
            if media_processing > 0:
                print("Fetching sample of stuck media pages:")
                cur.execute("SELECT page_id, name FROM pages WHERE media_status = 'processing' LIMIT 5")
                for row in cur.fetchall():
                    print(f"  - {row[1]} ({row[0]})")
            if media_crashed > 0:
                print("Fetching sample of crashed pages:")
                cur.execute("SELECT page_id, name, media_retry_count FROM pages WHERE media_status = 'crashed' LIMIT 5")
                for row in cur.fetchall():
                    print(f"  - {row[1]} ({row[0]}) — retries: {row[2]}")
    finally:
        conn.close()

if __name__ == "__main__":
    check()
