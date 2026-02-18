import requests
import json
import os

SUPABASE_URL = "https://dxvwryrwugmicsriryhs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dndyeXJ3dWdtaWNzcmlyeWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjM2NzksImV4cCI6MjA4NjkzOTY3OX0.Zqg5KQT35ZSsUCWhE8M9oh17DD6bmGR4jzLIwWZb3Is"

def test_query():
    url = f"{SUPABASE_URL}/rest/v1/pages"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Matching the frontend query structure
    params = {
        "select": "*,page_top_creatives(media_url,media_type,ads(ad_snapshot_url)),ads(beneficiary)",
        "order": "total_eu_reach.desc",
        "name": "ilike.*Behrentin*",
        "limit": 10
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        print(f"Fetched {len(data)} pages.")
        
        found_behrentin = False
        for page in data:
            if "Behrentin" in page["name"]:
                found_behrentin = True
                print(f"\n--- Checking Page: {page['name']} ---")
                print(f"Top Creatives: {json.dumps(page.get('page_top_creatives'), indent=2)}")
                if page.get('page_top_creatives'):
                    print("✅ page_top_creatives is present.")
                    creatives = page['page_top_creatives']
                    if len(creatives) > 0:
                        first = creatives[0]
                        print(f"Media URL: {first.get('media_url')}")
                        print(f"Snapshot URL object: {first.get('ads')}")
                else:
                    print("❌ page_top_creatives is NULL or EMPTY.")
                    
        if not found_behrentin:
            print("\n❌ 'Behrentin' page not found in top 10 results.")
            
    except Exception as e:
        print(f"Error: {e}")
        if 'response' in locals():
            print(f"Response: {response.text}")

if __name__ == "__main__":
    test_query()
