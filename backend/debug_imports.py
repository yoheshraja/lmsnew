"""Debug script to find which import is hanging."""
import sys
from datetime import datetime

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

try:
    log("Starting imports...")
    
    log("Import 1: FastAPI")
    from fastapi import FastAPI
    
    log("Import 2: CORSMiddleware")
    from fastapi.middleware.cors import CORSMiddleware
    
    log("Import 3: database")
    from database import get_db, ping
    
    log("Import 4: auth")
    from auth import create_access_token, verify_password, hash_password, verify_token
    
    log("Creating app...")
    app = FastAPI(title="Yogi LMS Debug")
    
    log("Adding CORS middleware...")
    app.add_middleware(CORSMiddleware, allow_origins=["*"],
                       allow_methods=["*"], allow_headers=["*"])
    
    log("Adding health route...")
    @app.get("/health")
    def health():
        return {"status": "ok"}
    
    log("✓ All imports successful!")
    
    if __name__ == "__main__":
        import uvicorn
        log("Starting server...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
except Exception as e:
    log(f"✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
