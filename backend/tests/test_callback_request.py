"""
Test suite for callback-request API endpoint
Tests the new simplified callback request feature in VenuLoQ
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCallbackRequestAPI:
    """Test POST /api/callback-request endpoint"""
    
    def test_callback_request_success(self):
        """Test successful callback request submission"""
        payload = {
            "name": "Test User",
            "phone": "9876543210",
            "venue_id": "venue_test_123",
            "venue_name": "Test Venue",
            "venue_city": "Mumbai"
        }
        response = requests.post(f"{BASE_URL}/api/callback-request", json=payload)
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert "callback_id" in data
        assert data["callback_id"].startswith("cb_")
        assert "message" in data
        assert "30 minutes" in data["message"].lower() or "call you" in data["message"].lower()
        assert "rm_name" in data
        assert isinstance(data["rm_name"], str)
        assert len(data["rm_name"]) > 0
        print(f"SUCCESS: Callback created with ID {data['callback_id']}, RM: {data['rm_name']}")
    
    def test_callback_request_missing_name(self):
        """Test callback request without name"""
        payload = {
            "phone": "9876543210",
            "venue_id": "venue_test",
            "venue_name": "Test Venue"
        }
        response = requests.post(f"{BASE_URL}/api/callback-request", json=payload)
        
        # Should return 400 error
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Validation error returned for missing name")
    
    def test_callback_request_missing_phone(self):
        """Test callback request without phone"""
        payload = {
            "name": "Test User",
            "venue_id": "venue_test",
            "venue_name": "Test Venue"
        }
        response = requests.post(f"{BASE_URL}/api/callback-request", json=payload)
        
        # Should return 400 error
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Validation error returned for missing phone")
    
    def test_callback_request_empty_name(self):
        """Test callback request with empty name"""
        payload = {
            "name": "   ",
            "phone": "9876543210",
            "venue_id": "venue_test"
        }
        response = requests.post(f"{BASE_URL}/api/callback-request", json=payload)
        
        # Should return 400 error for empty name after trim
        assert response.status_code == 400
        print(f"SUCCESS: Validation error returned for empty name")
    
    def test_callback_request_minimal_payload(self):
        """Test callback request with only name and phone (minimal required fields)"""
        payload = {
            "name": "Minimal Test",
            "phone": "1234567890"
        }
        response = requests.post(f"{BASE_URL}/api/callback-request", json=payload)
        
        # Should succeed - venue fields are optional
        assert response.status_code == 200
        data = response.json()
        assert "callback_id" in data
        assert "rm_name" in data
        print(f"SUCCESS: Minimal callback created with ID {data['callback_id']}")


class TestVenueDetailPage:
    """Test venue detail page API"""
    
    def test_venue_detail_api(self):
        """Test GET /api/venues/city/{city}/{slug}"""
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai/taj-mahal-palace-mumbai")
        
        # Should return venue data
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "city" in data
        assert "pricing" in data
        print(f"SUCCESS: Venue detail fetched - {data.get('name')}")
    
    def test_venue_list_api(self):
        """Test GET /api/venues (search endpoint)"""
        response = requests.get(f"{BASE_URL}/api/venues?city=mumbai&limit=5")
        
        # Should return venues list (returns list directly, not wrapped)
        assert response.status_code == 200
        data = response.json()
        # API returns list directly
        assert isinstance(data, list)
        assert len(data) > 0
        # Each venue should have name, city
        if len(data) > 0:
            assert "name" in data[0]
            assert "city" in data[0]
        print(f"SUCCESS: Venue list fetched - {len(data)} venues")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
