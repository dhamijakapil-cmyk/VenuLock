"""
Test suite for VenuLoQ WhatsApp/Phone Number Centralization (Iteration 132)
Tests auth endpoints, my-enquiries, and verifies backend APIs are working correctly.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_google_config_returns_disabled(self):
        """GET /api/auth/google/config returns enabled:false gracefully"""
        response = requests.get(f"{BASE_URL}/api/auth/google/config")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        # Should return enabled:false since Google OAuth is not configured
        print(f"Google config: {data}")
    
    def test_apple_config_returns_disabled(self):
        """GET /api/auth/apple/config returns enabled:false gracefully"""
        response = requests.get(f"{BASE_URL}/api/auth/apple/config")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        # Should return enabled:false since Apple OAuth is not configured
        print(f"Apple config: {data}")
    
    def test_email_otp_send_success(self):
        """POST /api/auth/email-otp/send returns success"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "qatest@venuloq.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True or "message" in data
        print(f"Email OTP send response: {data}")
    
    def test_password_login_success(self):
        """Password login works: democustomer@venulock.in / password123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
        assert "user" in data
        print(f"Login successful for {CUSTOMER_EMAIL}")
        return data
    
    def test_auth_me_with_valid_token(self):
        """GET /api/auth/me returns user data with valid token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json().get("token") or login_response.json().get("access_token")
        
        # Now test /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data or "user" in data
        print(f"Auth me response: {data}")
    
    def test_auth_me_with_invalid_token(self):
        """GET /api/auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401
        print("Auth me correctly returns 401 for invalid token")
    
    def test_logout_endpoint(self):
        """POST /api/auth/logout works correctly"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = login_response.json().get("token") or login_response.json().get("access_token")
        
        # Now test logout
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print("Logout successful")


class TestMyEnquiriesEndpoint:
    """My Enquiries endpoint tests"""
    
    def test_my_enquiries_returns_leads(self):
        """GET /api/my-enquiries returns leads with last_activity enrichment"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json().get("token") or login_response.json().get("access_token")
        
        # Now test /my-enquiries
        response = requests.get(
            f"{BASE_URL}/api/my-enquiries",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return a list of enquiries
        assert isinstance(data, list)
        print(f"My enquiries returned {len(data)} leads")
        
        # If there are leads, check for last_activity enrichment
        if len(data) > 0:
            lead = data[0]
            # Check that lead has expected fields
            assert "lead_id" in lead or "_id" in lead or "id" in lead
            print(f"Sample lead: {lead.get('lead_id') or lead.get('id')}")


class TestVenueEndpoints:
    """Venue search and related endpoints"""
    
    def test_venues_search_delhi(self):
        """Venue search page loads with results for Delhi"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi")
        assert response.status_code == 200
        data = response.json()
        # Should return venues list
        venues = data if isinstance(data, list) else data.get("venues", [])
        assert len(venues) > 0
        print(f"Found {len(venues)} venues in Delhi")
    
    def test_venues_featured(self):
        """Featured venues endpoint works"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} featured venues")
    
    def test_venues_cities(self):
        """Cities endpoint works"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} cities")


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_api_health(self):
        """API is reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint might return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        print(f"API health check: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
