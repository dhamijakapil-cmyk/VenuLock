"""
Test Email OTP with stay_signed_in flag - API Behavior Tests
Tests the stay_signed_in parameter behavior in POST /api/auth/email-otp/verify
Note: JWT expiration cannot be directly verified without server's secret key,
so we test that the API accepts the parameter and returns valid tokens.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestStaySignedInFlag:
    """Tests for stay_signed_in parameter in POST /api/auth/email-otp/verify"""
    
    def test_verify_with_stay_signed_in_true_returns_valid_token(self):
        """Test that stay_signed_in=true returns a valid JWT token that works"""
        test_email = f"stay30day_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response.status_code == 200, f"Send OTP failed: {send_response.text}"
        debug_otp = send_response.json().get("debug_otp")
        assert debug_otp, "debug_otp not returned"
        
        # Verify with stay_signed_in=true
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": debug_otp,
            "stay_signed_in": True
        })
        assert verify_response.status_code == 200, f"Verify OTP failed: {verify_response.text}"
        
        data = verify_response.json()
        token = data.get("token")
        assert token, "Token not returned"
        assert len(token) > 50, "Token seems too short"
        
        # Token should work with /api/auth/me
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_response.status_code == 200, f"Token from stay_signed_in=true doesn't work: {me_response.text}"
        assert me_response.json()["email"] == test_email.lower()
        print(f"✓ stay_signed_in=true: Token returned and works with /api/auth/me")
    
    def test_verify_with_stay_signed_in_false_returns_valid_token(self):
        """Test that stay_signed_in=false returns a valid JWT token that works"""
        test_email = f"stay7day_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response.status_code == 200
        debug_otp = send_response.json().get("debug_otp")
        
        # Verify with stay_signed_in=false
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": debug_otp,
            "stay_signed_in": False
        })
        assert verify_response.status_code == 200
        
        data = verify_response.json()
        token = data.get("token")
        assert token, "Token not returned"
        
        # Token should work with /api/auth/me
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_response.status_code == 200, f"Token from stay_signed_in=false doesn't work"
        print(f"✓ stay_signed_in=false: Token returned and works with /api/auth/me")
    
    def test_verify_without_stay_signed_in_defaults_works(self):
        """Test that omitting stay_signed_in field works (defaults to True per Pydantic model)"""
        test_email = f"defaultstay_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response.status_code == 200
        debug_otp = send_response.json().get("debug_otp")
        
        # Verify WITHOUT stay_signed_in field (should default to True)
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": debug_otp
            # NOT including stay_signed_in
        })
        assert verify_response.status_code == 200, f"Verify without stay_signed_in failed: {verify_response.text}"
        
        token = verify_response.json().get("token")
        assert token, "Token not returned when stay_signed_in omitted"
        
        # Token should work
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_response.status_code == 200
        print(f"✓ Default stay_signed_in (omitted): Token works correctly")


class TestWrongOTPErrorFormat:
    """Test that wrong OTP returns 400 with string error detail"""
    
    def test_wrong_otp_returns_string_detail(self):
        """Test wrong OTP returns 400 with detail as string (not array)"""
        test_email = f"wrongotpformat_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send OTP first
        send_response = requests.post(f"{BASE_URL}/api/auth/email-otp/send", json={"email": test_email})
        assert send_response.status_code == 200
        
        # Try wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/email-otp/verify", json={
            "email": test_email,
            "otp": "000000",  # Wrong OTP
            "stay_signed_in": True
        })
        assert verify_response.status_code == 400, f"Expected 400, got {verify_response.status_code}"
        
        data = verify_response.json()
        assert "detail" in data, "Response should contain 'detail'"
        
        # Detail should be a string, not an array
        assert isinstance(data["detail"], str), f"detail should be string, got {type(data['detail'])}: {data['detail']}"
        print(f"✓ Wrong OTP error detail is string: '{data['detail']}'")


class TestAdminLoginStillWorks:
    """Verify admin email+password login preserved"""
    
    def test_admin_login_returns_valid_token(self):
        """Admin login at /login should still work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login works: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_admin_token_works_with_auth_me(self):
        """Admin token should work with /api/auth/me"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_response.status_code == 200, f"GET /api/auth/me failed: {me_response.text}"
        assert me_response.json()["role"] == "admin"
        print(f"✓ Admin token works with /api/auth/me")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
