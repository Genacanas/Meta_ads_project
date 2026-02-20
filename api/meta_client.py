import requests
import time
import logging
from db.postgres_client import get_conn, get_active_token, mark_token_cooldown, mark_token_invalid
import json
# from config.settings import META_ACCESS_TOKEN # Removed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INVALID_CODES = {190, 100, 102}
RATE_LIMIT_CODES = {17, 4, 32, 613}
LIMIT_STEPS = [500, 200, 100, 50]

def reduce_limit(current: int) -> int:
    if current not in LIMIT_STEPS:
        return 100
    i = LIMIT_STEPS.index(current)
    return LIMIT_STEPS[min(i + 1, len(LIMIT_STEPS) - 1)]

def extract_meta_error(response):
    """
    Returns (code, subcode). If body isn't valid JSON, returns (None, None).
    """
    try:
        data = response.json()
        err = data.get("error", {})
        return err.get("code"), err.get("error_subcode")
    except Exception:
        return None, None

def calculate_cooldown_from_headers(response):
    """
    Reads x-business-use-case-usage and returns cooldown minutes or None.
    """
    header_value = response.headers.get("x-business-use-case-usage")
    if not header_value:
        return None

    try:
        header_json = json.loads(header_value)
        first_key = next(iter(header_json))
        usage = header_json[first_key][0]

        estimated = usage.get("estimated_time_to_regain_access")
        if estimated is None:
            return None

        total_time = usage.get("total_time", 0) or 0
        total_cputime = usage.get("total_cputime", 0) or 0
        max_time = max(total_time, total_cputime)

        cooldown = int(estimated)

        # piso conservador (opcional) inspirado en el C#
        if max_time > 0:
            floor = max(1, int((max_time - 90) * 0.1))
            if cooldown < floor:
                cooldown = floor

        return cooldown
    except Exception:
        return None


