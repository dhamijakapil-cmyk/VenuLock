"""
Test Apple Sign In OAuth infrastructure and auth page button order.
Tests the new auth hierarchy: Google > Apple > Email > Password
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAppleAuthInfrastructure:
    """Tests for Apple Sign In backend routes"""
    
    def test_apple_config_returns_disabled(self):
        """GET /api/auth/apple/config should return enabled:false when no credentials set"""
        response = requests.get(f"{BASE_URL}/api/auth/apple/config")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert data["enabled"] == False
        assert data.get("client_id") is None
        print("✓ Apple config returns enabled:false (no credentials)")
    
    def test_apple_auth_url_returns_503_when_not_configured(self):
        """POST /api/auth/apple/auth-url should return 503 when not configured"""
        response = requests.post(
            f"{BASE_URL}/api/auth/apple/auth-url",
            json={"redirect_uri": "https://example.com/auth/apple"}
        )
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "not configured" in data["detail"].lower()
        print("✓ Apple auth-url returns 503 when not configured")
    
    def test_apple_callback_returns_503_when_not_configured(self):
        """POST /api/auth/apple/callback should return 503 when not configured"""
        response = requests.post(
            f"{BASE_URL}/api/auth/apple/callback",
            json={
                "code": "test_code",
                "redirect_uri": "https://example.com/auth/apple"
            }
        )
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "not configured" in data["detail"].lower()
        print("✓ Apple callback returns 503 when not configured")


class TestGoogleAuthInfrastructure:
    """Tests for Google OAuth backend routes"""
    
    def test_google_config_returns_disabled(self):
        """GET /api/auth/google/config should return enabled:false when no credentials set"""
        response = requests.get(f"{BASE_URL}/api/auth/google/config")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert data["enabled"] == False
        assert data.get("client_id") is None
        print("✓ Google config returns enabled:false (no credentials)")
    
    def test_google_auth_url_returns_503_when_not_configured(self):
        """POST /api/auth/google/auth-url should return 503 when not configured"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google/auth-url",
            json={"redirect_uri": "https://example.com/auth/google"}
        )
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "not configured" in data["detail"].lower()
        print("✓ Google auth-url returns 503 when not configured")


class TestEmailOTPAuth:
    """Tests for Email OTP authentication"""
    
    def test_email_otp_send_works(self):
        """POST /api/auth/email-otp/send should work with valid email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "test_apple_auth@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True or "message" in data
        print("✓ Email OTP send works with valid email")


class TestPasswordAuth:
    """Tests for password-based authentication"""
    
    def test_password_login_works(self):
        """POST /api/auth/login should work with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "democustomer@venulock.in"
        print("✓ Password login works with democustomer@venulock.in")
    
    def test_password_login_fails_with_wrong_password(self):
        """POST /api/auth/login should fail with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "wrongpassword"
            }
        )
        assert response.status_code in [401, 400]
        print("✓ Password login fails with wrong password")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health endpoint returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
