"""
City Hub Feature Tests - /venues page with city cards
Tests: GET /api/venues/cities, city venue listings, venue detail pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCitiesEndpoint:
    """Test GET /api/venues/cities endpoint"""
    
    def test_cities_endpoint_returns_200(self):
        """Cities endpoint should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/venues/cities returns 200")
    
    def test_cities_returns_array(self):
        """Cities endpoint should return an array"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Response is an array with {len(data)} cities")
    
    def test_cities_have_required_fields(self):
        """Each city should have required fields: city, slug, venue_count, min_price, max_capacity, areas, sample_image"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        assert len(data) > 0, "Should have at least one city"
        
        required_fields = ['city', 'slug', 'venue_count', 'min_price', 'max_capacity', 'areas', 'sample_image']
        
        for city in data:
            for field in required_fields:
                assert field in city, f"City {city.get('city', 'unknown')} missing field: {field}"
        print(f"✓ All {len(data)} cities have required fields")
    
    def test_expected_cities_present(self):
        """Should have Delhi, Mumbai, Gurgaon, Noida"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        
        city_slugs = [c['slug'] for c in data]
        expected_cities = ['delhi', 'mumbai', 'gurgaon', 'noida']
        
        for expected in expected_cities:
            assert expected in city_slugs, f"Missing city: {expected}"
        print(f"✓ All expected cities present: {expected_cities}")
    
    def test_venue_counts_correct(self):
        """Verify venue counts match expected: Delhi(5), Mumbai(5), Gurgaon(2), Noida(1)"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        
        expected_counts = {'delhi': 5, 'mumbai': 5, 'gurgaon': 2, 'noida': 1}
        
        for city in data:
            slug = city['slug']
            if slug in expected_counts:
                assert city['venue_count'] == expected_counts[slug], \
                    f"City {slug} should have {expected_counts[slug]} venues, got {city['venue_count']}"
        print("✓ Venue counts match expected values")
    
    def test_cities_have_state_field(self):
        """Cities should have state field (optional but expected)"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        
        for city in data:
            assert 'state' in city, f"City {city.get('city')} missing state field"
        print("✓ All cities have state field")
    
    def test_delhi_has_areas(self):
        """Delhi city should have area tags"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        
        delhi = next((c for c in data if c['slug'] == 'delhi'), None)
        assert delhi is not None, "Delhi city not found"
        assert 'areas' in delhi, "Delhi missing areas field"
        assert isinstance(delhi['areas'], list), "Areas should be a list"
        assert len(delhi['areas']) > 0, "Delhi should have at least one area"
        print(f"✓ Delhi has {len(delhi['areas'])} areas")


class TestCityVenuesEndpoint:
    """Test GET /api/venues/city/{city_slug} endpoint"""
    
    def test_delhi_city_venues(self):
        """GET /api/venues/city/delhi should return Delhi venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'venues' in data, "Response should have venues array"
        assert 'city' in data, "Response should have city name"
        assert data['city'] == 'Delhi', f"Expected city 'Delhi', got {data['city']}"
        print(f"✓ GET /api/venues/city/delhi returns {len(data['venues'])} venues")
    
    def test_mumbai_city_venues(self):
        """GET /api/venues/city/mumbai should return Mumbai venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data['venues']) > 0, "Mumbai should have venues"
        print(f"✓ GET /api/venues/city/mumbai returns {len(data['venues'])} venues")
    
    def test_gurgaon_city_venues(self):
        """GET /api/venues/city/gurgaon should return Gurgaon venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/gurgaon")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data['venues']) == 2, f"Gurgaon should have 2 venues, got {len(data['venues'])}"
        print(f"✓ GET /api/venues/city/gurgaon returns {len(data['venues'])} venues")
    
    def test_noida_city_venues(self):
        """GET /api/venues/city/noida should return Noida venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/noida")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data['venues']) == 1, f"Noida should have 1 venue, got {len(data['venues'])}"
        print(f"✓ GET /api/venues/city/noida returns {len(data['venues'])} venues")


class TestVenueDetailBySlug:
    """Test GET /api/venues/city/{city_slug}/{venue_slug} endpoint"""
    
    def test_delhi_venue_by_slug(self):
        """Should be able to get a specific venue by city+venue slug"""
        # First get a venue slug from Delhi
        city_response = requests.get(f"{BASE_URL}/api/venues/city/delhi")
        assert city_response.status_code == 200
        
        venues = city_response.json().get('venues', [])
        if len(venues) > 0:
            venue = venues[0]
            venue_slug = venue.get('slug')
            
            if venue_slug:
                detail_response = requests.get(f"{BASE_URL}/api/venues/city/delhi/{venue_slug}")
                assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
                
                detail = detail_response.json()
                assert detail['slug'] == venue_slug, "Venue slug should match"
                print(f"✓ GET /api/venues/city/delhi/{venue_slug} returns venue detail")
            else:
                print("⚠ Venue slug not found, skipping detail test")
        else:
            print("⚠ No venues in Delhi, skipping detail test")


class TestBackwardCompatibility:
    """Test that existing SEO routes still work"""
    
    def test_venues_search_endpoint(self):
        """GET /api/venues (search) should still work"""
        response = requests.get(f"{BASE_URL}/api/venues")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/venues (search) still works")
    
    def test_venues_search_with_city_filter(self):
        """GET /api/venues?city=Delhi should filter by city"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/venues?city=Delhi returns {len(data)} venues")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
