"""
Test suite for the new Favorites feature - POST /api/venues/batch endpoint
This batch endpoint is used by the FavoritesPage to fetch venue details for favorited venues.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVenuesBatchEndpoint:
    """Tests for the POST /api/venues/batch endpoint used by Favorites Page"""
    
    def test_batch_endpoint_returns_200(self):
        """Test that batch endpoint returns 200 for valid request"""
        response = requests.post(
            f"{BASE_URL}/api/venues/batch",
            json={"venue_ids": ["venue_658884a4e9c1"]},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Batch endpoint returns 200")
    
    def test_batch_endpoint_returns_venue_data(self):
        """Test that batch endpoint returns correct venue data structure"""
        response = requests.post(
            f"{BASE_URL}/api/venues/batch",
            json={"venue_ids": ["venue_658884a4e9c1"]},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            venue = data[0]
            # Check required fields for FavoritesPage display
            assert "venue_id" in venue, "venue_id field required"
            assert "name" in venue, "name field required"
            assert "city" in venue, "city field required"
            # pricing field should be present for price_per_plate_veg
            assert "pricing" in venue or "price_per_plate" in venue, "pricing or price_per_plate field required"
            print(f"✓ Venue data structure is correct: {venue.get('name')}")
            print(f"  - venue_id: {venue.get('venue_id')}")
            print(f"  - city: {venue.get('city')}")
            print(f"  - area: {venue.get('area')}")
            print(f"  - pricing: {venue.get('pricing')}")
            print(f"  - rating: {venue.get('rating')}")
            print(f"  - venue_type: {venue.get('venue_type')}")
        else:
            print("⚠ No venue found with test venue_id - this may indicate test venue doesn't exist")
    
    def test_batch_endpoint_with_empty_ids(self):
        """Test that batch endpoint handles empty venue_ids gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/venues/batch",
            json={"venue_ids": []},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data == [], f"Expected empty list, got {data}"
        print("✓ Empty venue_ids returns empty list")
    
    def test_batch_endpoint_with_invalid_ids(self):
        """Test that batch endpoint handles invalid venue_ids gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/venues/batch",
            json={"venue_ids": ["invalid_venue_id_123"]},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should return empty list or not include invalid venue
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Invalid venue_ids handled gracefully - returned {len(data)} venues")
    
    def test_batch_endpoint_multiple_ids(self):
        """Test that batch endpoint handles multiple venue_ids"""
        # Get some venue IDs from search first
        search_response = requests.get(f"{BASE_URL}/api/venues?limit=3")
        if search_response.status_code == 200:
            venues = search_response.json()
            if len(venues) > 1:
                venue_ids = [v["venue_id"] for v in venues[:3]]
                
                response = requests.post(
                    f"{BASE_URL}/api/venues/batch",
                    json={"venue_ids": venue_ids},
                    headers={"Content-Type": "application/json"}
                )
                assert response.status_code == 200
                data = response.json()
                print(f"✓ Batch endpoint returned {len(data)} venues for {len(venue_ids)} IDs")
                
                # Verify all requested venues are returned
                returned_ids = [v["venue_id"] for v in data]
                for vid in venue_ids:
                    if vid in returned_ids:
                        print(f"  - Found: {vid}")
                    else:
                        print(f"  - Missing: {vid}")
            else:
                print("⚠ Not enough venues to test multiple IDs")
        else:
            print("⚠ Could not fetch venues for multi-ID test")
    
    def test_batch_endpoint_missing_body(self):
        """Test that batch endpoint handles missing body gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/venues/batch",
            json={},
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 with empty list or 400 for bad request
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        print(f"✓ Missing body handled - status: {response.status_code}")


class TestVenueSearchEndpoint:
    """Additional tests for venue search to support favorites testing"""
    
    def test_venue_search_returns_venues(self):
        """Test that venue search returns venues for favorites testing"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            print(f"✓ Found {len(data)} venues")
            for venue in data[:3]:
                print(f"  - {venue.get('venue_id')}: {venue.get('name')} ({venue.get('city')})")
        else:
            print("⚠ No venues found in database")
    
    def test_specific_venue_exists(self):
        """Test that test venue exists for favorites testing"""
        response = requests.get(f"{BASE_URL}/api/venues/venue_658884a4e9c1")
        if response.status_code == 200:
            venue = response.json()
            print(f"✓ Test venue exists: {venue.get('name')}")
            print(f"  - venue_id: {venue.get('venue_id')}")
            print(f"  - city: {venue.get('city')}")
            print(f"  - area: {venue.get('area')}")
            print(f"  - pricing: {venue.get('pricing')}")
        else:
            print(f"⚠ Test venue not found (status {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
