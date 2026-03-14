"""
Email Verification Feature Tests - VenuLoQ
Tests for:
1. POST /api/auth/register - creates user with email_verified=false
2. POST /api/auth/login - returns email_verified field
3. GET /api/auth/verify-email?token=xxx - verifies user
4. POST /api/auth/resend-verification - sends new verification email
5. GET /api/auth/me - returns email_verified field
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestEmailVerificationBackend:
    """Tests for email verification flow"""

    @pytest.fixture(scope="class")
    def unique_email(self):
        """Generate unique email for this test run"""
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"TEST_verify_{ts}_{uuid.uuid4().hex[:6]}@example.com"

    @pytest.fixture(scope="class")
    def registered_user(self, unique_email):
        """Register a new user and return response data"""
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Verify User"
        }, headers={"Content-Type": "application/json", "Origin": "https://premium-event-search.preview.emergentagent.com"})
        assert res.status_code == 200, f"Registration failed: {res.text}"
        return res.json()

    def test_01_register_creates_user_with_email_verified_false(self, registered_user):
        """POST /api/auth/register creates user with email_verified=false"""
        assert "user" in registered_user
        assert "token" in registered_user
        user = registered_user["user"]
        assert user.get("email_verified") == False, f"Expected email_verified=false, got {user.get('email_verified')}"
        print(f"PASS: Register response has email_verified=false for user {user['email']}")

    def test_02_login_returns_email_verified_field_for_new_user(self, registered_user):
        """POST /api/auth/login returns email_verified field (false for new user)"""
        # Use the email from registered_user directly
        email = registered_user["user"]["email"]
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "test123456"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        data = res.json()
        assert "user" in data
        # New user should have email_verified=false
        assert "email_verified" in data["user"], "email_verified field missing from login response"
        assert data["user"]["email_verified"] == False, "New user should have email_verified=false"
        print(f"PASS: Login returns email_verified=false for new unverified user")

    def test_03_login_returns_email_verified_true_for_legacy_user(self):
        """POST /api/auth/login returns email_verified=true for legacy/verified user"""
        # Test with existing verified user (testuser_signup or admin)
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "admin"
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        data = res.json()
        assert "user" in data
        assert "email_verified" in data["user"], "email_verified field missing from login response"
        # Legacy/admin user should default to true
        assert data["user"]["email_verified"] == True, "Legacy user should have email_verified=true"
        print(f"PASS: Login returns email_verified=true for legacy/admin user")

    def test_04_get_me_returns_email_verified_field(self, registered_user):
        """GET /api/auth/me returns email_verified field"""
        token = registered_user["token"]
        res = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert res.status_code == 200, f"/me failed: {res.text}"
        data = res.json()
        assert "email_verified" in data, "email_verified field missing from /me response"
        # Since user is new and unverified
        assert data["email_verified"] == False, "/me should show email_verified=false for new user"
        print(f"PASS: GET /me returns email_verified=false for new user")

    def test_05_verify_email_with_invalid_token(self):
        """GET /api/auth/verify-email with invalid token returns 400"""
        fake_token = str(uuid.uuid4())
        res = requests.get(f"{BASE_URL}/api/auth/verify-email?token={fake_token}")
        assert res.status_code == 400, f"Expected 400 for invalid token, got {res.status_code}"
        print(f"PASS: verify-email with invalid token returns 400")

    def test_06_resend_verification_requires_auth(self):
        """POST /api/auth/resend-verification requires auth token"""
        res = requests.post(f"{BASE_URL}/api/auth/resend-verification")
        assert res.status_code in [401, 403], f"Expected 401/403 without auth, got {res.status_code}"
        print(f"PASS: resend-verification requires auth (status {res.status_code})")

    def test_07_resend_verification_with_auth(self, registered_user):
        """POST /api/auth/resend-verification sends new verification email for unverified user"""
        token = registered_user["token"]
        res = requests.post(f"{BASE_URL}/api/auth/resend-verification", headers={
            "Authorization": f"Bearer {token}",
            "Origin": "https://premium-event-search.preview.emergentagent.com"
        })
        assert res.status_code == 200, f"Resend failed: {res.text}"
        data = res.json()
        assert "message" in data
        # Message should indicate email sent
        assert "sent" in data.get("message", "").lower() or data.get("sent", False), f"Expected sent confirmation: {data}"
        print(f"PASS: resend-verification returns success for unverified user")

    def test_08_resend_verification_for_verified_user(self):
        """POST /api/auth/resend-verification returns already verified for verified user"""
        # Login as admin (verified user)
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "admin"
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        res = requests.post(f"{BASE_URL}/api/auth/resend-verification", headers={
            "Authorization": f"Bearer {token}"
        })
        assert res.status_code == 200, f"Resend for verified user failed: {res.text}"
        data = res.json()
        assert "already verified" in data.get("message", "").lower(), f"Expected 'already verified' message: {data}"
        print(f"PASS: resend-verification returns 'already verified' for verified user")


class TestVerifyEmailEndToEnd:
    """End-to-end test: Register -> Get token from DB -> Verify -> Check email_verified=true"""
    
    def test_full_verification_flow(self):
        """Full flow: register, verify with token, check email_verified=true"""
        import pymongo
        
        # Connect to MongoDB to get verification token
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client['test_database']
        
        # Step 1: Register new user
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        test_email = f"TEST_e2e_verify_{ts}_{uuid.uuid4().hex[:4]}@example.com"
        
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "E2E Verify User"
        }, headers={"Origin": "https://premium-event-search.preview.emergentagent.com"})
        assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
        reg_data = reg_res.json()
        user_id = reg_data["user"]["user_id"]
        token_jwt = reg_data["token"]
        
        # Verify email_verified is false after registration
        assert reg_data["user"]["email_verified"] == False
        print(f"Step 1 PASS: Registered user {test_email} with email_verified=false")
        
        # Step 2: Get verification token from DB
        import time
        time.sleep(0.5)  # Small delay for DB write
        token_doc = db.verification_tokens.find_one({"user_id": user_id})
        assert token_doc is not None, f"Verification token not found for user_id {user_id}"
        verify_token = token_doc["token"]
        print(f"Step 2 PASS: Found verification token in DB")
        
        # Step 3: Call verify-email endpoint
        verify_res = requests.get(f"{BASE_URL}/api/auth/verify-email?token={verify_token}")
        assert verify_res.status_code == 200, f"Verification failed: {verify_res.text}"
        verify_data = verify_res.json()
        assert verify_data.get("verified") == True or "success" in verify_data.get("message", "").lower()
        print(f"Step 3 PASS: Verification endpoint returned success")
        
        # Step 4: Use /me with original token to check email_verified=true (token is still valid)
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token_jwt}"
        })
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email_verified"] == True, f"Expected email_verified=true after verification, got {me_data}"
        print(f"Step 4 PASS: /me shows email_verified=true after verification")
        
        # Cleanup
        db.users.delete_one({"user_id": user_id})
        db.verification_tokens.delete_many({"user_id": user_id})
        client.close()
        print(f"CLEANUP: Deleted test user and tokens")
        print(f"FULL E2E VERIFICATION FLOW PASSED!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
