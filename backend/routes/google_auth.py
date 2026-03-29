"""
Google OAuth 2.0 routes for VenuLoQ custom GCP project.
REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import httpx

from config import db, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_EXPIRATION_HOURS
from utils import generate_id, create_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/google", tags=["google-auth"])

# Google OAuth 2.0 endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES = "openid email profile"


def is_google_oauth_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


@router.get("/config")
async def google_oauth_config():
    """Return whether Google OAuth is enabled and the client ID (public)."""
    if not is_google_oauth_configured():
        return {"enabled": False, "client_id": None}
    return {"enabled": True, "client_id": GOOGLE_CLIENT_ID}


class GoogleOAuthURLRequest(BaseModel):
    redirect_uri: str


@router.post("/auth-url")
async def get_google_auth_url(data: GoogleOAuthURLRequest):
    """Generate the Google OAuth authorization URL.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    if not is_google_oauth_configured():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    import urllib.parse
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": data.redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return {"url": url}


class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/callback")
async def google_oauth_callback(data: GoogleCallbackRequest):
    """Exchange Google authorization code for user info and create/login user.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    if not is_google_oauth_configured():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": data.code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": data.redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_response.status_code != 200:
        logger.error(f"[Google OAuth] Token exchange failed: {token_response.text}")
        raise HTTPException(status_code=401, detail="Failed to authenticate with Google")

    token_data = token_response.json()
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(status_code=401, detail="No access token received from Google")

    # Fetch user info from Google
    async with httpx.AsyncClient() as client:
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_response.status_code != 200:
        logger.error(f"[Google OAuth] User info fetch failed: {userinfo_response.text}")
        raise HTTPException(status_code=401, detail="Failed to retrieve user info from Google")

    userinfo = userinfo_response.json()
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="No email received from Google")

    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})

    if user:
        # Update existing user with Google profile info
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "name": name or user.get("name"),
                "picture": picture,
                "email_verified": True,
                "google_linked": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        user_id = user["user_id"]
        role = user["role"]
        logger.info(f"[Google OAuth] Existing user logged in: {email}")
    else:
        # Create new customer account
        user_id = generate_id("user_")
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name or email.split("@")[0].title(),
            "picture": picture,
            "role": "customer",
            "email_verified": True,
            "google_linked": True,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(new_user)
        role = "customer"
        logger.info(f"[Google OAuth] New user created: {email}")

    # Generate JWT
    token = create_token(user_id, role, hours=JWT_EXPIRATION_HOURS)

    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture,
            "email_verified": True,
        },
    }
