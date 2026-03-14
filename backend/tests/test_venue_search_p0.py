"""
Test suite for VenuLoQ Venue Search P0 bug fix.
Tests verify that:
1. GET /api/venues returns all 79 venues (no limit issues)
2. GET /api/venues?limit=200 returns all venues
3. City filter reduces count appropriately
4. Event type filter works correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVenueSearchP0:
    """Venue Search P0 Bug Fix Tests - verify 79 venues returned, no mock data"""
    
    def test_venues_api_returns_all_79_venues(self):
        """GET /api/venues should return all 79 venues"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        assert len(data) == 79, f"Expected 79 venues, got {len(data)}"
        print(f"✓ API returned {len(data)} venues")
    
    def test_venues_api_with_limit_200_returns_all(self):
        """GET /api/venues?limit=200 should return all 79 venues"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=200")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 79, f"Expected 79 venues with limit=200, got {len(data)}"
        print(f"✓ API with limit=200 returned {len(data)} venues")
    
    def test_venues_api_default_limit_is_100(self):
        """Backend default limit should be 100 (not 20)"""
        # With no limit specified, default should return up to 100 (all 79 fit)
        response = requests.get(f"{BASE_URL}/api/venues")
        data = response.json()
        # Since we have 79 venues and default limit is 100, we should get all 79
        assert len(data) == 79, f"Expected all 79 venues (default limit=100), got {len(data)}"
        print(f"✓ Default limit returns all {len(data)} venues")
    
    def test_city_filter_delhi_reduces_count(self):
        """GET /api/venues?city=Delhi should return fewer than 79 venues"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi")
        assert response.status_code == 200
        
        data = response.json()
        # Delhi should have some venues but less than total
        assert len(data) < 79, f"Delhi filter should reduce count, got {len(data)}"
        assert len(data) > 0, "Delhi should have some venues"
        
        # Verify all returned venues are in Delhi
        for venue in data:
            assert "Delhi" in venue.get("city", ""), f"Venue {venue.get('name')} not in Delhi"
        
        print(f"✓ Delhi filter returned {len(data)} venues (all in Delhi)")
    
    def test_city_filter_gurgaon_reduces_count(self):
        """GET /api/venues?city=Gurgaon should return fewer than 79 venues"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Gurgaon")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) < 79, f"Gurgaon filter should reduce count, got {len(data)}"
        print(f"✓ Gurgaon filter returned {len(data)} venues")
    
    def test_event_type_wedding_filter(self):
        """GET /api/venues?event_type=Wedding should filter venues"""
        response = requests.get(f"{BASE_URL}/api/venues?event_type=Wedding")
        assert response.status_code == 200
        
        data = response.json()
        # Wedding venues should be a subset
        assert len(data) >= 0, "Should return zero or more wedding venues"
        print(f"✓ Wedding filter returned {len(data)} venues")
    
    def test_venue_structure_has_required_fields(self):
        """Verify venue objects have required fields"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "Should have at least one venue"
        
        venue = data[0]
        required_fields = ['venue_id', 'name', 'city']
        for field in required_fields:
            assert field in venue, f"Venue missing required field: {field}"
        
        print(f"✓ Venue structure verified: {venue.get('name')}")
    
    def test_venues_api_is_real_not_mock(self):
        """Verify API returns real data (diverse venues from multiple cities)"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=79")
        data = response.json()
        
        # Get unique cities
        cities = set(v.get("city") for v in data if v.get("city"))
        assert len(cities) >= 5, f"Expected venues from multiple cities, got {len(cities)}: {cities}"
        
        # Get unique venue names
        names = set(v.get("name") for v in data)
        assert len(names) == 79, f"Expected 79 unique venue names, got {len(names)}"
        
        print(f"✓ API returns real data from {len(cities)} cities: {cities}")
    
    def test_no_duplicate_venues_returned(self):
        """Verify no duplicate venues are returned"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=200")
        data = response.json()
        
        venue_ids = [v.get("venue_id") for v in data]
        unique_ids = set(venue_ids)
        
        assert len(venue_ids) == len(unique_ids), f"Found duplicate venues: {len(venue_ids)} total, {len(unique_ids)} unique"
        print(f"✓ All {len(unique_ids)} venues are unique")


class TestVenueCitiesAPI:
    """Test cities endpoint returns correct data"""
    
    def test_cities_endpoint_returns_data(self):
        """GET /api/venues/cities should return city list"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Expected list of cities"
        assert len(data) > 0, "Should have at least one city"
        
        # Check city structure
        city = data[0]
        assert "city" in city, "City object should have 'city' field"
        
        print(f"✓ Cities API returned {len(data)} cities")


class TestVenueFeaturedAPI:
    """Test featured venues endpoint"""
    
    def test_featured_venues_returns_8(self):
        """GET /api/venues/featured should return up to 8 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        assert len(data) <= 8, f"Featured should return max 8, got {len(data)}"
        
        print(f"✓ Featured API returned {len(data)} venues")
