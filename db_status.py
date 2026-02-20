from db.postgres_client import get_conn

conn = get_conn()
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM search_terms")
    print(f"search_terms total: {cur.fetchone()[0]}")
    cur.execute("SELECT status, COUNT(*) FROM search_terms GROUP BY status ORDER BY status")
    for row in cur.fetchall():
        print(f"  terms status='{row[0]}': {row[1]}")
    cur.execute("SELECT COUNT(*) FROM pages")
    print(f"pages total: {cur.fetchone()[0]}")
    cur.execute("SELECT ads_status, COUNT(*) FROM pages GROUP BY ads_status ORDER BY ads_status")
    for row in cur.fetchall():
        print(f"  pages ads_status='{row[0]}': {row[1]}")
    cur.execute("SELECT media_status, COUNT(*) FROM pages GROUP BY media_status ORDER BY media_status")
    for row in cur.fetchall():
        print(f"  pages media_status='{row[0]}': {row[1]}")
    cur.execute("SELECT COUNT(*) FROM ads")
    print(f"ads total: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM page_top_creatives")
    print(f"page_top_creatives total: {cur.fetchone()[0]}")
conn.close()
