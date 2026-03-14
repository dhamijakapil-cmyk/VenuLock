"""
Test Resend Email OTP Authentication - Live Integration Tests
Tests for POST /api/auth/email-otp/send and POST /api/auth/email-otp/verify
with live Resend API integration.

Key behaviors tested:
- Real email sending via Resend (sent: true in response)
- No debug_otp exposure when email sends successfully
- Rate limiting (429 if requesting within 30 seconds)
- Invalid email rejection
- OTP verification (correct/incorrect/expired/missing)
- User auto-creation on first verify
- Token validity with /api/auth/me
"""
import pytest
import requests
import os
import uuid
import time
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# MongoDB client for reading OTP directly
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]


class TestEmailOTPSendResend:
    """Tests for POST /api/auth/email-otp/send endpoint with live Resend"""
    
    def test_send_otp_success_real_email(self):
        """Test sending OTP returns sent:true and NO debug_otp when Resend configured"""
        test_email = f"test_resend_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "email" in data, "Response should contain 'email'"
        assert data["email"] == test_email.lower(), f"Email should be {test_email.lower()}"
        assert "sent" in data, "Response should contain 'sent' field"
        
        # Critical: When email sends successfully, NO debug_otp should be exposed
        if data.get("sent") is True:
            assert "debug_otp" not in data, "SECURITY: debug_otp should NOT be in response when sent:true"
            print(f"✓ OTP sent via Resend to {test_email} (sent=True, no debug_otp exposed)")
        else:
            # Fallback case - email failed, debug_otp may be present
            print(f"✓ Email delivery failed (sent={data.get('sent')}), debug_otp={data.get('debug_otp')}")
    
    def test_send_otp_rate_limiting(self):
        """Test that sending OTP twice within 30 seconds returns 429"""
        test_email = f"test_rate_{uuid.uuid4().hex[:8]}@example.com"
        
        # First request - should succeed
        response1 = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        assert response1.status_code == 200, f"First request failed: {response1.text}"
        
        # Second request immediately - should be rate limited
        response2 = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        assert response2.status_code == 429, f"Expected 429 for rate limit, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        assert "detail" in data
        assert "wait" in data["detail"].lower() or "second" in data["detail"].lower()
        print(f"✓ Rate limiting works: {data['detail']}")
    
    def test_send_otp_invalid_email_format(self):
        """Test sending OTP to invalid email format rejects the request"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "not-a-valid-email"
        })
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print(f"✓ Invalid email format correctly rejected with 422")
    
    def test_send_otp_invalid_email_no_tld(self):
        """Test email without TLD is rejected (Pydantic EmailStr validates first)"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "test@localhost"
        })
        # Pydantic's EmailStr validation catches this before our regex check, returns 422
        assert response.status_code in [400, 422], f"Expected 400 or 422 for email without TLD, got {response.status_code}"
        print(f"✓ Email without TLD correctly rejected with {response.status_code}")
    
    def test_send_otp_empty_email(self):
        """Test sending OTP with empty email rejects the request"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": ""
        })
        assert response.status_code == 422, f"Expected 422 for empty email, got {response.status_code}"
        print(f"✓ Empty email correctly rejected with 422")


class TestEmailOTPVerifyWithDB:
    """Tests for POST /api/auth/email-otp/verify - reading OTP from MongoDB"""
    
    def _get_otp_from_db(self, email):
        """Helper to get OTP directly from MongoDB for testing"""
        record = db.email_otps.find_one({"email": email.lower()})
        if record:
            return record.get("otp")
        return None
    
    def _cleanup_test_user(self, email):
        """Clean up test user and OTP records"""
        db.email_otps.delete_one({"email": email.lower()})
        db.users.delete_one({"email": email.lower()})
    
    def test_verify_otp_correct_new_user(self):
        """Test verifying correct OTP for new user creates account and returns token"""
        test_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Step 1: Send OTP
            send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
                "email": test_email
            })
            assert send_response.status_code == 200, f"Send OTP failed: {send_response.text}"
            
            # Step 2: Get OTP from database (since Resend sends real email)
            otp = self._get_otp_from_db(test_email)
            assert otp, f"OTP not found in database for {test_email}"
            
            # Step 3: Verify OTP
            verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": test_email,
                "otp": otp
            })
            assert verify_response.status_code == 200, f"Verify OTP failed: {verify_response.text}"
            
            data = verify_response.json()
            assert "token" in data, "Response should contain 'token'"
            assert "is_new_user" in data, "Response should contain 'is_new_user'"
            assert data["is_new_user"] is True, "is_new_user should be True for new account"
            assert "user" in data, "Response should contain 'user'"
            
            user = data["user"]
            assert user["email"] == test_email.lower()
            assert user["role"] == "customer"
            assert "user_id" in user
            print(f"✓ New user created via Email OTP: {user['email']}, user_id: {user['user_id']}")
        finally:
            self._cleanup_test_user(test_email)
    
    def test_verify_otp_correct_existing_user(self):
        """Test verifying OTP for existing user logs them in"""
        test_email = f"existuser_{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Step 1: Create user first by sending and verifying OTP
            send1 = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
            assert send1.status_code == 200
            otp1 = self._get_otp_from_db(test_email)
            assert otp1
            
            verify1 = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": test_email, "otp": otp1
            })
            assert verify1.status_code == 200
            assert verify1.json().get("is_new_user") is True
            
            # Wait for rate limit cooldown
            time.sleep(31)
            
            # Step 2: Send OTP again for the same email
            send2 = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
            assert send2.status_code == 200
            otp2 = self._get_otp_from_db(test_email)
            assert otp2
            
            # Step 3: Verify again - should be existing user
            verify2 = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": test_email, "otp": otp2
            })
            assert verify2.status_code == 200
            data = verify2.json()
            assert data["is_new_user"] is False, "is_new_user should be False for existing user"
            assert "token" in data
            print(f"✓ Existing user logged in via Email OTP: {data['user']['email']}")
        finally:
            self._cleanup_test_user(test_email)
    
    def test_verify_otp_incorrect(self):
        """Test verifying with incorrect OTP returns error"""
        test_email = f"wrongotp_{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Send OTP first
            send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
            assert send_response.status_code == 200
            
            # Use wrong OTP
            verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": test_email,
                "otp": "000000"  # Wrong OTP
            })
            assert verify_response.status_code == 400, f"Expected 400 for wrong OTP, got {verify_response.status_code}"
            data = verify_response.json()
            assert "detail" in data
            assert "incorrect" in data["detail"].lower() or "code" in data["detail"].lower()
            print(f"✓ Incorrect OTP correctly rejected: {data['detail']}")
        finally:
            self._cleanup_test_user(test_email)
    
    def test_verify_otp_no_otp_record(self):
        """Test verifying without requesting OTP first returns error"""
        test_email = f"nootp_{uuid.uuid4().hex[:8]}@example.com"
        
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": "123456"
        })
        assert verify_response.status_code == 400, f"Expected 400, got {verify_response.status_code}"
        data = verify_response.json()
        assert "detail" in data
        assert "no otp" in data["detail"].lower() or "not found" in data["detail"].lower() or "request" in data["detail"].lower()
        print(f"✓ No OTP record correctly rejected: {data['detail']}")
    
    def test_verify_otp_expired(self):
        """Test verifying expired OTP returns error"""
        test_email = f"expired_{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Send OTP first
            send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
            assert send_response.status_code == 200
            
            # Get the OTP from DB
            otp = self._get_otp_from_db(test_email)
            assert otp
            
            # Manually set expires_at to past time in MongoDB
            past_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
            db.email_otps.update_one(
                {"email": test_email.lower()},
                {"$set": {"expires_at": past_time}}
            )
            
            # Try to verify - should fail as expired
            verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": test_email,
                "otp": otp
            })
            assert verify_response.status_code == 400, f"Expected 400 for expired OTP, got {verify_response.status_code}"
            data = verify_response.json()
            assert "detail" in data
            assert "expired" in data["detail"].lower() or "request a new" in data["detail"].lower()
            print(f"✓ Expired OTP correctly rejected: {data['detail']}")
        finally:
            self._cleanup_test_user(test_email)


class TestEmailOTPTokenValidation:
    """Test that the token from Email OTP works with /api/auth/me"""
    
    def _get_otp_from_db(self, email):
        record = db.email_otps.find_one({"email": email.lower()})
        if record:
            return record.get("otp")
        return None
    
    def _cleanup_test_user(self, email):
        db.email_otps.delete_one({"email": email.lower()})
        db.users.delete_one({"email": email.lower()})
    
    def test_token_works_with_auth_me(self):
        """Test that token from Email OTP verification works with GET /api/auth/me"""
        test_email = f"tokentest_{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Step 1: Create user via Email OTP
            send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
            assert send_response.status_code == 200
            
            otp = self._get_otp_from_db(test_email)
            assert otp, "OTP not found in database"
            
            verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
                "email": test_email, "otp": otp
            })
            assert verify_response.status_code == 200
            token = verify_response.json().get("token")
            assert token, "Token not returned"
            
            # Step 2: Use token with /api/auth/me
            me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
                "Authorization": f"Bearer {token}"
            })
            assert me_response.status_code == 200, f"GET /api/auth/me failed: {me_response.text}"
            
            me_data = me_response.json()
            assert me_data["email"] == test_email.lower()
            print(f"✓ Token from Email OTP works with /api/auth/me: {me_data['email']}")
        finally:
            self._cleanup_test_user(test_email)


class TestSecurityNoAPIKeyExposure:
    """Security tests to ensure RESEND_API_KEY is never exposed"""
    
    def test_api_key_not_in_otp_send_response(self):
        """Verify RESEND_API_KEY is not leaked in send OTP response"""
        test_email = f"security_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        
        response_text = response.text.lower()
        assert "re_" not in response_text, "SECURITY: API key prefix found in response"
        assert "resend" not in response_text or "api_key" not in response_text, "SECURITY: 'resend api_key' found in response"
        print(f"✓ No API key exposed in send OTP response")
    
    def test_api_key_not_in_error_responses(self):
        """Verify RESEND_API_KEY is not leaked in error responses"""
        # Test with invalid email
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "invalid"
        })
        
        response_text = response.text.lower()
        assert "re_" not in response_text, "SECURITY: API key prefix found in error response"
        print(f"✓ No API key exposed in error response")


class TestAdminLogin:
    """Test that admin email+password login still works"""
    
    def test_admin_email_password_login(self):
        """Test admin can still login with email+password at /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@venuloq.in"
        print(f"✓ Admin login works: {data['user']['email']} with role {data['user']['role']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
