"""
Test Auth APIs for Phase 1 UX Overhaul - Testing login credentials.
Tests: Admin, RM, Customer, Venue Owner logins
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLoginFlows:
    """Authentication login tests for all roles"""
    
    def test_admin_login(self):
        """Test Admin login: admin@venuloq.in / admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        print(f"Admin login response: {response.status_code}")
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User data missing from response"
        assert data["user"]["email"] == "admin@venuloq.in"
        assert data["user"]["role"] == "admin"
        print(f"Admin login SUCCESS: {data['user']['name']} ({data['user']['role']})")
    
    def test_rm_login(self):
        """Test RM login: rm1@venuloq.in / rm123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venuloq.in",
            "password": "rm123"
        })
        print(f"RM login response: {response.status_code}")
        
        assert response.status_code == 200, f"RM login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User data missing from response"
        assert data["user"]["email"] == "rm1@venuloq.in"
        assert data["user"]["role"] == "rm"
        print(f"RM login SUCCESS: {data['user']['name']} ({data['user']['role']})")
    
    def test_customer_login(self):
        """Test Customer login: democustomer@venuloq.in / password123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "democustomer@venuloq.in",
            "password": "password123"
        })
        print(f"Customer login response: {response.status_code}")
        
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User data missing from response"
        assert data["user"]["email"] == "democustomer@venuloq.in"
        assert data["user"]["role"] == "customer"
        print(f"Customer login SUCCESS: {data['user']['name']} ({data['user']['role']})")
    
    def test_venue_owner_login(self):
        """Test Venue Owner login: venue@venuloq.in / venue123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "venue@venuloq.in",
            "password": "venue123"
        })
        print(f"Venue Owner login response: {response.status_code}")
        
        assert response.status_code == 200, f"Venue Owner login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User data missing from response"
        assert data["user"]["email"] == "venue@venuloq.in"
        assert data["user"]["role"] == "venue_owner"
        print(f"Venue Owner login SUCCESS: {data['user']['name']} ({data['user']['role']})")
    
    def test_invalid_login(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        print(f"Invalid login response: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid login correctly returns 401")


class TestVenueEndpoints:
    """Test venue-related endpoints for search page"""
    
    def test_venues_endpoint(self):
        """Test /api/venues returns venues list"""
        response = requests.get(f"{BASE_URL}/api/venues")
        print(f"Venues endpoint response: {response.status_code}")
        
        assert response.status_code == 200, f"Venues endpoint failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of venues"
        print(f"Venues endpoint SUCCESS: {len(data)} venues returned")
    
    def test_venues_search_with_city(self):
        """Test /api/venues with city filter"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Mumbai")
        print(f"Venues search with city response: {response.status_code}")
        
        assert response.status_code == 200, f"Venues search failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of venues"
        print(f"Venues search SUCCESS: {len(data)} venues in Mumbai")
    
    def test_cities_endpoint(self):
        """Test /api/venues/cities returns cities list"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        print(f"Cities endpoint response: {response.status_code}")
        
        assert response.status_code == 200, f"Cities endpoint failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of cities"
        print(f"Cities endpoint SUCCESS: {len(data)} cities returned")


class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def rm_token(self):
        """Get RM auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venuloq.in",
            "password": "rm123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("RM login failed")
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test /api/admin/stats with admin token"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        print(f"Admin stats response: {response.status_code}")
        
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        print("Admin stats endpoint SUCCESS")
    
    def test_rm_leads_endpoint(self, rm_token):
        """Test /api/leads with RM token"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        print(f"RM leads response: {response.status_code}")
        
        assert response.status_code == 200, f"RM leads failed: {response.text}"
        data = response.json()
        assert "leads" in data, "Expected leads key in response"
        print(f"RM leads endpoint SUCCESS: {len(data.get('leads', []))} leads")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
