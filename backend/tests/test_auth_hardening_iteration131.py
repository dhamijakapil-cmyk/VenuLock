"""
Test suite for VenuLoQ Auth Hardening & Launch Readiness (Iteration 131)
Tests:
- Auth page loads correctly (Google visible, Apple HIDDEN on web, Email visible, Password link visible)
- Password login works: democustomer@venulock.in / password123 -> lands on /my-enquiries
- Email OTP send works: POST /api/auth/email-otp/send returns success
- Backend /api/auth/google/config returns enabled:false gracefully
- Backend /api/auth/apple/config returns enabled:false gracefully
- Backend /api/auth/me returns user data with valid token
- Backend /api/auth/me returns 401 with invalid/expired token
- Backend GET /api/my-enquiries returns leads with last_activity enrichment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthConfig:
    """Test OAuth configuration endpoints"""
    
    def test_google_config_returns_disabled(self):
        """GET /api/auth/google/config returns enabled:false gracefully"""
        response = requests.get(f"{BASE_URL}/api/auth/google/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "enabled" in data, "Response should have 'enabled' field"
        # Google OAuth is not configured, so should be disabled
        assert data["enabled"] == False, "Google OAuth should be disabled (no credentials)"
        print(f"PASS: Google config returns enabled={data['enabled']}")
    
    def test_apple_config_returns_disabled(self):
        """GET /api/auth/apple/config returns enabled:false gracefully"""
        response = requests.get(f"{BASE_URL}/api/auth/apple/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "enabled" in data, "Response should have 'enabled' field"
        # Apple Sign In is not configured, so should be disabled
        assert data["enabled"] == False, "Apple Sign In should be disabled (no credentials)"
        print(f"PASS: Apple config returns enabled={data['enabled']}")


class TestEmailOTPFlow:
    """Test Email OTP authentication flow"""
    
    def test_email_otp_send_success(self):
        """POST /api/auth/email-otp/send returns success"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "test_otp_user@example.com"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data or "success" in data or "debug_otp" in data, "Response should indicate success"
        print(f"PASS: Email OTP send works - response: {data}")


class TestPasswordLogin:
    """Test password-based authentication"""
    
    def test_password_login_success(self):
        """Password login works: democustomer@venulock.in / password123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should have 'token' field"
        assert "user" in data, "Response should have 'user' field"
        assert data["user"]["email"] == "democustomer@venulock.in", "User email should match"
        assert data["user"]["role"] == "customer", "User role should be 'customer'"
        print(f"PASS: Password login works - user: {data['user']['email']}, role: {data['user']['role']}")
        return data["token"]
    
    def test_password_login_invalid_credentials(self):
        """Password login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@example.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code in [401, 400], f"Expected 401 or 400, got {response.status_code}"
        print(f"PASS: Invalid credentials return {response.status_code}")


class TestAuthMe:
    """Test /auth/me endpoint with valid and invalid tokens"""
    
    @pytest.fixture
    def valid_token(self):
        """Get a valid token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get valid token for testing")
    
    def test_auth_me_with_valid_token(self, valid_token):
        """GET /api/auth/me returns user data with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "email" in data, "Response should have 'email' field"
        assert "user_id" in data, "Response should have 'user_id' field"
        assert "role" in data, "Response should have 'role' field"
        print(f"PASS: /auth/me returns user data - email: {data['email']}, role: {data['role']}")
    
    def test_auth_me_with_invalid_token(self):
        """GET /api/auth/me returns 401 with invalid/expired token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: /auth/me returns 401 with invalid token")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: /auth/me returns 401 without token")


class TestMyEnquiries:
    """Test /my-enquiries endpoint with last_activity enrichment"""
    
    @pytest.fixture
    def customer_token(self):
        """Get a customer token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get customer token for testing")
    
    def test_my_enquiries_returns_leads(self, customer_token):
        """GET /api/my-enquiries returns leads list"""
        response = requests.get(
            f"{BASE_URL}/api/my-enquiries",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: /my-enquiries returns {len(data)} leads")
        
        # If there are leads, check for last_activity enrichment
        if len(data) > 0:
            lead = data[0]
            assert "lead_id" in lead, "Lead should have 'lead_id' field"
            # last_activity may or may not be present depending on lead history
            if "last_activity" in lead and lead["last_activity"]:
                assert "message" in lead["last_activity"], "last_activity should have 'message'"
                assert "at" in lead["last_activity"], "last_activity should have 'at'"
                print(f"PASS: Lead has last_activity enrichment: {lead['last_activity']['message']}")
            else:
                print(f"INFO: Lead has no last_activity (may be new lead)")
    
    def test_my_enquiries_requires_auth(self):
        """GET /api/my-enquiries returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/my-enquiries")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: /my-enquiries requires authentication")


class TestLogout:
    """Test logout functionality"""
    
    @pytest.fixture
    def customer_token(self):
        """Get a customer token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get customer token for testing")
    
    def test_logout_endpoint(self, customer_token):
        """POST /api/auth/logout works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Logout should succeed (200) or be accepted (204)
        assert response.status_code in [200, 204], f"Expected 200 or 204, got {response.status_code}"
        print(f"PASS: Logout endpoint returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
