import requests
from db.postgres_client import get_conn

def test_meta_api(page_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT token FROM meta_tokens LIMIT 1")
    token = cur.fetchone()[0]
    conn.close()

    if not token:
        print("❌ No tokens in DB")
        return

    print(f"✅ Using any token, ending in ...{token[-5:]}")
    
    url = "https://graph.facebook.com/v24.0/ads_archive"
    params = {
        "access_token": token,
        "search_page_ids": page_id,
        "ad_reached_countries": '["DE"]',
        "ad_active_status": "ACTIVE",
        "ad_type": "ALL", 
        "fields": "id,page_id,page_name,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,eu_total_reach,is_active_status,beneficiary_payers,ad_creative_bodies",
        "limit": 500  # Empezamos probando con 500 como hace el script
    }

    print(f"🚀 Requesting ads for page {page_id}...")
    response = requests.get(url, params=params)
    
    print(f"\nStatus Code: {response.status_code}")
    
    try:
        data = response.json()
        print("\nResponse Data:")
        # Print just the first ad to avoid spam
        if "data" in data and len(data["data"]) > 0:
            first_ad = data["data"][0]
            import json
            print(json.dumps(first_ad, indent=2))
            print(f"\nFirst ad fields: {list(first_ad.keys())}")
            if "ad_creative_bodies" in first_ad:
                print(f"✅ Found ad_creative_bodies: {first_ad['ad_creative_bodies']}")
            else:
                print("❌ ad_creative_bodies is MISSING from the response!")
        elif "error" in data:
            import json
            print(json.dumps(data, indent=2))
        else:
            print("No ads found for this query.")
                
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        print(response.text)

if __name__ == "__main__":
    import sys
    page_to_test = sys.argv[1] if len(sys.argv) > 1 else "105796675542787" 
    test_meta_api(page_to_test)
