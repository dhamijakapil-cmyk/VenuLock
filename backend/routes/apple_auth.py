"""
Apple Sign In OAuth 2.0 routes for VenuLoQ.
Handles the web-based Apple OAuth flow with JWT client_secret generation.
REMINDER: DO NOT HARDCODE URLS OR ADD FALLBACKS. READ FROM ENV VARS ONLY.
"""
import logging
import json
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
import jwt as pyjwt

from config import db, JWT_EXPIRATION_HOURS
from utils import generate_id, create_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/apple", tags=["apple-auth"])

# Apple OAuth 2.0 endpoints
APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"

import os
APPLE_CLIENT_ID = os.environ.get('APPLE_CLIENT_ID', '')
APPLE_TEAM_ID = os.environ.get('APPLE_TEAM_ID', '')
APPLE_KEY_ID = os.environ.get('APPLE_KEY_ID', '')
APPLE_PRIVATE_KEY = os.environ.get('APPLE_PRIVATE_KEY', '')


def is_apple_auth_configured() -> bool:
    return bool(APPLE_CLIENT_ID and APPLE_TEAM_ID and APPLE_KEY_ID and APPLE_PRIVATE_KEY)


def generate_apple_client_secret() -> str:
    """
    Generate a signed JWT client_secret for Apple's token endpoint.
    Apple requires this instead of a static client secret.
    Signed with ES256 using the private key from Apple Developer.
    """
    now = int(time.time())
    headers = {
        'kid': APPLE_KEY_ID,
        'alg': 'ES256',
    }
    payload = {
        'iss': APPLE_TEAM_ID,
        'iat': now,
        'exp': now + (86400 * 180),  # 180 days
        'aud': 'https://appleid.apple.com',
        'sub': APPLE_CLIENT_ID,
    }
    # The private key may be stored with escaped newlines in env var
    key = APPLE_PRIVATE_KEY.replace('\\n', '\n')
    return pyjwt.encode(payload, key, algorithm='ES256', headers=headers)


@router.get("/config")
async def apple_auth_config():
    """Return whether Apple Sign In is enabled."""
    if not is_apple_auth_configured():
        return {"enabled": False, "client_id": None}
    return {"enabled": True, "client_id": APPLE_CLIENT_ID}


class AppleAuthURLRequest(BaseModel):
    redirect_uri: str
    state: Optional[str] = None


@router.post("/auth-url")
async def get_apple_auth_url(data: AppleAuthURLRequest):
    """Generate the Apple Sign In authorization URL."""
    if not is_apple_auth_configured():
        raise HTTPException(status_code=503, detail="Apple Sign In is not configured")

    import urllib.parse
    params = {
        "client_id": APPLE_CLIENT_ID,
        "redirect_uri": data.redirect_uri,
        "response_type": "code",
        "scope": "email name",
        "response_mode": "query",
    }
    if data.state:
        params["state"] = data.state
    url = f"{APPLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return {"url": url}


class AppleCallbackRequest(BaseModel):
    code: str
    redirect_uri: str
    user: Optional[dict] = None  # Apple sends user info only on first sign-in


@router.post("/callback")
async def apple_oauth_callback(data: AppleCallbackRequest):
    """
    Exchange Apple authorization code for tokens and create/login user.
    Apple's token endpoint requires a dynamically generated client_secret (JWT).
    """
    if not is_apple_auth_configured():
        raise HTTPException(status_code=503, detail="Apple Sign In is not configured")

    # Generate the client secret JWT
    try:
        client_secret = generate_apple_client_secret()
    except Exception as e:
        logger.error(f"[Apple Auth] Failed to generate client secret: {e}")
        raise HTTPException(status_code=500, detail="Apple auth configuration error")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            APPLE_TOKEN_URL,
            data={
                "code": data.code,
                "client_id": APPLE_CLIENT_ID,
                "client_secret": client_secret,
                "redirect_uri": data.redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_response.status_code != 200:
        logger.error(f"[Apple Auth] Token exchange failed: {token_response.text}")
        raise HTTPException(status_code=401, detail="Failed to authenticate with Apple")

    token_data = token_response.json()
    id_token = token_data.get("id_token")

    if not id_token:
        raise HTTPException(status_code=401, detail="No id_token received from Apple")

    # Decode and verify the id_token
    try:
        # Fetch Apple's public keys for verification
        async with httpx.AsyncClient() as client:
            keys_response = await client.get(APPLE_KEYS_URL)
        apple_keys = keys_response.json()

        # Get the key ID from the token header
        unverified_header = pyjwt.get_unverified_header(id_token)
        kid = unverified_header.get('kid')

        # Find matching public key
        matching_key = None
        for key in apple_keys.get('keys', []):
            if key['kid'] == kid:
                matching_key = key
                break

        if not matching_key:
            raise HTTPException(status_code=401, detail="Apple public key not found")

        # Convert JWKS to public key and verify
        from jwt.algorithms import RSAAlgorithm
        public_key = RSAAlgorithm.from_jwk(json.dumps(matching_key))

        decoded = pyjwt.decode(
            id_token,
            public_key,
            algorithms=['RS256'],
            audience=APPLE_CLIENT_ID,
            options={"verify_exp": True},
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Apple token has expired")
    except pyjwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except Exception as e:
        logger.error(f"[Apple Auth] Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Failed to verify Apple token")

    apple_id = decoded.get("sub")
    email = decoded.get("email")

    if not apple_id:
        raise HTTPException(status_code=400, detail="No Apple ID in token")

    # Apple sends user name only on first sign-in via the 'user' field
    first_name = None
    last_name = None
    if data.user and isinstance(data.user, dict):
        name_data = data.user.get("name", {})
        if isinstance(name_data, dict):
            first_name = name_data.get("firstName")
            last_name = name_data.get("lastName")

    # Find or create user — check by apple_id first, then email
    user = await db.users.find_one({"apple_id": apple_id}, {"_id": 0})

    if not user and email:
        user = await db.users.find_one({"email": email}, {"_id": 0})

    if user:
        # Update existing user
        update_fields = {
            "apple_id": apple_id,
            "apple_linked": True,
            "email_verified": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if first_name:
            update_fields["name"] = f"{first_name} {last_name or ''}".strip()
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_fields})
        user_id = user["user_id"]
        role = user["role"]
        name = update_fields.get("name") or user.get("name")
        logger.info(f"[Apple Auth] Existing user logged in: {email or apple_id}")
    else:
        # Create new customer account
        user_id = generate_id("user_")
        name = f"{first_name or ''} {last_name or ''}".strip() or (email.split("@")[0].title() if email else "Apple User")
        new_user = {
            "user_id": user_id,
            "email": email or f"{apple_id}@privaterelay.appleid.com",
            "name": name,
            "role": "customer",
            "apple_id": apple_id,
            "apple_linked": True,
            "email_verified": True,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(new_user)
        role = "customer"
        logger.info(f"[Apple Auth] New user created: {email or apple_id}")

    token = create_token(user_id, role, hours=JWT_EXPIRATION_HOURS)

    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "email_verified": True,
        },
    }
