"""
Auth routes for VenuLoQ API.
"""
import random
import logging
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import httpx
import os
import resend

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, SENDER_EMAIL
from models import UserCreate, UserLogin, ProfileUpdate
from utils import (
    generate_id, hash_password, verify_password, 
    create_token, get_current_user, create_notification, send_email_async
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user."""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id("user_")
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name or user_data.email.split('@')[0].title(),
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in ["customer", "venue_owner", "event_planner"] else "customer",
        "picture": None,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id, user["role"])
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user["phone"]
        }
    }


@router.post("/login")
async def login(credentials: UserLogin):
    """Login with email and password."""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is not active")
    
    token = create_token(user["user_id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user.get("phone"),
            "picture": user.get("picture")
        }
    }


# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@router.post("/google-session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session from Emergent Auth."""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Get session data from Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    auth_data = auth_response.json()
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        user_id = user["user_id"]
        role = user["role"]
    else:
        # Create new user
        user_id = generate_id("user_")
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "customer",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        role = "customer"
    
    # Store session
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture
        }
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info."""
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "phone": user.get("phone"),
        "picture": user.get("picture")
    }


@router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update current user's profile (name, phone)."""
    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.phone is not None:
        updates["phone"] = data.phone
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "user_id": updated["user_id"],
        "email": updated["email"],
        "name": updated["name"],
        "role": updated["role"],
        "phone": updated.get("phone"),
        "picture": updated.get("picture")
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session."""
    token = request.cookies.get('session_token')
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}


# ============== EMAIL OTP ENDPOINTS ==============

class EmailOTPSendRequest(BaseModel):
    email: EmailStr

class EmailOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    stay_signed_in: bool = True


@router.post("/email-otp/send")
async def send_email_otp(data: EmailOTPSendRequest):
    """Send a 6-digit OTP to the given email address."""
    email = data.email.strip().lower()

    # Basic email validation — must have valid domain with TLD
    import re
    if not re.match(r'^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.email_otps.update_one(
        {"email": email},
        {"$set": {
            "otp": otp_code,
            "expires_at": expires_at.isoformat(),
            "verified": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    # Send the email via Resend
    email_sent = await send_email_async(
        to=email,
        subject="Your VenuLoQ verification code",
        html=f"""
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 22px; color: #0B0B0D; margin: 0;">VenuLoQ</h1>
            </div>
            <p style="color: #333; font-size: 15px; margin-bottom: 8px;">Your verification code is:</p>
            <div style="background: #F4F1EC; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0B0B0D;">{otp_code}</span>
            </div>
            <p style="color: #6E6E6E; font-size: 13px; line-height: 1.5;">
                Enter this code to sign in to VenuLoQ. It expires in 10 minutes.<br>
                If you didn't request this, you can safely ignore this email.
            </p>
        </div>
        """,
    )

    response = {"message": "OTP sent to your email", "email": email}
    # If email delivery failed (no API key, or Resend rejected), include debug_otp as fallback
    if not email_sent:
        response["debug_otp"] = otp_code
        logger.info(f"[Email OTP] Fallback debug_otp for {email}")
    else:
        logger.info(f"[Email OTP] Email delivered to {email}")

    return response


@router.post("/email-otp/verify")
async def verify_email_otp(data: EmailOTPVerifyRequest):
    """Verify the email OTP. Creates account if new, logs in if existing."""
    email = data.email.strip().lower()
    otp_record = await db.email_otps.find_one({"email": email}, {"_id": 0})

    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

    if otp_record.get("otp") != data.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    expires_at = datetime.fromisoformat(otp_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Clean up OTP record
    await db.email_otps.delete_one({"email": email})

    # Find or create the user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    is_new = False

    if not user:
        is_new = True
        user_id = generate_id("user_")
        user = {
            "user_id": user_id,
            "email": email,
            "name": email.split("@")[0].title(),
            "role": "customer",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
        logger.info(f"[Email OTP] New user created: {email}")
    else:
        logger.info(f"[Email OTP] Existing user logged in: {email}")

    # 30-day token when "stay signed in" is checked, otherwise default
    exp_hours = 720 if data.stay_signed_in else JWT_EXPIRATION_HOURS
    token = create_token(user["user_id"], user["role"], hours=exp_hours)

    return {
        "token": token,
        "is_new_user": is_new,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user.get("name"),
            "role": user["role"],
            "phone": user.get("phone"),
            "picture": user.get("picture"),
        },
    }
