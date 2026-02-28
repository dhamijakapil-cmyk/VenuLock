"""
Auth routes for BookMyVenue API.
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from datetime import datetime, timezone, timedelta
import httpx
import os

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from models import UserCreate, UserLogin
from utils import (
    generate_id, hash_password, verify_password, 
    create_token, get_current_user, create_notification
)

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
        "name": user_data.name,
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
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@router.post("/google-session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session from Emergent Auth."""
    try:
        body = await request.json()
        session_id = body.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id")
        
        # Get session info from Emergent Integration Proxy
        proxy_url = os.environ.get('INTEGRATION_PROXY_URL', 'https://integrations.emergentagent.com')
        
        async with httpx.AsyncClient() as client:
            session_response = await client.get(
                f"{proxy_url}/auth/google/session/{session_id}",
                timeout=30.0
            )
            
            if session_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired session")
            
            session_data = session_response.json()
        
        if session_data.get("status") != "authenticated":
            raise HTTPException(status_code=401, detail="Session not authenticated")
        
        user_info = session_data.get("user", {})
        email = user_info.get("email")
        name = user_info.get("name", email.split("@")[0] if email else "User")
        picture = user_info.get("picture")
        google_id = user_info.get("id")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            # Update user with Google info
            update_data = {"picture": picture, "google_id": google_id}
            await db.users.update_one(
                {"email": email},
                {"$set": update_data}
            )
            user = {**existing_user, **update_data}
        else:
            # Create new user
            user = {
                "user_id": generate_id("user_"),
                "email": email,
                "name": name,
                "role": "customer",
                "status": "active",
                "picture": picture,
                "google_id": google_id,
                "password_hash": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
            user.pop("_id", None)
            
            await create_notification(
                user["user_id"],
                "Welcome to BookMyVenue!",
                f"Hi {name}, your account has been created with Google Sign-In.",
                "welcome"
            )
        
        # Create session token
        session_token = generate_id("sess_")
        session_expiry = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "session_token": session_token,
            "user_id": user["user_id"],
            "google_session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": session_expiry.isoformat()
        })
        
        # Set session cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60
        )
        
        user.pop("password_hash", None)
        return {"success": True, "user": user, "token": session_token}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info."""
    user.pop("password_hash", None)
    # Get unread notification count
    unread_count = await db.notifications.count_documents({
        "user_id": user["user_id"],
        "read": False
    })
    return {**user, "unread_notifications": unread_count}


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session."""
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}
