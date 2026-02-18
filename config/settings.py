import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN")

# Example Search Configuration
# This could be loaded from a JSON file or DB in the future
SEARCH_CONFIG = [
    {
        "country": "DE",
        "terms": [
            "Rabatt", "Förderung", "Auto", "Kostenlose Lieferung", 
            "Kaufen bei", "Kinder", "Zuhause", "Werkzeug"
        ]
    }
]
