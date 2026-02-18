import requests
import time
import logging
from config.settings import META_ACCESS_TOKEN

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetaClient:
    BASE_URL = "https://graph.facebook.com/v19.0"
    
    def __init__(self):
        self.access_token = META_ACCESS_TOKEN
        if not self.access_token:
            logger.warning("Meta Access Token not found in .env")

    def _make_request(self, params, max_pages=5):
        """Helper to make requests with basic pagination and error handling."""
        all_data = []
        url = f"{self.BASE_URL}/ads_archive"
        page_count = 0
        
        while url and page_count < max_pages:
            try:
                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                # Append results
                if "data" in data:
                    all_data.extend(data["data"])
                
                page_count += 1
                
                # Handle pagination
                if "paging" in data and "next" in data["paging"] and page_count < max_pages:
                    url = data["paging"]["next"]
                    params = None # Parameters are included in the 'next' URL
                    time.sleep(0.5) # Rate limit politeness
                else:
                    url = None
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"API Request failed: {e}")
                if response is not None:
                     logger.error(f"Response content: {response.text}")
                break
                
        return all_data

    def search_ads(self, search_terms, countries, limit=100):
        """
        Search for ads to identify pages.
        Note: The 'limit' in params applies per page of results.
        """
        params = {
            "access_token": self.access_token,
            "search_terms": search_terms,
            "ad_reached_countries": countries, 
            "ad_active_status": "ALL",
            "ad_type": "ALL", 
            "fields": "id,page_id,page_name",
            "limit": limit
        }
        return self._make_request(params)

    def get_ads_by_page(self, page_id, countries, limit=100):
        """
        Get all ads for a specific page.
        """
        params = {
            "access_token": self.access_token,
            "search_page_ids": page_id,
            "ad_reached_countries": countries,
            "ad_active_status": "ALL",
            "ad_type": "ALL", # TODO: consistency with search
            "fields": "id,page_id,page_name,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,eu_total_reach,is_active_status,beneficiary_payers",
            "limit": limit
        }
        return self._make_request(params)

