import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN")

# Concurrency Settings
TERMS_CONCURRENCY = int(os.getenv("TERMS_CONCURRENCY", 5))
PAGES_CONCURRENCY = int(os.getenv("PAGES_CONCURRENCY", 20))
MEDIA_CONCURRENCY = int(os.getenv("MEDIA_CONCURRENCY", 13))

# Browser Settings
PLAYWRIGHT_HEADLESS = os.getenv("PLAYWRIGHT_HEADLESS", "True").lower() == "true"
