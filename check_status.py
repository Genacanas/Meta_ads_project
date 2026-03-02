from db.postgres_client import get_conn
import datetime

c = get_conn()
cur = c.cursor()

# Token status
cur.execute("SELECT status, COUNT(*), MAX(cooldown_until) FROM meta_tokens GROUP BY status")
print("== Tokens ==")
for r in cur.fetchall():
    print(r)

# Page status
cur.execute("SELECT ads_status, COUNT(*) FROM pages WHERE active_total_eu_reach >= 200000 GROUP BY ads_status")
print("\n== Pages (reach >= 200k) ==")
for r in cur.fetchall():
    print(r)

c.close()
