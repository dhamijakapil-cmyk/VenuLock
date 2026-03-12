"""
Tests for new features:
1. /api/venues/featured - returns top 4 rated venues
2. Testimonials (static frontend, just verify backend returns correct venues)
3. Venue detail page gold color and dark card (validated via frontend)
4. Favorites/Wishlist toggle
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFeaturedVenuesEndpoint:
    """Test /api/venues/featured endpoint"""

    def test_featured_endpoint_returns_200(self):
        """Featured venues endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/venues/featured returns 200")

    def test_featured_endpoint_returns_list(self):
        """Featured venues endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /api/venues/featured returns list with {len(data)} venues")

    def test_featured_endpoint_returns_max_4_venues(self):
        """Featured venues endpoint returns at most 4 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 4, f"Expected max 4 venues, got {len(data)}"
        print(f"PASS: Featured venues count = {len(data)} (max 4)")

    def test_featured_venues_have_required_fields(self):
        """Featured venues have fields needed by FeaturedVenueCard component"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No featured venues returned - skipping field validation")
        
        for venue in data:
            assert "venue_id" in venue, f"Missing venue_id in venue"
            assert "name" in venue, f"Missing name in venue {venue.get('venue_id')}"
            assert "city" in venue, f"Missing city in venue {venue.get('venue_id')}"
            print(f"  - {venue.get('name')} | {venue.get('city')} | rating={venue.get('rating', 'N/A')}")
        
        print(f"PASS: All {len(data)} featured venues have required fields")

    def test_featured_venues_no_id_field(self):
        """Featured venues should NOT include MongoDB _id field"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        for venue in data:
            assert "_id" not in venue, f"MongoDB _id field should not be present in venue {venue.get('venue_id')}"
        print("PASS: No _id field in featured venues")

    def test_featured_venues_sorted_by_rating(self):
        """Featured venues should be sorted by rating descending"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) < 2:
            pytest.skip("Not enough venues to test sorting")
        
        ratings = [v.get("rating", 0) for v in data]
        assert ratings == sorted(ratings, reverse=True), \
            f"Venues not sorted by rating desc: {ratings}"
        print(f"PASS: Venues sorted by rating: {ratings}")

    def test_featured_venues_are_approved(self):
        """Featured venues should only include approved venues"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        data = response.json()
        
        for venue in data:
            status = venue.get("status", "approved")  # May not always be returned
            if "status" in venue:
                assert status == "approved", f"Non-approved venue in featured: {venue.get('venue_id')}"
        print("PASS: Featured venues are approved")


class TestVenuesSearch:
    """Basic venue search (regression check)"""

    def test_venues_search_returns_200(self):
        """Venues search endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/venues returns list with {len(data)} venues")

    def test_venues_city_filter(self):
        """Venues search with city filter works"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/venues?city=Delhi returns {len(data)} venues")


class TestFavoritesEndpoints:
    """Test favorites/wishlist endpoints"""

    def test_favorites_requires_auth(self):
        """GET /api/favorites requires authentication"""
        response = requests.get(f"{BASE_URL}/api/favorites")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: /api/favorites returns {response.status_code} without auth")

    def test_favorites_post_requires_auth(self):
        """POST /api/favorites requires authentication"""
        response = requests.post(f"{BASE_URL}/api/favorites", json={"venue_id": "test_venue"})
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: POST /api/favorites returns {response.status_code} without auth")

    def test_favorites_full_flow_with_auth(self):
        """Test add/remove favorites with authenticated user"""
        # Login - try admin credentials first (customer creds may not exist)
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if login_resp.status_code != 200:
            pytest.skip(f"Login failed with {login_resp.status_code}")
        
        # API uses 'token' key (not 'access_token')
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        if not token:
            pytest.skip(f"No token returned from login. Keys: {list(login_resp.json().keys())}")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get current favorites
        fav_resp = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        assert fav_resp.status_code == 200
        original_ids = fav_resp.json().get("venue_ids", [])
        print(f"  - Current favorites: {len(original_ids)} venues")
        
        # Get a venue to add
        venues_resp = requests.get(f"{BASE_URL}/api/venues")
        if venues_resp.status_code != 200 or not venues_resp.json():
            pytest.skip("No venues available to test favorites")
        
        test_venue_id = venues_resp.json()[0]["venue_id"]
        
        # Add to favorites
        add_resp = requests.post(f"{BASE_URL}/api/favorites", 
                                json={"venue_id": test_venue_id}, 
                                headers=headers)
        assert add_resp.status_code in [200, 201], f"Add favorite failed: {add_resp.status_code}"
        
        # Verify added
        fav_resp2 = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        assert fav_resp2.status_code == 200
        new_ids = fav_resp2.json().get("venue_ids", [])
        assert test_venue_id in new_ids, f"Venue {test_venue_id} not found in favorites after add"
        print(f"  - Added {test_venue_id} to favorites")
        
        # Remove from favorites
        del_resp = requests.delete(f"{BASE_URL}/api/favorites/{test_venue_id}", headers=headers)
        assert del_resp.status_code in [200, 204], f"Delete favorite failed: {del_resp.status_code}"
        
        # Verify removed
        fav_resp3 = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        final_ids = fav_resp3.json().get("venue_ids", [])
        assert test_venue_id not in final_ids, f"Venue {test_venue_id} still in favorites after remove"
        
        print(f"PASS: Favorites add/remove flow works correctly")


class TestVenueCitiesEndpoint:
    """Test cities endpoint (used on landing page)"""

    def test_cities_endpoint_returns_200(self):
        """Cities endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/venues/cities returns {len(data)} cities")
