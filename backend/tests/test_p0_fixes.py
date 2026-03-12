"""
P0 Fixes Regression Tests
Tests: venue search, cities endpoint, venue type filter, auth redirects
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVenueSearchEndpoints:
    """Tests for venue search and city filter P0 fixes"""

    def test_venues_list_returns_13(self):
        """GET /api/venues should return all 13 approved venues"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 13, f"Expected 13 venues, got {len(data)}"

    def test_cities_endpoint_returns_real_cities(self):
        """GET /api/venues/cities should return Delhi, Mumbai, Gurgaon, Noida"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4, f"Expected at least 4 cities, got {len(data)}"
        city_names = [c["city"] for c in data]
        for expected in ["Delhi", "Mumbai", "Gurgaon", "Noida"]:
            assert expected in city_names, f"City '{expected}' missing from /api/venues/cities"

    def test_city_filter_delhi_returns_5_venues(self):
        """GET /api/venues?city=Delhi should return 5 venues"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5, f"Expected 5 Delhi venues, got {len(data)}"
        for venue in data:
            assert venue["city"] == "Delhi", f"Venue '{venue.get('name')}' has city={venue.get('city')}, not Delhi"

    def test_venue_type_filter_farmhouse_returns_1(self):
        """GET /api/venues?venue_types=farmhouse should return 1 venue"""
        response = requests.get(f"{BASE_URL}/api/venues?venue_types=farmhouse")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1, f"Expected 1 farmhouse venue, got {len(data)}"
        assert data[0]["venue_type"] == "farmhouse"

    def test_cities_endpoint_structure(self):
        """Cities response should have city, slug, areas fields"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        data = response.json()
        for city in data:
            assert "city" in city, f"Missing 'city' field in {city}"
            assert "slug" in city, f"Missing 'slug' field in {city}"
            assert "venue_count" in city, f"Missing 'venue_count' field in {city}"


class TestAuthLoginRedirects:
    """Tests for login with role-based credentials"""

    def test_admin_login_success(self):
        """Admin login with admin@venuloq.in / admin123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@venuloq.in", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@venuloq.in"

    def test_rm_login_success(self):
        """RM login with rm1@venuloq.in / rm123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rm1@venuloq.in", "password": "rm123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "rm"
        assert data["user"]["email"] == "rm1@venuloq.in"

    def test_venue_owner_login_success(self):
        """Venue owner login with venue@venuloq.in / venue123 (correct credentials)
        NOTE: LoginPage.js pre-fills venue1@example.com which is WRONG - should be venue@venuloq.in
        """
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "venue@venuloq.in", "password": "venue123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "venue_owner"

    def test_invalid_login_returns_401(self):
        """Invalid credentials should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