class MetaClient:
    BASE_URL = "https://graph.facebook.com/v24.0"
    
    def __init__(self):
        # We no longer hold a static token. We fetch one per request (or session of requests)
        pass

    def _get_token(self):
        """Fetch a valid token from DB. Retries if none available?"""
        conn = get_conn()
        try:
            token = get_active_token(conn)
            if not token:
                logger.error("No active tokens available in meta_tokens table!")
                raise ValueError("No active Meta tokens available. Check DB.")
            return token
        finally:
            conn.close()

    def _make_request(self, params, url_override=None, max_pages=5):
        """Helper to make requests with basic pagination and error handling."""
        all_data = []
        url = url_override or f"{self.BASE_URL}/ads_archive"
        page_count = 0
        limit = params.get("limit", 500) if params else 500
        # Get initial token
        token = self._get_token()
        
        while url and (max_pages is None or page_count < max_pages):
            try:
                # Inject token into params
                if params:
                    params["access_token"] = token
                else:
                    # If params is None (pagination), we need to ensure token is appended if not in url
                    if "access_token=" not in url:
                         url += f"&access_token={token}"
                
                kwargs = {"timeout": 30}
                if params and "access_token" in params and "?" not in url:
                     kwargs["params"] = params
                
                if params:
                    params["limit"] = limit

                response = requests.get(url, **kwargs)
                
                # Check for Rate Limit (Status 400 with specific code or 429) OR Invalid Token (190)
                if not response.ok:

                    code, subcode = extract_meta_error(response)

                    # 🔹 INVALID TOKEN
                    if code in INVALID_CODES or response.status_code in (401, 403):
                        logger.warning(f"Invalid token detected (...{token[-5:]})")

                        conn = get_conn()
                        try:
                            mark_token_invalid(conn, token)
                        finally:
                            conn.close()

                        token = self._get_token()
                        if not token:
                            raise RuntimeError("No valid tokens available.")
                        continue

                    # 🔹 GENERIC ERROR code=1
                    if code == 1:
                        if subcode == 99:
                            logger.warning("Error 1/99 → waiting 60s")
                            time.sleep(60)
                            continue

                        # Reduce limit
                        limit = reduce_limit(limit)

                        # If already at 50 and still failing → cooldown 60min
                        if limit == 50:
                            logger.warning("Limit reached 50 and still failing → cooling token 60min")

                            conn = get_conn()
                            try:
                                mark_token_cooldown(conn, token, minutes=60)
                            finally:
                                conn.close()

                            token = self._get_token()
                            if not token:
                                raise RuntimeError("All tokens in cooldown.")
                            continue

                        logger.info(f"Reducing limit → {limit}")
                        continue

                    # 🔹 TEMP ERROR code=2
                    if code == 2:
                        logger.warning("Temporary error → waiting 10s")
                        time.sleep(10)
                        continue

                    # 🔹 RATE LIMIT
                    if code in RATE_LIMIT_CODES or response.status_code == 429:

                        cooldown = calculate_cooldown_from_headers(response) or 15

                        logger.warning(
                            f"Rate limit hit (...{token[-5:]}) → cooldown {cooldown} min"
                        )

                        conn = get_conn()
                        try:
                            mark_token_cooldown(conn, token, minutes=cooldown)
                        finally:
                            conn.close()

                        token = self._get_token()
                        if not token:
                            raise RuntimeError("All tokens exhausted.")
                        continue

                    # 🔹 Unknown error → small cooldown
                    logger.warning("Unknown error → cooldown 15min")

                    conn = get_conn()
                    try:
                        mark_token_cooldown(conn, token, minutes=15)
                    finally:
                        conn.close()

                    token = self._get_token()
                    if not token:
                        raise RuntimeError("All tokens exhausted.")
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                # Append results
                if "data" in data:
                    all_data.extend(data["data"])
                
                page_count += 1
                
                # Handle pagination
                if "paging" in data and "next" in data["paging"]:
                    url = data["paging"]["next"]
                    # Important: The 'next' URL from Meta ALREADY includes the access_token of the previous request.
                    # We must strip it if we want to use a rotated token, or just rely on 'params=None' logic.
                    # Actually, if we rotate token, we might need to inject the NEW token into this URL.
                    # Simple regex replace or param injection is needed if we rotate mid-pagination.
                    # For now, let's assume one token lasts for a pagination session, or if it fails, we handle it.
                    
                    # If we just rotated, the new token is in 'token' variable. 
                    # But 'url' has the old token. We should replace it.
                    if "access_token=" in url:
                        import re
                        url = re.sub(r'access_token=[^&]+', f'access_token={token}', url)
                    
                    params = None 
                    time.sleep(0.5) 
                else:
                    url = None
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"API Request failed: {e}")
                if response is not None:
                     logger.error(f"Response content: {response.text}")
                break
            except Exception as e:
                logger.error(f"Unexpected error in request: {e}")
                break
                
        return all_data

    def search_ads(self, search_terms, countries, limit=500):
        """
        Search for ads to identify pages.
        Fetches up to 500 ads in a single request (no pagination).
        """
        params = {
            "search_terms": search_terms,
            "ad_reached_countries": countries, 
            "ad_active_status": "ACTIVE",
            "ad_type": "ALL", 
            "fields": "id,page_id,page_name",
            "limit": limit
        }
        return self._make_request(params, max_pages=1)

    def get_ads_by_page(self, page_id, countries, limit=100):
        """
        Get all ads for a specific page.
        """
        params = {
            "search_page_ids": page_id,
            "ad_reached_countries": countries,
            "ad_active_status": "ACTIVE", # FORCE ACTIVE ONLY
            "ad_type": "ALL", 
            "fields": "id,page_id,page_name,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,eu_total_reach,is_active_status,beneficiary_payers",
            "limit": limit
        }
        return self._make_request(params, max_pages=None) # Fetch ALL ads

