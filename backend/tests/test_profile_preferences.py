"""
Test Profile Preferences API - Phase 1 Customer Interface
Tests GET /api/auth/profile and PUT /api/auth/profile for event preferences
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"


class TestProfilePreferencesAPI:
    """Test profile preferences endpoints for customer interface"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_login_returns_user_data(self):
        """Test that login returns user data with expected fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == CUSTOMER_EMAIL
        assert data["user"]["role"] == "customer"
        print(f"✓ Login successful for {CUSTOMER_EMAIL}")
    
    def test_02_get_profile_returns_preferences_fields(self):
        """Test GET /api/auth/profile returns profile with preference fields"""
        response = requests.get(f"{BASE_URL}/api/auth/profile", headers=self.headers)
        assert response.status_code == 200, f"GET profile failed: {response.text}"
        profile = response.json()
        
        # Check basic fields exist
        assert "user_id" in profile
        assert "email" in profile
        assert "name" in profile
        
        # Preference fields may or may not exist initially, but endpoint should work
        print(f"✓ GET /api/auth/profile returned profile for {profile.get('email')}")
        print(f"  - preferred_cities: {profile.get('preferred_cities', 'not set')}")
        print(f"  - preferred_event_types: {profile.get('preferred_event_types', 'not set')}")
        print(f"  - budget_range: {profile.get('budget_range', 'not set')}")
        print(f"  - notifications_enabled: {profile.get('notifications_enabled', 'not set')}")
    
    def test_03_update_profile_preferred_cities(self):
        """Test PUT /api/auth/profile updates preferred_cities"""
        test_cities = ["Delhi", "Mumbai", "Bangalore"]
        response = requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=self.headers,
            json={"preferred_cities": test_cities}
        )
        assert response.status_code == 200, f"PUT profile failed: {response.text}"
        updated = response.json()
        assert updated.get("preferred_cities") == test_cities
        print(f"✓ Updated preferred_cities to {test_cities}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=self.headers)
        assert get_response.status_code == 200
        profile = get_response.json()
        assert profile.get("preferred_cities") == test_cities
        print(f"✓ Verified preferred_cities persisted correctly")
    
    def test_04_update_profile_preferred_event_types(self):
        """Test PUT /api/auth/profile updates preferred_event_types"""
        test_event_types = ["Wedding", "Birthday", "Corporate Event"]
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json={"preferred_event_types": test_event_types}
        )
        assert response.status_code == 200, f"PUT profile failed: {response.text}"
        updated = response.json()
        assert updated.get("preferred_event_types") == test_event_types
        print(f"✓ Updated preferred_event_types to {test_event_types}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=self.headers)
        assert get_response.status_code == 200
        profile = get_response.json()
        assert profile.get("preferred_event_types") == test_event_types
        print(f"✓ Verified preferred_event_types persisted correctly")
    
    def test_05_update_profile_budget_range(self):
        """Test PUT /api/auth/profile updates budget_range"""
        test_budget = "3L - 5L"
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json={"budget_range": test_budget}
        )
        assert response.status_code == 200, f"PUT profile failed: {response.text}"
        updated = response.json()
        assert updated.get("budget_range") == test_budget
        print(f"✓ Updated budget_range to {test_budget}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=self.headers)
        assert get_response.status_code == 200
        profile = get_response.json()
        assert profile.get("budget_range") == test_budget
        print(f"✓ Verified budget_range persisted correctly")
    
    def test_06_update_profile_notifications_enabled(self):
        """Test PUT /api/auth/profile updates notifications_enabled"""
        # Test setting to False
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json={"notifications_enabled": False}
        )
        assert response.status_code == 200, f"PUT profile failed: {response.text}"
        updated = response.json()
        assert updated.get("notifications_enabled") == False
        print(f"✓ Updated notifications_enabled to False")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=self.headers)
        assert get_response.status_code == 200
        profile = get_response.json()
        assert profile.get("notifications_enabled") == False
        print(f"✓ Verified notifications_enabled=False persisted correctly")
        
        # Test setting back to True
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json={"notifications_enabled": True}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("notifications_enabled") == True
        print(f"✓ Updated notifications_enabled back to True")
    
    def test_07_update_profile_all_preferences_at_once(self):
        """Test PUT /api/auth/profile updates all preferences in one request"""
        test_data = {
            "name": "Test Customer",
            "phone": "+91 98765 43210",
            "preferred_cities": ["Hyderabad", "Chennai"],
            "preferred_event_types": ["Engagement", "Reception"],
            "budget_range": "5L - 10L",
            "notifications_enabled": True
        }
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json=test_data
        )
        assert response.status_code == 200, f"PUT profile failed: {response.text}"
        updated = response.json()
        
        assert updated.get("name") == test_data["name"]
        assert updated.get("phone") == test_data["phone"]
        assert updated.get("preferred_cities") == test_data["preferred_cities"]
        assert updated.get("preferred_event_types") == test_data["preferred_event_types"]
        assert updated.get("budget_range") == test_data["budget_range"]
        assert updated.get("notifications_enabled") == test_data["notifications_enabled"]
        print(f"✓ Updated all preferences in one request")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=self.headers)
        assert get_response.status_code == 200
        profile = get_response.json()
        assert profile.get("preferred_cities") == test_data["preferred_cities"]
        assert profile.get("preferred_event_types") == test_data["preferred_event_types"]
        assert profile.get("budget_range") == test_data["budget_range"]
        print(f"✓ Verified all preferences persisted correctly")
    
    def test_08_update_profile_empty_arrays(self):
        """Test PUT /api/auth/profile can clear arrays"""
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json={
                "preferred_cities": [],
                "preferred_event_types": []
            }
        )
        assert response.status_code == 200, f"PUT profile failed: {response.text}"
        updated = response.json()
        assert updated.get("preferred_cities") == []
        assert updated.get("preferred_event_types") == []
        print(f"✓ Cleared preferred_cities and preferred_event_types to empty arrays")
    
    def test_09_update_profile_no_fields_returns_error(self):
        """Test PUT /api/auth/profile with no fields returns 400"""
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers=self.headers,
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Empty update correctly returns 400 error")
    
    def test_10_get_profile_without_auth_returns_401(self):
        """Test GET /api/auth/profile without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/profile")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/auth/profile without auth correctly returns {response.status_code}")
    
    def test_11_put_profile_without_auth_returns_401(self):
        """Test PUT /api/auth/profile without auth returns 401"""
        response = requests.put(f"{BASE_URL}/api/auth/profile", json={"name": "Test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ PUT /api/auth/profile without auth correctly returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
