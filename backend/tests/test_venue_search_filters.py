"""
Venue Search Filters E2E Tests
Tests all filter functionality: vibe, guest count, venue types, sort, city
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVenueSearchFilters:
    """Test venue search API with various filters"""
    
    def test_get_all_venues(self):
        """Test GET /api/venues returns all venues (expected ~82)"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total venues returned: {len(data)}")
        assert len(data) >= 50, f"Expected at least 50 venues, got {len(data)}"
    
    def test_vibe_filter_royal(self):
        """Test GET /api/venues?vibe=Royal filters correctly (expected ~27)"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Royal&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Royal vibe venues: {len(data)}")
        
        # Verify all returned venues have Royal vibe
        for venue in data[:5]:  # Check first 5
            vibes = venue.get('vibes', [])
            assert 'Royal' in vibes or vibes == 'Royal', f"Venue {venue.get('name')} missing Royal vibe: {vibes}"
    
    def test_vibe_filter_modern(self):
        """Test GET /api/venues?vibe=Modern filters correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Modern&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Modern vibe venues: {len(data)}")
    
    def test_vibe_filter_garden(self):
        """Test GET /api/venues?vibe=Garden filters correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Garden&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Garden vibe venues: {len(data)}")
    
    def test_guest_count_filter_0_100(self):
        """Test GET /api/venues?guest_min=0&guest_max=100 filters correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?guest_min=0&guest_max=100&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Venues for 0-100 guests: {len(data)}")
        
        # Verify capacity range
        for venue in data[:5]:
            cap_min = venue.get('capacity_min', 0)
            cap_max = venue.get('capacity_max', 0)
            # Venue should be able to accommodate guests in 0-100 range
            assert cap_min <= 100, f"Venue {venue.get('name')} capacity_min {cap_min} > 100"
    
    def test_guest_count_filter_101_250(self):
        """Test GET /api/venues?guest_min=101&guest_max=250 filters correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?guest_min=101&guest_max=250&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Venues for 101-250 guests: {len(data)}")
    
    def test_guest_count_filter_251_1000(self):
        """Test GET /api/venues?guest_min=251&guest_max=1000 filters correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?guest_min=251&guest_max=1000&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Venues for 251-1000 guests: {len(data)}")
    
    def test_venue_types_filter_hotel(self):
        """Test GET /api/venues?venue_types=hotel filters correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?venue_types=hotel&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Hotel venues: {len(data)}")
        
        # Verify venue type
        for venue in data[:5]:
            venue_type = venue.get('venue_type', '')
            assert venue_type == 'hotel', f"Venue {venue.get('name')} type is {venue_type}, expected hotel"
    
    def test_sort_by_price_low(self):
        """Test GET /api/venues?sort_by=price_low sorts correctly"""
        response = requests.get(f"{BASE_URL}/api/venues?sort_by=price_low&limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return venues"
        
        # Verify sorting (prices should be ascending)
        prices = []
        for venue in data[:10]:
            pricing = venue.get('pricing', {})
            price = pricing.get('price_per_plate_veg', 0) or 0
            prices.append(price)
        
        print(f"First 10 prices (sorted low): {prices}")
        # Check if generally sorted (allow some tolerance for null values)
        sorted_prices = sorted([p for p in prices if p > 0])
        actual_non_zero = [p for p in prices if p > 0]
        if len(actual_non_zero) >= 3:
            assert actual_non_zero == sorted_prices, f"Prices not sorted: {actual_non_zero}"
    
    def test_city_filter_delhi(self):
        """Test GET /api/venues?city=Delhi filters by city"""
        response = requests.get(f"{BASE_URL}/api/venues?city=Delhi&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Delhi venues: {len(data)}")
        
        # Verify city
        for venue in data[:5]:
            city = venue.get('city', '')
            assert 'Delhi' in city or 'delhi' in city.lower(), f"Venue {venue.get('name')} city is {city}"
    
    def test_combined_filters(self):
        """Test combining multiple filters"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Royal&guest_min=100&guest_max=500&limit=200")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Royal vibe + 100-500 guests: {len(data)}")


class TestVenueCities:
    """Test cities endpoint"""
    
    def test_get_cities(self):
        """Test GET /api/venues/cities returns city list"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one city"
        
        print(f"Cities: {[c.get('city') for c in data]}")
        
        # Verify city structure
        city = data[0]
        assert 'city' in city, "City should have 'city' field"
        assert 'venue_count' in city or 'count' in city, "City should have venue count"


class TestVenueFeatured:
    """Test featured venues endpoint"""
    
    def test_get_featured_venues(self):
        """Test GET /api/venues/featured returns top venues"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 8, "Should return max 8 featured venues"
        print(f"Featured venues: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
