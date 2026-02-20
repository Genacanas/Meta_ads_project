"""
Full DB reset — Option A.
Deletes all pages, ads, and media data.
Resets all search_terms back to 'pending'.
"""
from db.postgres_client import get_conn

conn = get_conn()
try:
    with conn.cursor() as cur:
        print("Deleting page_top_creatives...")
        cur.execute("DELETE FROM page_top_creatives")
        print(f"  Deleted {cur.rowcount} rows.")

        print("Deleting ads...")
        cur.execute("DELETE FROM ads")
        print(f"  Deleted {cur.rowcount} rows.")

        print("Deleting pages...")
        cur.execute("DELETE FROM pages")
        print(f"  Deleted {cur.rowcount} rows.")

        print("Resetting search_terms to 'pending'...")
        cur.execute("UPDATE search_terms SET status = 'pending', last_processed_at = NULL")
        print(f"  Reset {cur.rowcount} terms.")

    conn.commit()
    print("\nReset complete. DB is clean.")
except Exception as e:
    conn.rollback()
    print(f"ERROR: {e}")
finally:
    conn.close()
