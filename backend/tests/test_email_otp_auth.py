"""
Test Email OTP Authentication Endpoints
Tests for POST /api/auth/email-otp/send and POST /api/auth/email-otp/verify
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailOTPSend:
    """Tests for POST /api/auth/email-otp/send endpoint"""
    
    def test_send_otp_success(self):
        """Test sending OTP to a valid email returns success and debug_otp"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "email" in data, "Response should contain 'email'"
        assert data["email"] == test_email.lower(), f"Email should be {test_email.lower()}, got {data['email']}"
        # Since Resend API is not configured, debug_otp should be returned
        assert "debug_otp" in data, "Response should contain 'debug_otp' when Resend not configured"
        assert len(data["debug_otp"]) == 6, "OTP should be 6 digits"
        print(f"✓ OTP sent successfully to {test_email}, debug_otp: {data['debug_otp']}")
    
    def test_send_otp_invalid_email(self):
        """Test sending OTP to an invalid email rejects the request"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": "not-a-valid-email"
        })
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print(f"✓ Invalid email correctly rejected with 422")
    
    def test_send_otp_empty_email(self):
        """Test sending OTP with empty email rejects the request"""
        response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": ""
        })
        assert response.status_code == 422, f"Expected 422 for empty email, got {response.status_code}"
        print(f"✓ Empty email correctly rejected with 422")


class TestEmailOTPVerify:
    """Tests for POST /api/auth/email-otp/verify endpoint"""
    
    def test_verify_otp_success_new_user(self):
        """Test verifying OTP for new user creates account and returns token"""
        # Step 1: Send OTP to a unique new email
        test_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={
            "email": test_email
        })
        assert send_response.status_code == 200, f"Send OTP failed: {send_response.text}"
        debug_otp = send_response.json().get("debug_otp")
        assert debug_otp, "debug_otp not returned for verification"
        
        # Step 2: Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": debug_otp
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
    
    def test_verify_otp_success_existing_user(self):
        """Test verifying OTP for existing user logs them in"""
        # Step 1: Create a user first by verifying
        test_email = f"existinguser_{uuid.uuid4().hex[:8]}@example.com"
        send_response1 = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response1.status_code == 200
        debug_otp1 = send_response1.json().get("debug_otp")
        
        verify_response1 = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email, "otp": debug_otp1
        })
        assert verify_response1.status_code == 200
        assert verify_response1.json().get("is_new_user") is True
        
        # Step 2: Send OTP again for the same email
        send_response2 = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response2.status_code == 200
        debug_otp2 = send_response2.json().get("debug_otp")
        
        # Step 3: Verify again - should be existing user
        verify_response2 = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email, "otp": debug_otp2
        })
        assert verify_response2.status_code == 200
        data = verify_response2.json()
        assert data["is_new_user"] is False, "is_new_user should be False for existing user"
        assert "token" in data
        print(f"✓ Existing user logged in via Email OTP: {data['user']['email']}")
    
    def test_verify_otp_wrong_otp(self):
        """Test verifying with wrong OTP returns error"""
        test_email = f"wrongotp_{uuid.uuid4().hex[:8]}@example.com"
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
        assert "invalid" in data["detail"].lower() or "otp" in data["detail"].lower()
        print(f"✓ Wrong OTP correctly rejected: {data['detail']}")
    
    def test_verify_otp_no_otp_requested(self):
        """Test verifying without requesting OTP first returns error"""
        test_email = f"nootp_{uuid.uuid4().hex[:8]}@example.com"
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": "123456"
        })
        assert verify_response.status_code == 400, f"Expected 400, got {verify_response.status_code}"
        data = verify_response.json()
        assert "detail" in data
        assert "no otp" in data["detail"].lower() or "not found" in data["detail"].lower()
        print(f"✓ No OTP requested correctly rejected: {data['detail']}")


class TestEmailOTPTokenValidation:
    """Test that the token from Email OTP works with /api/auth/me"""
    
    def test_token_works_with_auth_me(self):
        """Test that token from Email OTP verification works with GET /api/auth/me"""
        # Step 1: Create user via Email OTP
        test_email = f"tokentest_{uuid.uuid4().hex[:8]}@example.com"
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response.status_code == 200
        debug_otp = send_response.json().get("debug_otp")
        
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email, "otp": debug_otp
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
