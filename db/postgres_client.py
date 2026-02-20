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
INSERT INTO pages (page_id, name, country, total_eu_reach, active_total_eu_reach)
VALUES %s
ON CONFLICT (page_id)
DO UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    total_eu_reach = EXCLUDED.total_eu_reach,
    active_total_eu_reach = EXCLUDED.active_total_eu_reach;
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
        (p["page_id"], p["name"], p["country"], p["total_eu_reach"], p.get("active_total_eu_reach", 0))
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

# Removed old update_term_status and fetch_terms

def get_existing_page_ids(conn):
    """Fetch all page_ids that already exist in the database."""
    with conn.cursor() as cur:
        cur.execute("SELECT page_id FROM pages")
        # Return a set for O(1) lookups
        return {str(row[0]) for row in cur.fetchall()}

# --- Status Management ---

def mark_term_status(conn, term_id, status):
    """Update the status of a search term (pending, processing, completed, error)."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE search_terms 
            SET status = %s, last_processed_at = NOW()
            WHERE id = %s
        """, (status, term_id))
    conn.commit()

def fetch_terms(conn, limit=None):
    """Fetch 'pending' and 'error' search terms (so errors are retried)."""
    search_terms_list = []
    with conn.cursor() as cur:
        sql = "SELECT * FROM search_terms WHERE status IN ('pending', 'error') ORDER BY id ASC"
        if limit:
            sql += f" LIMIT {limit}"
            
        cur.execute(sql)
        if cur.description:
            columns = [desc[0] for desc in cur.description]
            for row in cur.fetchall():
                search_terms_list.append(dict(zip(columns, row)))
    return search_terms_list

def fetch_ads_pending_pages(conn, limit=None):
    """Fetch pages that need AD processing (ads_status = 'pending')."""
    pages_list = []
    with conn.cursor() as cur:
        # Include country for API call
        sql = "SELECT page_id, name, country FROM pages WHERE ads_status = 'pending'"
        if limit:
            sql += f" LIMIT {limit}"
        cur.execute(sql)
        for row in cur.fetchall():
            # Returns (page_id, name, country)
            pages_list.append(row)
    return pages_list

def fetch_media_pending_pages(conn, limit=None):
    """Fetch pages that need MEDIA processing (pending or retryable errors, excluding crashed)."""
    pages_list = []
    with conn.cursor() as cur:
        sql = "SELECT page_id, name FROM pages WHERE media_status IN ('pending', 'error')"
        if limit:
            sql += f" LIMIT {limit}"
        cur.execute(sql)
        for row in cur.fetchall():
            pages_list.append(row)
    return pages_list

def mark_page_status(conn, page_id, status_column, status_value):
    """Update a status column (ads_status or media_status) for a page."""
    valid_columns = ['ads_status', 'media_status']
    if status_column not in valid_columns:
        raise ValueError(f"Invalid status column: {status_column}")
        
    with conn.cursor() as cur:
        # Use format string for column name (safe if validated against allowlist)
        sql = f"UPDATE pages SET {status_column} = %s WHERE page_id = %s"
        cur.execute(sql, (status_value, page_id))
    conn.commit()

def mark_page_media_status(conn, page_id, status):
    """Update media_status of a page (Legacy - use mark_page_status)."""
    mark_page_status(conn, page_id, 'media_status', status)

# --- Token Management ---

def get_active_token(conn):
    """
    Get next usable token.
    - ACTIVE with no cooldown or expired cooldown, OR
    - COOLDOWN with expired cooldown (auto-recovered to ACTIVE on selection)
    - Rotates by last_used_at
    """
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, token
            FROM meta_tokens
            WHERE (status = 'ACTIVE' AND (cooldown_until IS NULL OR cooldown_until < NOW()))
               OR (status = 'COOLDOWN' AND cooldown_until < NOW())
            ORDER BY last_used_at ASC NULLS FIRST
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        """)
        row = cur.fetchone()

        if row:
            token_id, token = row
            cur.execute("""
                UPDATE meta_tokens
                SET last_used_at = NOW(),
                    status = 'ACTIVE',
                    cooldown_until = NULL
                WHERE id = %s
            """, (token_id,))
            conn.commit()
            return token

    return None

# def report_token_error(conn, token, cooldown_minutes=15):
#     """
#     Mark a token as rate-limited/error.
#     Sets cooldown_until = NOW() + INTERVAL 'X minutes'
#     """
#     with conn.cursor() as cur:
#         cur.execute(f"""
#             UPDATE meta_tokens
#             SET cooldown_until = NOW() + INTERVAL '{cooldown_minutes} minutes',
#                 status = 'rate_limited'
#             WHERE token = %s
#         """, (token,))
#     conn.commit()
    
def report_token_success(conn, token):
    """
    Reset status to active if it was rate_limited but worked (optional recovery).
    Or just update last_used? get_active_token handles last_used.
    For now, just ensure it is marked active if we want to auto-recover.
    But usually we rely on time passing for cooldown.
    """
    pass # Simple rotation is handled by get_active_token updating last_used_at

def reset_stuck_pages(conn):
    """
    Reset pages with media_status = 'processing' back to 'pending'.
    Only touches media_status — ads_status is Step 3's responsibility.
    """
    with conn.cursor() as cur:
        cur.execute("UPDATE pages SET media_status = 'pending' WHERE media_status = 'processing'")
        media_count = cur.rowcount
    conn.commit()
    return media_count

def increment_media_retry(conn, page_id, max_retries=3):
    """
    Increment media_retry_count for a page after an error.
    If retry count reaches max_retries, mark as 'crashed' instead of 'error'.
    Returns the new status: 'error' or 'crashed'.
    """
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE pages
            SET media_retry_count = COALESCE(media_retry_count, 0) + 1
            WHERE page_id = %s
            RETURNING media_retry_count
        """, (page_id,))
        row = cur.fetchone()
        retry_count = row[0] if row else 1

    if retry_count >= max_retries:
        new_status = 'crashed'
    else:
        new_status = 'error'

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE pages SET media_status = %s WHERE page_id = %s",
            (new_status, page_id)
        )
    conn.commit()
    return new_status

def reset_stuck_terms(conn):
    """
    Reset search terms that are stuck in 'processing' or 'error' back to 'pending'.
    This ensures the pipeline can always resume after a crash or error.
    """
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE search_terms 
            SET status = 'pending' 
            WHERE status IN ('processing', 'error')
        """)
        count = cur.rowcount
    conn.commit()
    return count


def mark_token_cooldown(conn, token: str, minutes: int):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE meta_tokens
            SET status='COOLDOWN',
                cooldown_until = now() + (%s || ' minutes')::interval,
                last_used_at = now(),
                updated_at = now()
            WHERE token = %s
        """, (minutes, token))
    conn.commit()


def mark_token_invalid(conn, token: str):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE meta_tokens
            SET status='INVALID',
                last_used_at = now(),
                updated_at = now()
            WHERE token = %s
        """, (token,))
    conn.commit()