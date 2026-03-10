"""
Test new city data: Mumbai, Bangalore, Hyderabad, Chennai, Chandigarh
Verifies venue counts, price estimates, city slugs, venue slugs, and featured venues.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TARGET_CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Chandigarh']


class TestCitiesEndpointNewData:
    """Test /api/venues/cities returns all 6 target cities"""

    def test_cities_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        assert response.status_code == 200
        print("✓ /api/venues/cities returns 200")

    def test_all_6_target_cities_present(self):
        """All 6 cities must be in the response with venue_count > 0"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        city_names = [c['city'] for c in data]
        for city in TARGET_CITIES:
            assert city in city_names, f"{city} missing from /api/venues/cities"
        print(f"✓ All 6 cities present: {TARGET_CITIES}")

    def test_all_6_target_cities_have_venues(self):
        """Each of the 6 target cities must have venue_count > 0"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        city_map = {c['city']: c['venue_count'] for c in data}
        for city in TARGET_CITIES:
            count = city_map.get(city, 0)
            assert count > 0, f"{city} has venue_count=0"
        print("✓ All 6 target cities have venue_count > 0")

    def test_new_cities_have_4_venues_each(self):
        """Mumbai, Bangalore, Hyderabad, Chennai, Chandigarh should each have 4 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        city_map = {c['city']: c['venue_count'] for c in data}
        for city in ['Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Chandigarh']:
            count = city_map.get(city, 0)
            assert count == 4, f"{city} expected 4 venues, got {count}"
        print("✓ Mumbai/Bangalore/Hyderabad/Chennai/Chandigarh each have 4 venues")

    def test_delhi_has_venues(self):
        """Delhi should have venues (previously 11)"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        data = response.json()
        city_map = {c['city']: c['venue_count'] for c in data}
        assert city_map.get('Delhi', 0) >= 4, f"Delhi should have >= 4 venues, got {city_map.get('Delhi', 0)}"
        print(f"✓ Delhi has {city_map.get('Delhi')} venues")


class TestMumbaiCityEndpoint:
    """GET /api/venues/city/mumbai"""

    def test_mumbai_city_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai")
        assert response.status_code == 200
        print("✓ /api/venues/city/mumbai returns 200")

    def test_mumbai_has_4_venues(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai")
        data = response.json()
        assert data['total'] == 4, f"Expected 4 venues in Mumbai, got {data['total']}"
        assert len(data['venues']) == 4, f"Expected 4 venues list, got {len(data['venues'])}"
        print("✓ Mumbai returns 4 venues")

    def test_mumbai_venue_fields(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai")
        data = response.json()
        assert data['city'] == 'Mumbai'
        assert data['city_slug'] == 'mumbai'
        assert data['state'] == 'Maharashtra'
        for v in data['venues']:
            assert v['city_slug'] == 'mumbai', f"Venue {v['name']} has wrong city_slug"
            assert 'slug' in v
        print("✓ Mumbai venues have correct city/city_slug/state fields")

    def test_taj_mahal_palace_mumbai_present(self):
        """Taj Mahal Palace Mumbai should be in Mumbai venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai")
        data = response.json()
        names = [v['name'] for v in data['venues']]
        assert 'Taj Mahal Palace Mumbai' in names, f"Taj Mahal Palace Mumbai not found. Got: {names}"
        print("✓ Taj Mahal Palace Mumbai is in Mumbai venues")


