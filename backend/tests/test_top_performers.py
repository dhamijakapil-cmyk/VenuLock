"""
Test suite for Top Performers endpoint.
Tests the /api/rms/top-performers endpoint which returns top 3 RMs ranked by events closed.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTopPerformersEndpoint:
    """Test /api/rms/top-performers endpoint"""
    
    def test_top_performers_returns_200(self):
        """Test endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_top_performers_returns_array(self):
        """Test endpoint returns an array"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_top_performers_returns_max_3(self):
        """Test endpoint returns at most 3 RMs"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3, f"Expected at most 3 RMs, got {len(data)}"
    
    def test_top_performers_sorted_by_events_closed_descending(self):
        """Test RMs are sorted by events_closed in descending order"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) >= 2:
            for i in range(len(data) - 1):
                assert data[i]['events_closed'] >= data[i+1]['events_closed'], \
                    f"RMs not sorted correctly: {data[i]['name']} ({data[i]['events_closed']}) should be >= {data[i+1]['name']} ({data[i+1]['events_closed']})"
    
    def test_top_performers_has_required_fields(self):
        """Test each RM has all required fields for display"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ['user_id', 'name', 'picture', 'rating', 'events_closed', 'total_leads', 'languages']
        
        for idx, rm in enumerate(data):
            for field in required_fields:
                assert field in rm, f"RM at index {idx} ({rm.get('name', 'unknown')}) missing field: {field}"
    
    def test_top_performers_events_closed_not_negative(self):
        """Test events_closed is never negative"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        for rm in data:
            assert rm['events_closed'] >= 0, f"{rm['name']} has negative events_closed: {rm['events_closed']}"
    
    def test_top_performers_languages_is_array(self):
        """Test languages field is an array"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        for rm in data:
            assert isinstance(rm.get('languages', []), list), f"{rm['name']} languages is not a list"
    
    def test_top_performers_rating_valid_range(self):
        """Test rating is within valid range (0-5)"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        for rm in data:
            rating = rm.get('rating', 0)
            assert 0 <= rating <= 5, f"{rm['name']} has invalid rating: {rating}"
    
    def test_top_performers_excludes_test_rms(self):
        """Test that Test RMs are excluded"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        for rm in data:
            assert not rm['name'].lower().startswith('test'), f"Test RM found in results: {rm['name']}"
    
    def test_top_performers_expected_data_order(self):
        """Test expected RMs are returned in correct order based on known data:
        Rahul Sharma (4 events), Amit Kumar (2), Priya Singh (1)"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200
        data = response.json()
        
        # Verify we got 3 performers
        assert len(data) == 3, f"Expected 3 performers, got {len(data)}"
        
        # Verify first place
        assert data[0]['name'] == 'Rahul Sharma', f"Expected Rahul Sharma in 1st, got {data[0]['name']}"
        assert data[0]['events_closed'] == 4, f"Expected 4 events closed for 1st place, got {data[0]['events_closed']}"
        
        # Verify second place
        assert data[1]['name'] == 'Amit Kumar', f"Expected Amit Kumar in 2nd, got {data[1]['name']}"
        assert data[1]['events_closed'] == 2, f"Expected 2 events closed for 2nd place, got {data[1]['events_closed']}"
        
        # Verify third place
        assert data[2]['name'] == 'Priya Singh', f"Expected Priya Singh in 3rd, got {data[2]['name']}"
        assert data[2]['events_closed'] == 1, f"Expected 1 event closed for 3rd place, got {data[2]['events_closed']}"
    
    def test_top_performers_limit_parameter(self):
        """Test limit query parameter works"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1, f"Expected 1 RM with limit=1, got {len(data)}"
        
        response = requests.get(f"{BASE_URL}/api/rms/top-performers?limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2, f"Expected 2 RMs with limit=2, got {len(data)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
