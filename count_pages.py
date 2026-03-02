from db.postgres_client import get_conn

c = get_conn()
cur = c.cursor()
cur.execute("SELECT COUNT(*) FROM pages WHERE ads_status='completed' AND active_total_eu_reach >= 200000")
print('Pages a re-scraping:', cur.fetchone()[0])
c.close()