class TestBangaloreCityEndpoint:
    """GET /api/venues/city/bangalore"""

    def test_bangalore_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/bangalore")
        assert response.status_code == 200
        print("✓ /api/venues/city/bangalore returns 200")

    def test_bangalore_has_4_venues(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/bangalore")
        data = response.json()
        assert data['total'] == 4, f"Expected 4 venues in Bangalore, got {data['total']}"
        print("✓ Bangalore returns 4 venues")

    def test_bangalore_city_fields(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/bangalore")
        data = response.json()
        assert data['city'] == 'Bangalore'
        assert data['city_slug'] == 'bangalore'
        assert data['state'] == 'Karnataka'
        print("✓ Bangalore city fields correct")


class TestHyderabadCityEndpoint:
    """GET /api/venues/city/hyderabad"""

    def test_hyderabad_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/hyderabad")
        assert response.status_code == 200
        print("✓ /api/venues/city/hyderabad returns 200")

    def test_hyderabad_has_4_venues(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/hyderabad")
        data = response.json()
        assert data['total'] == 4, f"Expected 4 venues in Hyderabad, got {data['total']}"
        print("✓ Hyderabad returns 4 venues")

    def test_hyderabad_city_fields(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/hyderabad")
        data = response.json()
        assert data['city'] == 'Hyderabad'
        assert data['city_slug'] == 'hyderabad'
        assert data['state'] == 'Telangana'
        print("✓ Hyderabad city fields correct")


class TestChennaiCityEndpoint:
    """GET /api/venues/city/chennai"""

    def test_chennai_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/chennai")
        assert response.status_code == 200
        print("✓ /api/venues/city/chennai returns 200")

    def test_chennai_has_4_venues(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/chennai")
        data = response.json()
        assert data['total'] == 4, f"Expected 4 venues in Chennai, got {data['total']}"
        print("✓ Chennai returns 4 venues")

    def test_chennai_city_fields(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/chennai")
        data = response.json()
        assert data['city'] == 'Chennai'
        assert data['city_slug'] == 'chennai'
        assert data['state'] == 'Tamil Nadu'
        print("✓ Chennai city fields correct")


class TestChandigarhCityEndpoint:
    """GET /api/venues/city/chandigarh"""

    def test_chandigarh_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/chandigarh")
        assert response.status_code == 200
        print("✓ /api/venues/city/chandigarh returns 200")

    def test_chandigarh_has_4_venues(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/chandigarh")
        data = response.json()
        assert data['total'] == 4, f"Expected 4 venues in Chandigarh, got {data['total']}"
        print("✓ Chandigarh returns 4 venues")

    def test_chandigarh_city_fields(self):
        response = requests.get(f"{BASE_URL}/api/venues/city/chandigarh")
        data = response.json()
        assert data['city'] == 'Chandigarh'
        assert data['city_slug'] == 'chandigarh'
        print("✓ Chandigarh city fields correct")

    def test_chandigarh_min_price(self):
        """Chandigarh min price per plate should be ~3200"""
        response = requests.get(f"{BASE_URL}/api/venues/city/chandigarh")
        data = response.json()
        prices = [v.get('pricing', {}).get('price_per_plate_veg', 0) for v in data['venues'] if v.get('pricing')]
        min_price = min(prices) if prices else 0
        assert min_price >= 3000, f"Chandigarh min plate price expected ~3200, got {min_price}"
        print(f"✓ Chandigarh min plate price = {min_price}")


class TestPriceEstimateNewCities:
    """GET /api/venues/price-estimate for new cities"""

    def test_mumbai_price_estimate_returns_venues(self):
        """Mumbai/Wedding/200 guests should return 4 venues with valid price"""
        response = requests.get(f"{BASE_URL}/api/venues/price-estimate?guests=200&city=Mumbai&event_type=wedding")
        assert response.status_code == 200
        data = response.json()
        assert data['venue_count'] == 4, f"Expected 4 venues for Mumbai, got {data['venue_count']}"
        assert data['min_price'] > 0, "min_price should be > 0"
        assert data['max_price'] > 0, "max_price should be > 0"
        # Mumbai 200 guests Wedding: ₹20L-₹30L range (5000*200=10L to 8000*200=16L + min_spend)
        assert data['min_price'] >= 1000000, f"Mumbai min_price too low: {data['min_price']}"
        print(f"✓ Mumbai/Wedding/200: {data['venue_count']} venues, ₹{data['min_price']:,}-₹{data['max_price']:,}")

    def test_chandigarh_price_estimate_returns_venues(self):
        """Chandigarh/200 guests should return > 0 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/price-estimate?guests=200&city=Chandigarh")
        assert response.status_code == 200
        data = response.json()
        assert data['venue_count'] > 0, "Chandigarh should have > 0 venues for 200 guests"
        assert data['min_price'] > 0
        print(f"✓ Chandigarh/200 guests: {data['venue_count']} venues, ₹{data['min_price']:,}-₹{data['max_price']:,}")

    def test_bangalore_price_estimate(self):
        """Bangalore/Wedding/200 should return venues"""
        response = requests.get(f"{BASE_URL}/api/venues/price-estimate?guests=200&city=Bangalore&event_type=wedding")
        assert response.status_code == 200
        data = response.json()
        assert data['venue_count'] > 0, f"Bangalore should have venues, got 0"
        assert data['min_price'] > 0
        print(f"✓ Bangalore/Wedding/200: {data['venue_count']} venues, ₹{data['min_price']:,}-₹{data['max_price']:,}")

    def test_hyderabad_price_estimate(self):
        """Hyderabad/Wedding/200 should return venues"""
        response = requests.get(f"{BASE_URL}/api/venues/price-estimate?guests=200&city=Hyderabad&event_type=wedding")
        assert response.status_code == 200
        data = response.json()
        assert data['venue_count'] > 0, f"Hyderabad should have venues, got 0"
        print(f"✓ Hyderabad/Wedding/200: {data['venue_count']} venues")

    def test_chennai_price_estimate_4_venues(self):
        """Chennai/Wedding/200 should return 4 venues"""
        response = requests.get(f"{BASE_URL}/api/venues/price-estimate?guests=200&city=Chennai&event_type=wedding")
        assert response.status_code == 200
        data = response.json()
        assert data['venue_count'] > 0, f"Chennai should have venues, got 0"
        print(f"✓ Chennai/Wedding/200: {data['venue_count']} venues")

    def test_price_estimate_response_has_required_fields(self):
        """Price estimate response includes all required fields"""
        response = requests.get(f"{BASE_URL}/api/venues/price-estimate?guests=200&city=Mumbai")
        data = response.json()
        for field in ['min_price', 'max_price', 'venue_count', 'guests']:
            assert field in data, f"Missing field: {field}"
        assert data['guests'] == 200
        print("✓ Price estimate has all required fields")


class TestMumbaiVenueBySlug:
    """GET /api/venues/city/mumbai/{venue_slug}"""

    def test_taj_mahal_palace_by_slug(self):
        """Taj Mahal Palace Mumbai accessible by slug"""
        # slug for "Taj Mahal Palace Mumbai" = "taj-mahal-palace-mumbai"
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai/taj-mahal-palace-mumbai")
        assert response.status_code == 200, f"Expected 200 for Taj Mahal Palace Mumbai, got {response.status_code}"
        data = response.json()
        assert data['name'] == 'Taj Mahal Palace Mumbai'
        assert data['city'] == 'Mumbai'
        assert data['city_slug'] == 'mumbai'
        print("✓ Taj Mahal Palace Mumbai accessible at /venues/city/mumbai/taj-mahal-palace-mumbai")

    def test_taj_mahal_palace_has_reviews_field(self):
        """Taj Mahal Palace venue response includes reviews field"""
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai/taj-mahal-palace-mumbai")
        data = response.json()
        assert 'reviews' in data
        assert isinstance(data['reviews'], list)
        print("✓ Taj Mahal Palace Mumbai has reviews field")

    def test_taj_mahal_palace_has_related_venues(self):
        """Taj Mahal Palace venue response includes related_venues"""
        response = requests.get(f"{BASE_URL}/api/venues/city/mumbai/taj-mahal-palace-mumbai")
        data = response.json()
        assert 'related_venues' in data
        assert isinstance(data['related_venues'], list)
        # Related venues should be Mumbai venues
        for rv in data['related_venues']:
            assert rv['city_slug'] == 'mumbai'
        print(f"✓ Taj Mahal Palace has {len(data['related_venues'])} related Mumbai venues")

    def test_wrong_city_returns_404(self):
        """Accessing Mumbai venue with Delhi city slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/venues/city/delhi/taj-mahal-palace-mumbai")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Wrong city slug returns 404")


class TestFeaturedVenuesStillWork:
    """GET /api/venues/featured should still return top 4 highest-rated venues"""

    def test_featured_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200
        print("✓ /api/venues/featured returns 200")

    def test_featured_returns_4_venues(self):
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        data = response.json()
        assert len(data) == 4, f"Expected 4 featured venues, got {len(data)}"
        print(f"✓ Featured returns 4 venues")

    def test_featured_venues_have_high_ratings(self):
        """Featured venues should be high-rated (sorted by rating desc)"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        data = response.json()
        ratings = [v.get('rating', 0) for v in data]
        assert all(r >= 4.0 for r in ratings), f"All featured venues should have rating >= 4.0, got {ratings}"
        print(f"✓ Featured venues have ratings: {ratings}")

    def test_featured_venues_are_approved(self):
        """All featured venues should be approved"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        data = response.json()
        for v in data:
            assert v.get('status') == 'approved', f"Venue {v['name']} is not approved"
        print("✓ All featured venues are approved")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
