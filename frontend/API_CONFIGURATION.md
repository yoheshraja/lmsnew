# API Configuration Setup Guide

## Overview
Your application now supports configurable API URLs, allowing you to connect the frontend to different backend servers based on your environment (development, testing, production).

## Configuration Files

### 1. **config.js** (Main Configuration)
- **Location**: `frontend/config.js`
- **Purpose**: Default API configuration
- **Default behavior**: Uses `window.location.origin` (same server)
- **Contains API_KEY and API_URL**

### 2. **config.local.js** (Local Overrides - Optional)
- **Location**: `frontend/config.local.js` (create as needed)
- **Purpose**: Override config.js for your local development
- **Not included in git** (add to .gitignore)

---

## Setup Instructions

### Option 1: Frontend and Backend on SAME SERVER (Default)
No changes needed! Configuration already set to use same origin.

```javascript
// frontend/config.js
API_URL: window.location.origin,  // Uses current server
```

---

### Option 2: Frontend on Port 5000, Backend on Port 3000

**Create `frontend/config.local.js`:**
```javascript
window.API_CONFIG.API_URL = "http://localhost:3000";
```

**Run backend:**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

**Run frontend:**
```bash
cd frontend
# Serve on port 5000 using any static server
# Or if you have a dev server, configure it for port 5000
```

---

### Option 3: Frontend and Backend on Different Machines

**Create `frontend/config.local.js`:**
```javascript
// Backend running on remote machine
window.API_CONFIG.API_URL = "http://192.168.1.100:3000";
// Or with a domain:
window.API_CONFIG.API_URL = "http://backend.local:3000";
```

---

### Option 4: Production Deployment

**Update `frontend/config.js` directly (or use environment-specific config):**
```javascript
API_URL: "https://api.yogilms.com",
```

---

## Common Configurations

| Scenario | Frontend URL | Backend URL | Config |
|----------|-------------|------------|--------|
| Local same-server | http://localhost:5000 | http://localhost:5000 | Default (no change) |
| Local separate ports | http://localhost:5000 | http://localhost:3000 | `API_URL: "http://localhost:3000"` |
| Network dev | http://192.168.1.100:5000 | http://192.168.1.100:3000 | `API_URL: "http://192.168.1.100:3000"` |
| Production | https://yogilms.com | https://api.yogilms.com | Update config.js |

---

## How It Works

1. **Browser loads HTML files** in this order:
   ```html
   <script src="/config.js"></script>           <!-- Load defaults -->
   <script src="/config.local.js"></script>     <!-- Override locally -->
   <script src="/static/js/auth.js"></script>
   <script src="/static/js/api.js"></script>    <!-- Uses API_CONFIG -->
   ```

2. **api.js reads from window.API_CONFIG:**
   ```javascript
   var API_BASE = (window.API_CONFIG && window.API_CONFIG.API_URL) || window.location.origin;
   var API_KEY = (window.API_CONFIG && window.API_CONFIG.API_KEY) || "...";
   ```

3. **All API calls use the configured URL:**
   ```javascript
   fetch(API_BASE + "/api/endpoint", config)  // Uses configured URL
   ```

---

## CORS Configuration

If frontend and backend are on different origins, ensure CORS is enabled in backend:

**Backend (main.py) already has CORS enabled:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (restrict in production)
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Security Notes

⚠️ **Important for Production:**
1. Change `API_KEY` in both:
   - `backend/.env`: `API_KEY=your-secure-key`
   - `frontend/config.js`: Update to match

2. **Don't commit config.local.js to git:**
   ```bash
   # Add to .gitignore
   echo "config.local.js" >> .gitignore
   ```

3. **Use HTTPS in production:**
   ```javascript
   // frontend/config.js
   API_URL: "https://api.yogilms.com",
   ```

4. **Restrict CORS in production:**
   ```python
   # backend/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://yogilms.com"],  # Specific domain only
       allow_methods=["GET", "POST"],          # Specific methods
       allow_headers=["Authorization", "X-API-Key"],
   )
   ```

---

## Debugging

**Check if config is loaded:**
```javascript
// In browser console
console.log(window.API_CONFIG);
```

**Output:**
```javascript
{
  API_URL: "http://localhost:3000",
  API_KEY: "yogi-lms-api-key-2025-secure-key-abc123xyz"
}
```

---

## Files Modified

- ✅ `frontend/config.js` - Main configuration file
- ✅ `frontend/config.local.js.example` - Template for local config
- ✅ `frontend/js/api.js` - Updated to use config
- ✅ `backend/main.py` - Added API key validation
- ✅ `backend/.env` - Added API_KEY
- ✅ All HTML files - Now load config.js before api.js
