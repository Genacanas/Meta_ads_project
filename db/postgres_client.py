import os
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DB_URL")

def get_conn():
    if not DB_URL or "postgres" not in DB_URL: # Basic validation
         raise ValueError("Missing or invalid DB_URL in .env")
    
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    return conn

UPSERT_PAGE_SQL = """
INSERT INTO pages (page_id, name, country, total_eu_reach)
VALUES %s
ON CONFLICT (page_id)
DO UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    total_eu_reach = EXCLUDED.total_eu_reach;
"""

UPSERT_AD_SQL = """
INSERT INTO ads (
    ad_id, page_id, ad_creation_time, ad_delivery_start_time,
    ad_delivery_stop_time, ad_snapshot_url, eu_total_reach,
    is_active, beneficiary, search_term_id
)
VALUES %s
ON CONFLICT (ad_id)
DO UPDATE SET
    page_id = EXCLUDED.page_id,
    ad_creation_time = EXCLUDED.ad_creation_time,
    ad_delivery_start_time = EXCLUDED.ad_delivery_start_time,
    ad_delivery_stop_time = EXCLUDED.ad_delivery_stop_time,
    ad_snapshot_url = EXCLUDED.ad_snapshot_url,
    eu_total_reach = EXCLUDED.eu_total_reach,
    is_active = EXCLUDED.is_active,
    beneficiary = EXCLUDED.beneficiary,
    search_term_id = EXCLUDED.search_term_id;
"""

def upsert_pages(conn, pages_data):
    if not pages_data:
        return 0
    
    rows = [
        (p["page_id"], p["name"], p["country"], p["total_eu_reach"])
        for p in pages_data
    ]
    
    with conn.cursor() as cur:
        execute_values(cur, UPSERT_PAGE_SQL, rows)
    conn.commit()
    return len(rows)

def upsert_ads(conn, ads_data):
    if not ads_data:
        return 0
        
    rows = [
        (
            a["ad_id"], a["page_id"], a["ad_creation_time"],
            a["ad_delivery_start_time"], a["ad_delivery_stop_time"],
            a["ad_snapshot_url"], a["eu_total_reach"],
            a["is_active"], a["beneficiary"], a.get("search_term_id")
        )
        for a in ads_data
    ]
    
    with conn.cursor() as cur:
        execute_values(cur, UPSERT_AD_SQL, rows)
    conn.commit()
    return len(rows)

def update_term_status(conn, term_id):
    """Mark a search term as processed."""
    sql = """
        UPDATE search_terms
        SET is_processed = TRUE, processed_at = NOW()
        WHERE id = %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, (term_id,))
    conn.commit()

def fetch_unprocessed_terms(conn):
    """Fetch all unprocessed search terms with their min_ad_creation_time."""
    search_terms_list = []
    with conn.cursor() as cur:
        # Fetch all columns to ensure we get min_ad_creation_time if it exists in schema
        cur.execute("SELECT * FROM search_terms WHERE is_processed IS NOT TRUE")
        if cur.description:
            columns = [desc[0] for desc in cur.description]
            for row in cur.fetchall():
                search_terms_list.append(dict(zip(columns, row)))
    return search_terms_list

def get_existing_page_ids(conn):
    """Fetch all page_ids that already exist in the database."""
    with conn.cursor() as cur:
        cur.execute("SELECT page_id FROM pages")
        # Return a set for O(1) lookups
        return {str(row[0]) for row in cur.fetchall()}
