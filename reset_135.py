import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from db.postgres_client import get_conn

conn = get_conn()
cur = conn.cursor()
cur.execute("UPDATE pages SET classification_status='pending' WHERE page_id IN (SELECT page_id FROM pages WHERE classification_status='completed' AND active_total_eu_reach >= 200000 AND ads_status='completed' LIMIT 135)")
conn.commit()
print(f'Reset {cur.rowcount} pages to pending')
