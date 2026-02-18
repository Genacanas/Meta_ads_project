
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DB_URL")

def compare_filters():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # Count "All" (Relaxed)
        sql_all = """
        SELECT COUNT(DISTINCT p.page_id)
        FROM pages p
        JOIN page_top_creatives ptc ON p.page_id = ptc.page_id
        """
        cur.execute(sql_all)
        count_all = cur.fetchone()[0]
        
        # Count "DE" (Strict)
        sql_de = """
        SELECT COUNT(DISTINCT p.page_id)
        FROM pages p
        JOIN page_top_creatives ptc ON p.page_id = ptc.page_id
        JOIN ads a ON p.page_id = a.page_id
        JOIN search_terms st ON a.search_term_id = st.id
        WHERE st.country = 'DE'
        """
        cur.execute(sql_de)
        count_de = cur.fetchone()[0]
        
        print(f"Count ALL (Relaxed): {count_all}")
        print(f"Count DE (Strict):   {count_de}")
        print(f"Difference:          {count_all - count_de}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    compare_filters()
