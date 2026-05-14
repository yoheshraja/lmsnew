"""
database.py — MongoDB Atlas connection
Place .env in the same folder as main.py with:
    MONGODB_URI=mongodb+srv://Yohesh:YOUR_PASSWORD@cluster0.kxhhz6p.mongodb.net/...
    MONGODB_DB=yogi_lms
"""
import os
import sys
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB  = os.getenv("MONGODB_DB", "yogi_lms")

# ── Guard: catch unfilled placeholder ────────────────────────
if not MONGODB_URI:
    print("ERROR: MONGODB_URI is not set in .env file")
    print("       Create a .env file in your backend folder with:")
    print("       MONGODB_URI=mongodb+srv://Yohesh:YOUR_PASSWORD@cluster0.kxhhz6p.mongodb.net/...")
    sys.exit(1)

if "<db_password>" in MONGODB_URI or "YOUR_ACTUAL_PASSWORD" in MONGODB_URI:
    print("=" * 60)
    print("ERROR: You have not replaced the password placeholder!")
    print("")
    print("Open your .env file and change:")
    print("  MONGODB_URI=mongodb+srv://Yohesh:YOUR_ACTUAL_PASSWORD@...")
    print("                                  ^^^^^^^^^^^^^^^^^^")
    print("  Replace YOUR_ACTUAL_PASSWORD with the real password")
    print("  you set when creating the Atlas database user.")
    print("")
    print("How to find/reset your Atlas password:")
    print("  1. Go to https://cloud.mongodb.com")
    print("  2. Left menu → Database Access")
    print("  3. Click Edit on the 'Yohesh' user")
    print("  4. Click 'Edit Password' → set a new one → Save")
    print("  5. Use that exact password in .env")
    print("=" * 60)
    sys.exit(1)

# ── Singleton client ──────────────────────────────────────────
_client: MongoClient | None = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            MONGODB_URI,
            server_api=ServerApi("1"),
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            socketTimeoutMS=8000,
        )
    return _client

def get_db():
    """Return the yogi_lms MongoDB database."""
    return get_client()[MONGODB_DB]

def ping() -> bool:
    """Test Atlas connectivity. Returns True on success."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception as e:
        print(f"[DB] MongoDB ping failed: {e}")
        print("[DB] Common causes:")
        print("     • Wrong password in .env")
        print("     • Your IP is not whitelisted in Atlas Network Access")
        print("       → Go to Atlas → Network Access → Add IP → 0.0.0.0/0")
        return False