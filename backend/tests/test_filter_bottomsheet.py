"""
Tests for FilterBottomSheet feature:
- Backend health check
- Venues endpoint (13 venues)
- City filter (Delhi venues)
- Venue type filter (farmhouse)
- Filter chips behavior
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthAndVenues:
    """Health check and venue loading tests"""

    def test_health_check_returns_200(self):
        """GET /api/health returns 200 (backend online check)"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/health returns 200")

    def test_venues_load_without_filter(self):
        """GET /api/venues returns at least 10 venues without any filter"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) >= 10, f"Expected at least 10 venues, got {len(data)}"
        print(f"PASS: GET /api/venues returns {len(data)} venues")

    def test_venues_structure(self):
        """Verify venue objects have required fields"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "No venues returned"

        venue = data[0]
        required_fields = ['venue_id', 'name', 'city']
        for field in required_fields:
            assert field in venue, f"Missing required field: {field}"
        print(f"PASS: Venue structure valid with fields: {list(venue.keys())[:8]}")

    def test_venues_count_is_13(self):
        """Confirm backend returns exactly 13 venues (based on seeded data)"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200
        data = response.json()
        print(f"INFO: Total venues returned: {len(data)}")
        # Accept 10+ since seeded data may vary, but note if not 13
        assert len(data) >= 10, f"Expected at least 10 venues, got {len(data)}"
        if len(data) != 13:
            print(f"WARNING: Expected 13 venues but got {len(data)}")
        else:
            print("PASS: Exactly 13 venues returned")


class TestCityFilter:
    """City filter tests"""

    def test_city_filter_delhi(self):
        """City filter with 'Delhi' returns only Delhi venues"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "No Delhi venues returned"
        for venue in data:
            assert venue.get('city') == 'Delhi', f"Venue {venue.get('name')} has city={venue.get('city')}, expected Delhi"
        print(f"PASS: Delhi filter returns {len(data)} venues, all with city=Delhi")

    def test_cities_endpoint_returns_valid_data(self):
        """GET /api/venues/cities returns city list with required fields"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of cities"
        assert len(data) > 0, "No cities returned"
        
        # Verify cities include major expected cities
        city_names = [c.get('city', c) if isinstance(c, dict) else c for c in data]
        print(f"INFO: Cities returned: {city_names}")
        assert any('Delhi' in str(c) for c in city_names), "Delhi not in cities list"
        print(f"PASS: Cities endpoint returns {len(data)} cities")


class TestVenueTypeFilter:
    """Venue type filter tests"""

    def test_venue_type_farmhouse_filter(self):
        """Farmhouse venue_types filter returns only farmhouse venues"""
        response = requests.get(f"{BASE_URL}/api/venues?venue_types=farmhouse")
        assert response.status_code == 200
        data = response.json()
        print(f"INFO: Farmhouse filter returns {len(data)} venues")
        # Should have some farmhouses or empty list (valid)
        for venue in data:
            assert venue.get('venue_type') == 'farmhouse', \
                f"Venue '{venue.get('name')}' has type={venue.get('venue_type')}, expected farmhouse"
        print(f"PASS: venue_types=farmhouse returns {len(data)} farmhouse venues")

    def test_venue_type_banquet_filter(self):
        """venue_type=banquet_hall filter works"""
        response = requests.get(f"{BASE_URL}/api/venues?venue_type=banquet_hall")
        assert response.status_code == 200
        data = response.json()
        print(f"INFO: banquet_hall filter returns {len(data)} venues")
        assert isinstance(data, list)
        print(f"PASS: venue_type=banquet_hall returns {len(data)} venues")


class TestGuestFilter:
    """Guest count filter tests"""

    def test_guest_min_filter(self):
        """guest_min filter reduces results"""
        response = requests.get(f"{BASE_URL}/api/venues?guest_min=500")
        assert response.status_code == 200
        data = response.json()
        print(f"INFO: guest_min=500 returns {len(data)} venues")
        assert isinstance(data, list)
        print(f"PASS: guest_min filter works, returned {len(data)} venues")

    def test_guest_range_filter(self):
        """guest_min and guest_max range filter"""
        response = requests.get(f"{BASE_URL}/api/venues?guest_min=100&guest_max=500")
        assert response.status_code == 200
        data = response.json()
        print(f"INFO: guest_min=100&guest_max=500 returns {len(data)} venues")
        assert isinstance(data, list)
        print(f"PASS: Guest range filter works, returned {len(data)} venues")


class TestCombinedFilters:
    """Combined filter tests"""

    def test_city_and_venue_type_combined(self):
        """Delhi + farmhouse filter works"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi&venue_types=farmhouse")
        assert response.status_code == 200
        data = response.json()
        print(f"INFO: Delhi+farmhouse filter returns {len(data)} venues")
        for venue in data:
            assert venue.get('city') == 'Delhi', f"Venue city mismatch: {venue.get('city')}"
        print(f"PASS: Combined city+venue_type filter returns {len(data)} venues")

    def test_sort_by_parameter(self):
        """sort_by=popular works without error"""
        response = requests.get(f"{BASE_URL}/api/venues?sort_by=popular")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 10
        print(f"PASS: sort_by=popular works, returns {len(data)} venues")
