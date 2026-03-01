"""
Test SEO-friendly public venue endpoints:
- GET /api/venues/cities - List cities with venue counts
- GET /api/venues/city/{city_slug} - List venues in a city
- GET /api/venues/city/{city_slug}/{venue_slug} - Get venue by slug
- GET /api/venues/{venue_id} - Backward compatibility test
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCitiesEndpoint:
    """Test GET /api/venues/cities"""
    
    def test_cities_returns_200(self):
        """Cities endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Cities endpoint returns 200")
    
    def test_cities_contains_expected_cities(self):
        """Cities response contains Delhi, Mumbai, Gurgaon, Noida"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        city_names = [c["city"] for c in data]
        
        assert "Delhi" in city_names, "Delhi should be in cities"
        assert "Mumbai" in city_names, "Mumbai should be in cities"
        assert "Gurgaon" in city_names, "Gurgaon should be in cities"
        assert "Noida" in city_names, "Noida should be in cities"
        print("✓ Cities contains Delhi, Mumbai, Gurgaon, Noida")
    
    def test_cities_has_required_fields(self):
        """Each city has required fields: city, slug, venue_count, areas"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        
        for city in data:
            assert "city" in city, "Missing 'city' field"
            assert "slug" in city, "Missing 'slug' field"
            assert "venue_count" in city, "Missing 'venue_count' field"
            assert "areas" in city, "Missing 'areas' field"
            assert isinstance(city["venue_count"], int), "venue_count should be int"
        print("✓ All cities have required fields (city, slug, venue_count, areas)")
    
    def test_delhi_venue_count(self):
        """Delhi has 5 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        delhi = next((c for c in data if c["city"] == "Delhi"), None)
        
        assert delhi is not None, "Delhi not found"
        assert delhi["venue_count"] == 5, f"Expected 5 venues in Delhi, got {delhi['venue_count']}"
        assert delhi["slug"] == "delhi", f"Expected slug 'delhi', got {delhi['slug']}"
        print("✓ Delhi has 5 venues with slug 'delhi'")


class TestCityVenuesEndpoint:
    """Test GET /api/venues/city/{city_slug}"""
    
    def test_delhi_venues_returns_200(self):
        """Delhi city venues returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/venues/city/delhi returns 200")
    
    def test_delhi_venues_response_structure(self):
        """Delhi response has expected structure"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi")
        data = response.json()
        
        assert "city" in data, "Missing 'city'"
        assert "city_slug" in data, "Missing 'city_slug'"
        assert "state" in data, "Missing 'state'"
        assert "areas" in data, "Missing 'areas'"
        assert "total" in data, "Missing 'total'"
        assert "venues" in data, "Missing 'venues'"
        
        assert data["city"] == "Delhi", f"Expected city 'Delhi', got {data['city']}"
        assert data["city_slug"] == "delhi", f"Expected city_slug 'delhi', got {data['city_slug']}"
        assert data["state"] == "Delhi", f"Expected state 'Delhi', got {data['state']}"
        print("✓ Delhi venues response has correct structure")
    
    def test_delhi_venues_count(self):
        """Delhi has 5 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi")
        data = response.json()
        
        assert data["total"] == 5, f"Expected total=5, got {data['total']}"
        assert len(data["venues"]) == 5, f"Expected 5 venues, got {len(data['venues'])}"
        print("✓ Delhi returns 5 venues")
    
    def test_delhi_venues_have_slug(self):
        """All Delhi venues have slug field"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi")
        data = response.json()
        
        for venue in data["venues"]:
            assert "slug" in venue, f"Venue {venue['name']} missing slug"
            assert "city_slug" in venue, f"Venue {venue['name']} missing city_slug"
            assert venue["city_slug"] == "delhi", f"Venue {venue['name']} has wrong city_slug"
        print("✓ All Delhi venues have slug and city_slug='delhi'")
    
    def test_gurgaon_venues_returns_200(self):
        """Gurgaon city venues returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/city/gurgaon")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["city"] == "Gurgaon"
        assert data["total"] == 2
        print("✓ GET /api/venues/city/gurgaon returns 200 with 2 venues")
    
    def test_noida_venues_returns_200(self):
        """Noida city venues returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/city/noida")
        assert response.status_code == 200
        
        data = response.json()
        assert data["city"] == "Noida"
        assert data["total"] == 1
        print("✓ GET /api/venues/city/noida returns 200 with 1 venue")
    
    def test_city_filter_event_type(self):
        """City venues can be filtered by event_type"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi?event_type=wedding")
        assert response.status_code == 200
        
        data = response.json()
        for venue in data["venues"]:
            assert "wedding" in venue.get("event_types", [])
        print("✓ event_type filter works on city venues")
    
    def test_city_sort_price_low(self):
        """City venues can be sorted by price_low"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi?sort_by=price_low")
        assert response.status_code == 200
        
        data = response.json()
        prices = [v.get("pricing", {}).get("price_per_plate_veg", 999999) for v in data["venues"]]
        assert prices == sorted(prices), "Venues should be sorted by price low to high"
        print("✓ sort_by=price_low works correctly")


class TestVenueBySlugEndpoint:
    """Test GET /api/venues/city/{city_slug}/{venue_slug}"""
    
    def test_venue_slug_returns_200(self):
        """Venue by slug returns 200"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi/the-grand-imperial")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/venues/city/delhi/the-grand-imperial returns 200")
    
    def test_venue_slug_response_structure(self):
        """Venue response has full venue data"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi/the-grand-imperial")
        data = response.json()
        
        assert data["name"] == "The Grand Imperial"
        assert data["city"] == "Delhi"
        assert data["city_slug"] == "delhi"
        assert data["slug"] == "the-grand-imperial"
        assert "description" in data
        assert "pricing" in data
        assert "amenities" in data
        assert "images" in data
        print("✓ Venue response has full venue data with slug fields")
    
    def test_venue_slug_includes_reviews(self):
        """Venue response includes reviews"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi/the-grand-imperial")
        data = response.json()
        
        assert "reviews" in data, "Missing 'reviews' field"
        assert isinstance(data["reviews"], list), "reviews should be a list"
        
        if len(data["reviews"]) > 0:
            review = data["reviews"][0]
            assert "review_id" in review
            assert "user_name" in review
            assert "rating" in review
        print("✓ Venue response includes reviews array")
    
    def test_venue_slug_includes_related_venues(self):
        """Venue response includes related venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi/the-grand-imperial")
        data = response.json()
        
        assert "related_venues" in data, "Missing 'related_venues' field"
        assert isinstance(data["related_venues"], list)
        
        # Related venues should be from same city but different venue
        for rv in data["related_venues"]:
            assert rv["city_slug"] == "delhi"
            assert rv["venue_id"] != data["venue_id"]
        print("✓ Venue response includes related venues from same city")
    
    def test_nonexistent_venue_returns_404(self):
        """Non-existent venue slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi/nonexistent-venue")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent venue returns 404")
    
    def test_wrong_city_slug_returns_404(self):
        """Venue with wrong city slug returns 404"""
        # the-grand-imperial is in Delhi, not Mumbai
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai/the-grand-imperial")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Venue with wrong city slug returns 404")


class TestBackwardCompatibility:
    """Test backward compatibility with venue_id URLs"""
    
    def test_venue_id_endpoint_returns_200(self):
        """Legacy /api/venues/{venue_id} endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/venues/venue_f2b3d31ebb05")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "The Grand Imperial"
        assert data["venue_id"] == "venue_f2b3d31ebb05"
        print("✓ Legacy /api/venues/{venue_id} endpoint works")
    
    def test_venue_id_endpoint_includes_reviews(self):
        """Legacy venue endpoint includes reviews"""
        response = requests.get(f"{BASE_URL}/api/venues/venue_f2b3d31ebb05")
        data = response.json()
        
        assert "reviews" in data, "Legacy endpoint should include reviews"
        print("✓ Legacy endpoint includes reviews")
    
    def test_nonexistent_venue_id_returns_404(self):
        """Non-existent venue ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/venues/venue_nonexistent123")
        assert response.status_code == 404
        print("✓ Non-existent venue ID returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
