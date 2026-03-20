"""
Auth routes for VenuLoQ API.
"""
import random
import uuid
import logging
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import httpx
import os
import resend

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, SENDER_EMAIL
from models import UserCreate, UserLogin, ProfileUpdate, ChangePasswordRequest, RMProfileUpdate
from utils import (
    generate_id, hash_password, verify_password, 
    create_token, get_current_user, create_notification, send_email_async
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(user_data: UserCreate, request: Request):
    """Register a new user."""
    # Normalize email to lowercase for consistent storage and lookup
    normalized_email = user_data.email.strip().lower()
    existing = await db.users.find_one({"email": normalized_email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id("user_")
    user = {
        "user_id": user_id,
        "email": normalized_email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name or normalized_email.split('@')[0].title(),
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in ["customer", "venue_owner", "event_planner"] else "customer",
        "picture": None,
        "email_verified": False,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id, user["role"])
    
    # Send verification email
    origin = request.headers.get("origin") or request.headers.get("referer", "").split("?")[0].rstrip("/")
    verify_token = str(uuid.uuid4())
    await db.verification_tokens.insert_one({
        "token": verify_token,
        "user_id": user_id,
        "email": user_data.email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    verify_link = f"{origin}/verify-email?token={verify_token}"
    await send_email_async(
        to=user_data.email,
        subject="Verify your VenuLoQ account",
        html=f"""
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; color: #0B0B0D; margin: 0; font-weight: 700; letter-spacing: -0.5px;">VenuLoQ</h1>
                <div style="width: 40px; height: 2px; background: #D4B36A; margin: 8px auto 0;"></div>
            </div>
            <p style="color: #333; font-size: 16px; text-align: center; margin-bottom: 4px;">Welcome, {user['name']}!</p>
            <p style="color: #6E6E6E; font-size: 14px; text-align: center; margin-bottom: 24px;">Please verify your email to start booking venues.</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{verify_link}" style="display: inline-block; background: #D4B36A; color: #0B0B0D; padding: 14px 36px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">Verify Email Address</a>
            </div>
            <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #E5E0D8; margin: 24px 0;" />
            <p style="color: #9CA3AF; font-size: 11px; text-align: center;">&copy; VenuLoQ &mdash; Find. Compare. Lock.</p>
        </div>
        """,
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user["phone"],
            "email_verified": False,
        }
    }


@router.post("/login")
async def login(credentials: UserLogin):
    """Login with email (or short username) and password."""
    login_id = credentials.email.strip().lower()
    
    # Support short usernames: try as-is first, then append @venuloq.in
    user = await db.users.find_one({"email": login_id}, {"_id": 0})
    if not user and "@" not in login_id:
        user = await db.users.find_one({"email": f"{login_id}@venuloq.in"}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Block unverified RMs
    if user.get("role") == "rm":
        v_status = user.get("verification_status")
        if v_status == "rejected":
            raise HTTPException(status_code=403, detail="Your profile has been rejected by HR. Please contact HR for details.")
        if v_status == "pending" and user.get("profile_completed") and not user.get("must_change_password"):
            raise HTTPException(status_code=403, detail="Your profile is pending HR verification. You'll be notified once approved.")

    if user.get("status") not in ("active", "pending_verification"):
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
            "picture": user.get("picture") or user.get("profile_photo"),
            "email_verified": user.get("email_verified", True),
            "must_change_password": user.get("must_change_password", False),
            "profile_completed": user.get("profile_completed", True),
            "verification_status": user.get("verification_status"),
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
            {"$set": {"name": name, "picture": picture, "email_verified": True}}
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
            "email_verified": True,
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
    
    # Also return a JWT token so the frontend can use Bearer auth
    token = create_token(user_id, role, hours=JWT_EXPIRATION_HOURS)
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture,
            "email_verified": True
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
        "picture": user.get("picture") or user.get("profile_photo"),
        "email_verified": user.get("email_verified", True),
        "must_change_password": user.get("must_change_password", False),
        "profile_completed": user.get("profile_completed", True),
        "verification_status": user.get("verification_status"),
        "address": user.get("address"),
        "emergency_contact_name": user.get("emergency_contact_name"),
        "emergency_contact_phone": user.get("emergency_contact_phone"),
        "profile_photo": user.get("profile_photo"),
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
        "picture": updated.get("picture"),
        "email_verified": updated.get("email_verified", True)
    }


@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change password. Used for forced password change on first login."""
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "must_change_password": False,
            "updated_at": now,
        }}
    )

    return {"message": "Password changed successfully"}


@router.put("/rm-profile")
async def update_rm_profile(data: RMProfileUpdate, user: dict = Depends(get_current_user)):
    """RM completes/updates their profile (phone, address, emergency contact)."""
    if user.get("role") != "rm":
        raise HTTPException(status_code=403, detail="Only RMs can update RM profile")

    updates = {}
    if data.phone is not None:
        updates["phone"] = data.phone
    if data.address is not None:
        updates["address"] = data.address
    if data.emergency_contact_name is not None:
        updates["emergency_contact_name"] = data.emergency_contact_name
    if data.emergency_contact_phone is not None:
        updates["emergency_contact_phone"] = data.emergency_contact_phone

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check if all required fields are now provided
    current = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    merged = {**current, **updates}
    all_filled = all([
        merged.get("phone"),
        merged.get("address"),
        merged.get("emergency_contact_name"),
        merged.get("emergency_contact_phone"),
    ])

    if all_filled:
        updates["profile_completed"] = True

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})

    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return updated


@router.post("/rm-profile-photo")
async def upload_rm_profile_photo(request: Request, user: dict = Depends(get_current_user)):
    """Upload profile photo for RM. Accepts base64-encoded image data."""
    if user.get("role") != "rm":
        raise HTTPException(status_code=403, detail="Only RMs can upload RM profile photos")

    body = await request.json()
    photo_data = body.get("photo")
    if not photo_data:
        raise HTTPException(status_code=400, detail="No photo data provided")

    # Store the base64 photo URL directly (data URI)
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"profile_photo": photo_data, "updated_at": now}}
    )

    return {"message": "Profile photo uploaded", "profile_photo": photo_data}


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

    # Rate limiting — prevent spamming the same email
    recent_otp = await db.email_otps.find_one({"email": email}, {"_id": 0})
    if recent_otp and recent_otp.get("created_at"):
        created = datetime.fromisoformat(recent_otp["created_at"])
        seconds_since = (datetime.now(timezone.utc) - created).total_seconds()
        if seconds_since < 30:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {int(30 - seconds_since)} seconds before requesting a new code."
            )

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
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; color: #0B0B0D; margin: 0; font-weight: 700; letter-spacing: -0.5px;">VenuLoQ</h1>
                <div style="width: 40px; height: 2px; background: #D4B36A; margin: 8px auto 0;"></div>
            </div>
            <p style="color: #333; font-size: 15px; margin-bottom: 8px; text-align: center;">Your verification code is:</p>
            <div style="background: #F4F1EC; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #0B0B0D; font-family: monospace;">{otp_code}</span>
            </div>
            <p style="color: #6E6E6E; font-size: 13px; line-height: 1.6; text-align: center;">
                Enter this code to sign in to VenuLoQ.<br>
                It expires in <strong>10 minutes</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E0D8; margin: 24px 0;" />
            <p style="color: #9CA3AF; font-size: 11px; text-align: center; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email.<br>
                &copy; VenuLoQ &mdash; Find. Compare. Lock.
            </p>
        </div>
        """,
    )

    if email_sent:
        logger.info(f"[Email OTP] Code sent to {email}")
        return {"message": "Verification code sent to your email", "email": email, "sent": True}
    else:
        logger.warning(f"[Email OTP] Delivery failed for {email}, returning fallback OTP")
        return {"message": "OTP sent to your email", "email": email, "sent": False, "debug_otp": otp_code}


@router.post("/email-otp/verify")
async def verify_email_otp(data: EmailOTPVerifyRequest):
    """Verify the email OTP. Creates account if new, logs in if existing."""
    email = data.email.strip().lower()
    otp_record = await db.email_otps.find_one({"email": email}, {"_id": 0})

    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP found for this email. Please request a new code.")

    # Check expiry first
    expires_at = datetime.fromisoformat(otp_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.email_otps.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Your code has expired. Please request a new one.")

    if otp_record.get("otp") != data.otp.strip():
        raise HTTPException(status_code=400, detail="Incorrect code. Please check and try again.")

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


# ============== EMAIL VERIFICATION ENDPOINTS ==============

@router.get("/verify-email")
async def verify_email(token: str):
    """Verify user email via token from the verification link."""
    record = await db.verification_tokens.find_one({"token": token}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    expires_at = datetime.fromisoformat(record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.verification_tokens.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")

    await db.users.update_one(
        {"user_id": record["user_id"]},
        {"$set": {"email_verified": True}}
    )
    await db.verification_tokens.delete_many({"user_id": record["user_id"]})

    return {"message": "Email verified successfully", "verified": True}


@router.post("/resend-verification")
async def resend_verification(request: Request, user: dict = Depends(get_current_user)):
    """Resend verification email for the current user."""
    if user.get("email_verified", True):
        return {"message": "Email is already verified"}

    # Delete old tokens
    await db.verification_tokens.delete_many({"user_id": user["user_id"]})

    origin = request.headers.get("origin") or request.headers.get("referer", "").split("?")[0].rstrip("/")
    verify_token = str(uuid.uuid4())
    await db.verification_tokens.insert_one({
        "token": verify_token,
        "user_id": user["user_id"],
        "email": user["email"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    verify_link = f"{origin}/verify-email?token={verify_token}"
    sent = await send_email_async(
        to=user["email"],
        subject="Verify your VenuLoQ account",
        html=f"""
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; color: #0B0B0D; margin: 0; font-weight: 700; letter-spacing: -0.5px;">VenuLoQ</h1>
                <div style="width: 40px; height: 2px; background: #D4B36A; margin: 8px auto 0;"></div>
            </div>
            <p style="color: #333; font-size: 16px; text-align: center; margin-bottom: 4px;">Hi {user.get('name', 'there')}!</p>
            <p style="color: #6E6E6E; font-size: 14px; text-align: center; margin-bottom: 24px;">Please verify your email to start booking venues.</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{verify_link}" style="display: inline-block; background: #D4B36A; color: #0B0B0D; padding: 14px 36px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">Verify Email Address</a>
            </div>
            <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #E5E0D8; margin: 24px 0;" />
            <p style="color: #9CA3AF; font-size: 11px; text-align: center;">&copy; VenuLoQ &mdash; Find. Compare. Lock.</p>
        </div>
        """,
    )
    return {"message": "Verification email sent" if sent else "Could not send email. Please try again.", "sent": sent}
