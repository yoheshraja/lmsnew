import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

SECRET = os.environ.get("JWT_SECRET", "supersecret_local_dev_key_change_in_production")
ALGO   = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_minutes: int = 60) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)
    return jwt.encode(
        {
            "exp": expire,
            "iat": now,
            "sub": data.get("email"),
            "email": data.get("email"),
            "role": data.get("role", "user"),
            "iss": "YogiLMS",
            "token_type": "access",
        },
        SECRET, algorithm=ALGO
    )

def verify_token(token: str):
    try:
        p = jwt.decode(token, SECRET, algorithms=[ALGO], issuer="YogiLMS",
                       options={"verify_exp": True, "verify_iss": True})
        return p if p.get("token_type") == "access" else None
    except JWTError:
        return None
