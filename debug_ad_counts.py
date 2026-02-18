
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DB_URL")

def check_ad_counts():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("--- Ads Table Analysis ---")
        
        # Total
        cur.execute("SELECT COUNT(*) FROM ads")
        total = cur.fetchone()[0]
        print(f"Total Ads: {total}")
        
        # NULL search_term_id
        # Note: In schema update we made it integer, might be nullable or default 0.
        # Let's check both NULL and 0.
        
        try:
            cur.execute("SELECT COUNT(*) FROM ads WHERE search_term_id IS NULL")
            null_count = cur.fetchone()[0]
            print(f"Ads with search_term_id = NULL: {null_count}")
        except:
             print("Could not query NULL (maybe column doesn't exist?)")

        try:
            cur.execute("SELECT COUNT(*) FROM ads WHERE search_term_id = 0")
            zero_count = cur.fetchone()[0]
            print(f"Ads with search_term_id = 0:    {zero_count}")
        except:
             print("Could not query 0")
             
        try:
            cur.execute("SELECT COUNT(*) FROM ads WHERE search_term_id > 0")
            valid_count = cur.fetchone()[0]
            print(f"Ads with Valid search_term_id : {valid_count}")
        except:
             print("Could not query > 0")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_ad_counts()
