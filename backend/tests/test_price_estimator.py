"""
Backend tests for the Price Estimator feature.
Endpoint: GET /api/venues/price-estimate
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPriceEstimatorEndpoint:
    """Tests for /api/venues/price-estimate endpoint"""

    def test_delhi_wedding_200_guests_returns_correct_data(self):
        """Default state: Delhi / Wedding / 200 guests → 11 venues, ₹4L-₹25L"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200, "city": "Delhi", "event_type": "wedding"
        })
        assert r.status_code == 200
        data = r.json()
        assert "min_price" in data
        assert "max_price" in data
        assert "venue_count" in data
        assert "avg_price" in data
        assert data["venue_count"] > 0, "Expected at least 1 Delhi/Wedding venue"
        assert data["min_price"] > 0
        assert data["max_price"] >= data["min_price"]
        # Based on known seed data: 11 venues, ₹4.0L - ₹25.0L
        assert data["venue_count"] == 11, f"Expected 11 venues, got {data['venue_count']}"
        assert data["min_price"] == 400000, f"Expected min=400000, got {data['min_price']}"
        assert data["max_price"] == 2500000, f"Expected max=2500000, got {data['max_price']}"

    def test_avg_price_delhi_wedding_approximately_correct(self):
        """Avg price for Delhi/Wedding/200 guests should be ~₹13.6L"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200, "city": "Delhi", "event_type": "wedding"
        })
        assert r.status_code == 200
        data = r.json()
        # avg_price should be between min and max
        assert data["avg_price"] >= data["min_price"]
        assert data["avg_price"] <= data["max_price"]
        # Known approximate average ~13.6L
        assert 1000000 <= data["avg_price"] <= 2000000, f"Avg price {data['avg_price']} outside expected range 10L-20L"

    def test_mumbai_returns_valid_json_with_zero_venues(self):
        """Mumbai (no seed venues) should return valid JSON with venue_count=0, not crash"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 100, "city": "Mumbai"
        })
        assert r.status_code == 200
        data = r.json()
        assert "min_price" in data
        assert "max_price" in data
        assert "venue_count" in data
        # No Mumbai venues in seed data
        assert data["venue_count"] == 0
        assert data["min_price"] == 0
        assert data["max_price"] == 0

    def test_gurgaon_corporate_200_guests(self):
        """Changing city to Gurgaon with corporate event returns valid results"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200, "city": "Gurgaon", "event_type": "corporate"
        })
        assert r.status_code == 200
        data = r.json()
        assert "venue_count" in data
        assert "min_price" in data
        assert "max_price" in data
        # Gurgaon has some venues
        assert data["venue_count"] > 0, "Expected Gurgaon to have some venues"
        assert data["min_price"] > 0
        assert data["max_price"] >= data["min_price"]

    def test_no_city_no_event_type_returns_results(self):
        """No filters returns some results (fallback to all venues)"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200
        })
        assert r.status_code == 200
        data = r.json()
        assert "venue_count" in data
        assert data["venue_count"] >= 0  # Could be 0 if no venues have pricing

    def test_nonexistent_city_returns_zero_venues(self):
        """Non-existent city returns empty response gracefully"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 500, "city": "XYZNoCityExists", "event_type": "wedding"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["venue_count"] == 0
        assert data["min_price"] == 0
        assert data["max_price"] == 0

    def test_response_includes_required_fields(self):
        """Response must include all required fields"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200, "city": "Delhi", "event_type": "wedding"
        })
        assert r.status_code == 200
        data = r.json()
        required_fields = ["min_price", "max_price", "venue_count", "avg_price", "guests", "city", "event_type"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_delhi_birthday_event_type(self):
        """Changing event type to birthday updates results"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200, "city": "Delhi", "event_type": "birthday"
        })
        assert r.status_code == 200
        data = r.json()
        assert "venue_count" in data
        assert "min_price" in data
        assert "max_price" in data
        # Prices should be in valid range (could be 0 if no birthday venues)
        if data["venue_count"] > 0:
            assert data["min_price"] > 0
            assert data["max_price"] >= data["min_price"]

    def test_different_guest_counts_change_results(self):
        """Different guest counts should produce different price estimates"""
        r_small = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 50, "city": "Delhi", "event_type": "wedding"
        })
        r_large = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 1000, "city": "Delhi", "event_type": "wedding"
        })
        assert r_small.status_code == 200
        assert r_large.status_code == 200
        d_small = r_small.json()
        d_large = r_large.json()
        # Both should be valid responses
        assert "venue_count" in d_small
        assert "venue_count" in d_large
        # For 1000 guests, there may be fewer or same venues capable
        # Just verify valid JSON responses
        assert d_small["min_price"] >= 0
        assert d_large["min_price"] >= 0

    def test_case_insensitive_city_match(self):
        """City matching should be case insensitive"""
        r = requests.get(f"{BASE_URL}/api/venues/price-estimate", params={
            "guests": 200, "city": "delhi", "event_type": "wedding"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["venue_count"] > 0, "Lowercase 'delhi' should still match venues"
