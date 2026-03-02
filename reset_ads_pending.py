from db.postgres_client import get_conn

c = get_conn()
cur = c.cursor()
cur.execute("UPDATE pages SET ads_status='pending' WHERE ads_status='completed' AND active_total_eu_reach >= 200000")
c.commit()
print(f'Reset {cur.rowcount} pages ads_status to pending')
c.close()
