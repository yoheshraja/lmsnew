"""
FastAPI backend for the Yogi LMS.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bson import ObjectId
from fastapi import Depends, FastAPI, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from auth import create_access_token, hash_password, verify_password, verify_token
from database import get_db, ping

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
TEMPLATES_DIR = BASE_DIR / "templates"
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
API_KEY = os.environ.get("API_KEY", "yogi-lms-api-key-2025-secure-key-abc123xyz")
DEFAULT_ADMIN_EMAIL = os.environ.get("DEFAULT_ADMIN_EMAIL", "admin@yogilms.local").strip().lower()
DEFAULT_ADMIN_PASSWORD = os.environ.get("DEFAULT_ADMIN_PASSWORD", "Admin@123")
DEFAULT_USER_EMAIL = os.environ.get("DEFAULT_USER_EMAIL", "user@yogilms.local").strip().lower()
DEFAULT_USER_PASSWORD = os.environ.get("DEFAULT_USER_PASSWORD", "User@123")

os.makedirs(UPLOAD_DIR, exist_ok=True)

print("-" * 52)
print("  Yogi LMS - starting")
print(f"  Frontend : {FRONTEND_DIR} {'OK' if FRONTEND_DIR.exists() else 'NOT FOUND'}")
print(f"  Templates: {TEMPLATES_DIR} {'OK' if TEMPLATES_DIR.exists() else 'NOT FOUND'}")
print(f"  MongoDB  : {'connected' if ping() else 'CANNOT CONNECT - check .env'}")
print("-" * 52)

DEFAULT_NAV = [
    {"nav_id": "home", "name": "முகப்பு (Home)", "page": "home-final", "icon": "🏠", "category": "main", "order": 0},
    {"nav_id": "purvasramam", "name": "பூர்வாஸ்ரமம்", "page": "purvasramam-main", "icon": "📜", "category": "purvasramam", "order": 1},
    {"nav_id": "childhood", "name": "குழந்தைப் பருவம்", "page": "bhagavan-childhood", "icon": "👶", "category": "purvasramam", "order": 2},
    {"nav_id": "youth", "name": "இளம் வயது", "page": "isam-vayathu", "icon": "🌱", "category": "purvasramam", "order": 3},
    {"nav_id": "marriage", "name": "திருமணம்", "page": "thirumanam", "icon": "💍", "category": "purvasramam", "order": 4},
    {"nav_id": "quest", "name": "ஞானத்தேடல்", "page": "gnanathedal", "icon": "🔍", "category": "purvasramam", "order": 5},
    {"nav_id": "prayer", "name": "யோகி பிரார்த்தனை கூடல்", "page": "yogi-prayer-hall", "icon": "🙏", "category": "main", "order": 6},
    {"nav_id": "trichy", "name": "திருச்சி", "page": "trichy-gnanayagya", "icon": "🏛️", "category": "gnanayagya", "order": 7},
    {"nav_id": "karur", "name": "கரூர்", "page": "karur-gnanayagya", "icon": "🏙️", "category": "gnanayagya", "order": 8},
    {"nav_id": "hosur", "name": "ஓசூர்", "page": "hosur-gnanayagya", "icon": "🌆", "category": "gnanayagya", "order": 9},
    {"nav_id": "iyalpunilai", "name": "இயல்புநிலை", "page": "iyalpunilai", "icon": "🌿", "category": "anandashram", "order": 10},
    {"nav_id": "library", "name": "நூலகம் (Library)", "page": "noolagam", "icon": "📚", "category": "anandashram", "order": 11},
]

PUBLIC_PAGE_CONFIG: dict[str, dict[str, Any]] = {
    "home-final": {
        "title": "Yogi LMS",
        "hero_title": "Discover Knowledge",
        "hero_subtitle": "Explore teachings, resources, videos and articles about Yogi Ramsuratkumar.",
        "show_search": True,
        "dynamic_title": False,
    },
    "builder": {
        "title": "Builder",
        "hero_title": "Discover Knowledge",
        "hero_subtitle": "Explore teachings, resources, videos and articles about Yogi Ramsuratkumar.",
        "show_search": True,
        "dynamic_title": False,
        "page_key": "home-final",
    },
    "purvasramam-main": {"title": "Purvasramam", "hero_title": "பூர்வாஸ்ரமம்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "gnanayagya-main": {"title": "Gnanayagya", "hero_title": "ஞானயக்யம்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "anandashram-main": {"title": "Anandashram", "hero_title": "ஆனந்தாஸ்ரமம்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "bhagavan-childhood": {"title": "Bhagavan Childhood", "hero_title": "குழந்தைப் பருவம்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "isam-vayathu": {"title": "Youth", "hero_title": "இளம் வயது", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "thirumanam": {"title": "Marriage", "hero_title": "திருமணம்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "gnanathedal": {"title": "Quest", "hero_title": "ஞானத்தேடல்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "yogi-prayer-hall": {"title": "Prayer Hall", "hero_title": "யோகி பிரார்த்தனை கூடல்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "trichy-gnanayagya": {"title": "Trichy", "hero_title": "திருச்சி", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "karur-gnanayagya": {"title": "Karur", "hero_title": "கரூர்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "hosur-gnanayagya": {"title": "Hosur", "hero_title": "ஓசூர்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "iyalpunilai": {"title": "Iyalpunilai", "hero_title": "இயல்புநிலை", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
    "noolagam": {"title": "Library", "hero_title": "நூலகம்", "hero_subtitle": "Explore teachings and resources", "show_search": False, "dynamic_title": False},
}

LEGACY_PAGE_ALIASES = {
    "bhagavan_childhood": "bhagavan-childhood",
    "bhagavan-childhood": "bhagavan-childhood",
    "isam_vayathu": "isam-vayathu",
    "isam-vayathu": "isam-vayathu",
    "gnanathedal": "gnanathedal",
    "thirumanam": "thirumanam",
    "purvasramam-main": "purvasramam-main",
    "gnanayagya-main": "gnanayagya-main",
    "anandashram-main": "anandashram-main",
    "yogi-prayer-hall": "yogi-prayer-hall",
    "trichy_gnanayagya": "trichy-gnanayagya",
    "trichy-gnanayagya": "trichy-gnanayagya",
    "karur_gnanayagya": "karur-gnanayagya",
    "karur-gnanayagya": "karur-gnanayagya",
    "hosur_gnanayagya": "hosur-gnanayagya",
    "hosur-gnanayagya": "hosur-gnanayagya",
    "iyalpunilai": "iyalpunilai",
    "noolagam": "noolagam",
}

ADMIN_PAGE_FILES = {
    "admin": "index.html",
    "adminpanel": "index.html",
    "upload": "upload.html",
    "content-library": "contentlibrary.html",
    "analytics": "Analytics.html",
    "user-management": "usermanagement.html",
    "settings": "settings.html",
    "debug": "debug.html",
}

app = FastAPI(title="Yogi LMS")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


def _oid(value: Any) -> str | None:
    return str(value) if value else None


def _user_out(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _oid(user.get("_id")),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
    }


def _content_out(content: dict[str, Any]) -> dict[str, Any]:
    image = content.get("image")
    audio = content.get("audio")
    video = content.get("video")
    youtube_id = content.get("youtube_id")
    youtube_url = content.get("youtube_url")
    article_body = content.get("article_body")
    detail_body = content.get("detail_body")
    content_type = content.get("content_type", "files")

    return {
        "id": _oid(content.get("_id")),
        "title": content.get("title", ""),
        "topic": content.get("topic", ""),
        "description": content.get("description", ""),
        "nav_page": content.get("nav_page", "home-final"),
        "content_type": content_type,
        "youtube_id": youtube_id,
        "youtube_url": youtube_url,
        "article_body": article_body,
        "detail_body": detail_body,
        "image": image,
        "audio": audio,
        "video": video,
        "author_name": content.get("author_name", ""),
        "speaker_name": content.get("speaker_name", ""),
        "location_name": content.get("location_name", ""),
        "event_date": content.get("event_date"),
        "duration_text": content.get("duration_text", ""),
        "tags": content.get("tags", []),
        "source_label": content.get("source_label", ""),
        "external_link": content.get("external_link"),
        "publish_status": content.get("publish_status", "published"),
        "featured": bool(content.get("featured", False)),
        "image_url": f"/uploads/{image}" if image else None,
        "audio_url": f"/uploads/{audio}" if audio else None,
        "video_url": f"/uploads/{video}" if video else None,
        "youtube_embed_url": f"https://www.youtube.com/embed/{youtube_id}" if youtube_id else None,
        "has_media": any([image, audio, video, youtube_id, article_body, detail_body]),
        "created_by": content.get("created_by", ""),
        "created_at": content.get("created_at", datetime.now(timezone.utc)).isoformat(),
    }


def _nav_out(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _oid(item.get("_id")),
        "nav_id": item.get("nav_id", ""),
        "name": item.get("name", ""),
        "page": item.get("page", ""),
        "icon": item.get("icon", "📄"),
        "category": item.get("category", "main"),
        "order": item.get("order", 0),
    }


def _normalize_page_key(page_name: str) -> str:
    normalized = page_name.strip().lower().replace(".html", "").replace("_", "-")
    return LEGACY_PAGE_ALIASES.get(normalized, normalized)


def _render_public_page(request: Request, page_key: str):
    normalized_key = _normalize_page_key(page_key)
    config = PUBLIC_PAGE_CONFIG.get(normalized_key)
    if not config:
        config = {
            "title": "Content",
            "hero_title": "Content",
            "hero_subtitle": "Explore teachings and resources",
            "show_search": False,
            "dynamic_title": True,
        }
    page_context = dict(config)
    page_context["page_key"] = page_context.get("page_key", normalized_key)
    page_context["request"] = request
    return templates.TemplateResponse("public_page.html", page_context)


def _public_page_exists(page_key: str) -> bool:
    normalized_key = _normalize_page_key(page_key)
    if normalized_key in PUBLIC_PAGE_CONFIG:
        return True

    try:
        return get_db().nav_items.find_one({"page": normalized_key}) is not None
    except Exception:
        return False


def _admin_file(page_key: str) -> FileResponse:
    filename = ADMIN_PAGE_FILES[page_key]
    return FileResponse(str(FRONTEND_DIR / filename))


def save_file(upload: UploadFile | None) -> str | None:
    if upload and upload.filename:
        name = f"{os.urandom(8).hex()}_{upload.filename}"
        with open(UPLOAD_DIR / name, "wb") as output:
            output.write(upload.file.read())
        return name
    return None


def get_current_user(authorization: str = Header(default=None, alias="Authorization")) -> dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bad Authorization format")

    payload = verify_token(parts[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = str(payload.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Token missing email")

    user = get_db().users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": _oid(user.get("_id")),
        "email": user["email"],
        "role": user.get("role", payload.get("role", "user")),
    }


def require_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def verify_api_key(x_api_key: str = Header(default=None, alias="X-API-Key")) -> str:
    """Verify API key from X-API-Key header"""
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return x_api_key


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/login", status_code=302)


@app.get("/builder")
def builder(request: Request):
    return _render_public_page(request, "builder")


@app.get("/home")
def home(request: Request):
    return _render_public_page(request, "home-final")


@app.get("/home-final.html")
def home_html(request: Request):
    return _render_public_page(request, "home-final")


@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "default_admin_email": DEFAULT_ADMIN_EMAIL,
            "default_admin_password": DEFAULT_ADMIN_PASSWORD,
        },
    )


@app.get("/login.html")
def login_page_html(request: Request):
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "default_admin_email": DEFAULT_ADMIN_EMAIL,
            "default_admin_password": DEFAULT_ADMIN_PASSWORD,
        },
    )


@app.get("/index1-final.html")
def legacy_login() -> RedirectResponse:
    return RedirectResponse(url="/login", status_code=302)


@app.get("/admin")
def admin():
    return _admin_file("admin")


@app.get("/adminpanel")
def adminpanel():
    return _admin_file("adminpanel")


@app.get("/admin/upload")
def upload_page():
    return _admin_file("upload")


@app.get("/admin/content-library")
def content_library_page():
    return _admin_file("content-library")


@app.get("/admin/analytics")
def analytics_page():
    return _admin_file("analytics")


@app.get("/admin/user-management")
def users_page():
    return _admin_file("user-management")


@app.get("/admin/settings")
def settings_page():
    return _admin_file("settings")


@app.get("/debug")
def debug():
    return _admin_file("debug")


@app.get("/style.css")
def style_css():
    return FileResponse(str(FRONTEND_DIR / "style.css"))


@app.get("/script.js")
def script_js():
    return FileResponse(str(FRONTEND_DIR / "script.js"), media_type="application/javascript")


@app.get("/nav.js")
def nav_js():
    return FileResponse(str(FRONTEND_DIR / "nav.js"), media_type="application/javascript")


@app.get("/content-page.js")
def content_page_js():
    return FileResponse(str(FRONTEND_DIR / "content-page.js"), media_type="application/javascript")


@app.get("/yogi.img.png")
def yogi_img():
    return FileResponse(str(FRONTEND_DIR / "yogi.img.png"))


@app.get("/yogi1.img.jpg")
def yogi1_img():
    return FileResponse(str(FRONTEND_DIR / "yogi1.img.jpg"))


@app.get("/chanting.mp3.mpeg")
def chanting_audio():
    return FileResponse(str(FRONTEND_DIR / "chanting.mp3.mpeg"), media_type="audio/mpeg")


@app.get("/favicon.ico")
def favicon():
    icon_path = FRONTEND_DIR / "favicon.ico"
    if icon_path.exists():
        return FileResponse(str(icon_path))
    return Response(status_code=204)


@app.get("/{page_name}.html")
def html_page(request: Request, page_name: str):
    normalized_key = _normalize_page_key(page_name)
    if not _public_page_exists(normalized_key):
        raise HTTPException(status_code=404, detail="Page not found")
    return _render_public_page(request, normalized_key)


@app.get("/health")
def health():
    ok = ping()
    return {"status": "healthy" if ok else "db_error", "mongodb": ok}


@app.post("/login")
def login(data: dict[str, Any]):
    db = get_db()
    email = str(data.get("email", "")).lower().strip()
    password = str(data.get("password", ""))

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = user.get("role", "user")
    redirect = "/adminpanel" if role == "admin" else "/builder"
    token = create_access_token({"email": user["email"], "role": role})

    return {
        "token": token,
        "role": role,
        "redirect": redirect,
        "user": {
            "email": user["email"],
            "role": role,
        },
    }


@app.get("/uploads/{filename}")
def serve_upload(filename: str):
    path = UPLOAD_DIR / filename
    if path.exists():
        return FileResponse(str(path))
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/api/nav-items")
def get_nav_items():
    items = list(get_db().nav_items.find().sort("order", 1))
    return [_nav_out(item) for item in items]


@app.post("/api/nav-items")
def create_nav_item(data: dict[str, Any], current_user: dict[str, Any] = Depends(require_admin)):
    db = get_db()
    name = str(data.get("name", "")).strip()
    page = str(data.get("page", "")).strip().lower().replace(" ", "-").replace("_", "-")
    if not name or not page:
        raise HTTPException(status_code=400, detail="Name and page are required")
    if db.nav_items.find_one({"page": page}):
        raise HTTPException(status_code=400, detail="Page filename already exists")

    last = db.nav_items.find_one(sort=[("order", -1)])
    max_order = (last.get("order", 0) + 1) if last else 0
    document = {
        "nav_id": page,
        "name": name,
        "page": page,
        "icon": str(data.get("icon", "📄")).strip(),
        "category": str(data.get("category", "main")).strip(),
        "order": int(data.get("order", max_order)),
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user["email"],
    }
    inserted = db.nav_items.insert_one(document)
    document["_id"] = inserted.inserted_id
    return {"message": "Navigation item created", "item": _nav_out(document)}


@app.put("/api/nav-items/{item_id}")
def update_nav_item(item_id: str, data: dict[str, Any], current_user: dict[str, Any] = Depends(require_admin)):
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid ID") from exc

    existing = db.nav_items.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")

    name = str(data.get("name", "")).strip()
    page = str(data.get("page", "")).strip().lower().replace(" ", "-").replace("_", "-")
    if not name or not page:
        raise HTTPException(status_code=400, detail="Name and page are required")

    duplicate = db.nav_items.find_one({"page": page, "_id": {"$ne": oid}})
    if duplicate:
        raise HTTPException(status_code=400, detail="Page filename already used by another item")

    update_doc = {
        "name": name,
        "page": page,
        "icon": str(data.get("icon", "📄")).strip(),
        "category": str(data.get("category", "main")).strip(),
        "order": int(data.get("order", existing.get("order", 0))),
        "nav_id": page,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": current_user["email"],
    }
    db.nav_items.update_one({"_id": oid}, {"$set": update_doc})
    return {"message": "Updated"}


@app.delete("/api/nav-items/{item_id}")
def delete_nav_item(item_id: str, current_user: dict[str, Any] = Depends(require_admin)):
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid ID") from exc

    result = db.nav_items.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


@app.post("/api/nav-items/reset")
def reset_nav_items(current_user: dict[str, Any] = Depends(require_admin)):
    db = get_db()
    db.nav_items.delete_many({})
    for item in DEFAULT_NAV:
        db.nav_items.insert_one({**item, "created_at": datetime.now(timezone.utc), "created_by": current_user["email"]})
    return {"message": "Navigation reset to defaults", "count": len(DEFAULT_NAV)}


@app.post("/upload-content")
def upload_content(
    title: str = Form(...),
    topic: str = Form(...),
    description: str = Form(""),
    nav_page: str = Form("home-final"),
    content_type: str = Form("files"),
    author_name: str = Form(""),
    speaker_name: str = Form(""),
    location_name: str = Form(""),
    event_date: str = Form(""),
    duration_text: str = Form(""),
    tags: str = Form(""),
    source_label: str = Form(""),
    external_link: str = Form(""),
    publish_status: str = Form("published"),
    featured: str = Form("false"),
    detail_body: str = Form(""),
    youtube_id: str = Form(""),
    youtube_url: str = Form(""),
    article_body: str = Form(""),
    image: UploadFile | None = None,
    audio: UploadFile | None = None,
    video: UploadFile | None = None,
    current_user: dict[str, Any] = Depends(require_admin),
):
    document = {
        "title": title.strip(),
        "topic": topic.strip(),
        "description": description.strip(),
        "nav_page": _normalize_page_key(nav_page.strip() or "home-final"),
        "content_type": content_type.strip(),
        "author_name": author_name.strip(),
        "speaker_name": speaker_name.strip(),
        "location_name": location_name.strip(),
        "event_date": event_date.strip() or None,
        "duration_text": duration_text.strip(),
        "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
        "source_label": source_label.strip(),
        "external_link": external_link.strip() or None,
        "publish_status": (publish_status.strip().lower() or "published"),
        "featured": featured.strip().lower() in {"1", "true", "yes", "on"},
        "detail_body": detail_body.strip() or None,
        "youtube_id": youtube_id.strip() or None,
        "youtube_url": youtube_url.strip() or None,
        "article_body": article_body.strip() or None,
        "image": save_file(image),
        "audio": save_file(audio),
        "video": save_file(video),
        "created_by": current_user["email"],
        "created_at": datetime.now(timezone.utc),
    }
    inserted = get_db().contents.insert_one(document)
    return {"message": "Content uploaded successfully", "content_id": str(inserted.inserted_id)}


@app.get("/get-contents")
def get_contents(current_user: dict[str, Any] = Depends(require_admin)):
    contents = get_db().contents.find().sort("created_at", -1)
    return [_content_out(content) for content in contents]


@app.get("/public/contents")
def public_contents(nav_page: str | None = None, topic: str | None = None):
    query: dict[str, Any] = {}
    if nav_page:
        query["nav_page"] = _normalize_page_key(nav_page)
    if topic:
        query["topic"] = topic
    query["publish_status"] = {"$ne": "draft"}
    contents = get_db().contents.find(query).sort("created_at", -1)
    return [_content_out(content) for content in contents]


@app.get("/public/site-config")
def public_site_config():
    return {
        "default_admin_email": DEFAULT_ADMIN_EMAIL,
        "default_admin_password": DEFAULT_ADMIN_PASSWORD,
    }


@app.get("/get-content/{content_id}")
def get_content(content_id: str, current_user: dict[str, Any] = Depends(require_admin)):
    try:
        oid = ObjectId(content_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid ID") from exc

    content = get_db().contents.find_one({"_id": oid})
    if not content:
        raise HTTPException(status_code=404, detail="Not found")
    return _content_out(content)


@app.put("/update-content/{content_id}")
def update_content(
    content_id: str,
    title: str = Form(...),
    topic: str = Form(...),
    description: str = Form(""),
    nav_page: str = Form("home-final"),
    content_type: str = Form("files"),
    author_name: str = Form(""),
    speaker_name: str = Form(""),
    location_name: str = Form(""),
    event_date: str = Form(""),
    duration_text: str = Form(""),
    tags: str = Form(""),
    source_label: str = Form(""),
    external_link: str = Form(""),
    publish_status: str = Form("published"),
    featured: str = Form("false"),
    detail_body: str = Form(""),
    youtube_id: str = Form(""),
    youtube_url: str = Form(""),
    article_body: str = Form(""),
    image: UploadFile | None = None,
    audio: UploadFile | None = None,
    video: UploadFile | None = None,
    current_user: dict[str, Any] = Depends(require_admin),
):
    db = get_db()
    try:
        oid = ObjectId(content_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid ID") from exc

    existing = db.contents.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")

    update_doc = {
        "title": title.strip(),
        "topic": topic.strip(),
        "description": description.strip(),
        "nav_page": _normalize_page_key(nav_page.strip() or existing.get("nav_page", "home-final")),
        "content_type": content_type.strip(),
        "author_name": author_name.strip(),
        "speaker_name": speaker_name.strip(),
        "location_name": location_name.strip(),
        "event_date": event_date.strip() or None,
        "duration_text": duration_text.strip(),
        "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
        "source_label": source_label.strip(),
        "external_link": external_link.strip() or None,
        "publish_status": (publish_status.strip().lower() or existing.get("publish_status", "published")),
        "featured": featured.strip().lower() in {"1", "true", "yes", "on"},
        "detail_body": detail_body.strip() or existing.get("detail_body"),
        "youtube_id": youtube_id.strip() or existing.get("youtube_id"),
        "youtube_url": youtube_url.strip() or existing.get("youtube_url"),
        "article_body": article_body.strip() or existing.get("article_body"),
        "updated_at": datetime.now(timezone.utc),
        "updated_by": current_user["email"],
    }

    new_image = save_file(image)
    new_audio = save_file(audio)
    new_video = save_file(video)
    if new_image:
        update_doc["image"] = new_image
    if new_audio:
        update_doc["audio"] = new_audio
    if new_video:
        update_doc["video"] = new_video

    db.contents.update_one({"_id": oid}, {"$set": update_doc})
    return {"message": "Updated"}


@app.delete("/delete-content/{content_id}")
def delete_content(content_id: str, current_user: dict[str, Any] = Depends(require_admin)):
    try:
        oid = ObjectId(content_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid ID") from exc

    result = get_db().contents.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


@app.get("/get-users")
def get_users(current_user: dict[str, Any] = Depends(require_admin)):
    users = get_db().users.find({}, {"password": 0})
    return [_user_out(user) for user in users]


@app.post("/create-user")
def create_user(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("user"),
    current_user: dict[str, Any] = Depends(require_admin),
):
    db = get_db()
    normalized_email = email.lower().strip()
    normalized_role = role.strip().lower() or "user"
    if normalized_role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be admin or user")
    if db.users.find_one({"email": normalized_email}):
        raise HTTPException(status_code=400, detail="User already exists")

    db.users.insert_one(
        {
            "email": normalized_email,
            "password": hash_password(password),
            "role": normalized_role,
            "created_at": datetime.now(timezone.utc),
            "created_by": current_user["email"],
        }
    )
    return {"message": "User created"}


@app.delete("/delete-user/{user_id}")
def delete_user(user_id: str, current_user: dict[str, Any] = Depends(require_admin)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid ID") from exc

    user = db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["email"] == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.users.delete_one({"_id": oid})
    return {"message": "User deleted"}


@app.post("/change-password")
def change_password(data: dict[str, Any], current_user: dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user = db.users.find_one({"email": current_user["email"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(str(data.get("current_password", "")), user["password"]):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    new_password = str(data.get("new_password", ""))
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password too short (min 6)")

    db.users.update_one(
        {"email": current_user["email"]},
        {"$set": {"password": hash_password(new_password), "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Password updated"}


@app.get("/analytics/overview")
def analytics(current_user: dict[str, Any] = Depends(require_admin)):
    db = get_db()
    total_content = db.contents.count_documents({})
    youtube_count = db.contents.count_documents({"$or": [{"youtube_id": {"$ne": None}}, {"content_type": "youtube"}]})
    article_count = db.contents.count_documents({"$or": [{"article_body": {"$ne": None}}, {"content_type": "article"}]})
    files_count = db.contents.count_documents({"$or": [{"image": {"$ne": None}}, {"audio": {"$ne": None}}, {"video": {"$ne": None}}]})
    by_nav_page = [
        {"nav_page": record["_id"], "count": record["count"]}
        for record in db.contents.aggregate(
            [{"$group": {"_id": "$nav_page", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
        )
    ]
    by_topic = [
        {"topic": record["_id"], "count": record["count"]}
        for record in db.contents.aggregate(
            [{"$group": {"_id": "$topic", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
        )
    ]
    return {
        "total_content": total_content,
        "total_users": db.users.count_documents({}),
        "youtube_count": youtube_count,
        "article_count": article_count,
        "files_count": files_count,
        "uploads_this_week": total_content,
        "active_users": db.users.count_documents({}),
        "views_today": 0,
        "by_nav_page": by_nav_page,
        "by_topic": by_topic,
    }


@app.on_event("startup")
def startup():
    if not ping():
        print("[STARTUP] MongoDB not reachable. Check .env MONGODB_URI")
        return

    db = get_db()
    db.users.create_index("email", unique=True)
    db.contents.create_index("nav_page")
    db.contents.create_index("topic")
    db.contents.create_index([("created_at", -1)])
    db.nav_items.create_index("page", unique=True)
    db.nav_items.create_index("order")
    print("[STARTUP] Indexes OK")

    admin_email = DEFAULT_ADMIN_EMAIL
    if not db.users.find_one({"email": admin_email}):
        db.users.insert_one(
            {
                "email": admin_email,
                "password": hash_password(DEFAULT_ADMIN_PASSWORD),
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
            }
        )
        print(f"[STARTUP] Default admin created: {admin_email} / {DEFAULT_ADMIN_PASSWORD}")

    user_email = DEFAULT_USER_EMAIL
    if not db.users.find_one({"email": user_email}):
        db.users.insert_one(
            {
                "email": user_email,
                "password": hash_password(DEFAULT_USER_PASSWORD),
                "role": "user",
                "created_at": datetime.now(timezone.utc),
            }
        )
        print(f"[STARTUP] Default user created: {user_email} / {DEFAULT_USER_PASSWORD}")

    if db.nav_items.count_documents({}) == 0:
        for item in DEFAULT_NAV:
            db.nav_items.insert_one({**item, "created_at": datetime.now(timezone.utc)})
        print(f"[STARTUP] Seeded {len(DEFAULT_NAV)} navigation items")
    else:
        print(f"[STARTUP] Navigation items: {db.nav_items.count_documents({})} found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
