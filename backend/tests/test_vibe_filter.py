"""
Test suite for Vibe-based filtering feature.
Tests backend API filtering by vibe and combined filters.
Vibe distribution: Royal=25, Modern=23, Grand Ballroom=18, Intimate=17, Heritage=12, Garden=9, Poolside=4
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVibeFilterAPI:
    """Tests for GET /api/venues with vibe query parameter"""
    
    def test_api_health(self):
        """Test that venues API is accessible"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=5")
        assert response.status_code == 200, f"API not accessible: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"[PASS] API accessible, returned {len(data)} venues")
    
    def test_vibe_filter_royal(self):
        """Test filtering by Royal vibe - should return only Royal venues"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Royal&limit=200")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        # Check all returned venues have Royal in their vibes
        non_matching = []
        for venue in data:
            vibes = venue.get('vibes', [])
            if 'Royal' not in vibes:
                non_matching.append({
                    'name': venue.get('name'),
                    'vibes': vibes
                })
        
        assert len(non_matching) == 0, f"Found venues without Royal vibe: {non_matching[:5]}"
        print(f"[PASS] Royal filter: {len(data)} venues returned, all have Royal vibe")
        
        # Verify we got a reasonable count (expected ~25)
        assert len(data) >= 10, f"Expected at least 10 Royal venues, got {len(data)}"
    
    def test_vibe_filter_poolside(self):
        """Test filtering by Poolside vibe - should return only Poolside venues"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Poolside&limit=200")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        # Check all returned venues have Poolside in their vibes
        non_matching = []
        for venue in data:
            vibes = venue.get('vibes', [])
            if 'Poolside' not in vibes:
                non_matching.append({
                    'name': venue.get('name'),
                    'vibes': vibes
                })
        
        assert len(non_matching) == 0, f"Found venues without Poolside vibe: {non_matching[:5]}"
        print(f"[PASS] Poolside filter: {len(data)} venues returned, all have Poolside vibe")
        
        # Poolside has ~4 venues
        assert len(data) >= 2, f"Expected at least 2 Poolside venues, got {len(data)}"
    
    def test_vibe_filter_intimate(self):
        """Test filtering by Intimate vibe - should return only Intimate venues"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Intimate&limit=200")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        # Check all returned venues have Intimate in their vibes
        non_matching = []
        for venue in data:
            vibes = venue.get('vibes', [])
            if 'Intimate' not in vibes:
                non_matching.append({
                    'name': venue.get('name'),
                    'vibes': vibes
                })
        
        assert len(non_matching) == 0, f"Found venues without Intimate vibe: {non_matching[:5]}"
        print(f"[PASS] Intimate filter: {len(data)} venues returned, all have Intimate vibe")
        
        # Intimate has ~17 venues
        assert len(data) >= 5, f"Expected at least 5 Intimate venues, got {len(data)}"
    
    def test_vibe_filter_grand_ballroom(self):
        """Test filtering by Grand Ballroom vibe with space in name"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Grand%20Ballroom&limit=200")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        # Check all returned venues have Grand Ballroom in their vibes
        non_matching = []
        for venue in data:
            vibes = venue.get('vibes', [])
            if 'Grand Ballroom' not in vibes:
                non_matching.append({
                    'name': venue.get('name'),
                    'vibes': vibes
                })
        
        assert len(non_matching) == 0, f"Found venues without Grand Ballroom vibe: {non_matching[:5]}"
        print(f"[PASS] Grand Ballroom filter: {len(data)} venues returned, all have Grand Ballroom vibe")
    
    def test_vibe_combined_with_city_delhi(self):
        """Test vibe=Royal combined with city=Delhi"""
        response = requests.get(f"{BASE_URL}/api/venues?vibe=Royal&city=Delhi&limit=200")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        # Check all returned venues have Royal vibe AND are in Delhi
        non_matching = []
        for venue in data:
            vibes = venue.get('vibes', [])
            city = venue.get('city', '')
            if 'Royal' not in vibes:
                non_matching.append({'issue': 'missing Royal vibe', 'venue': venue.get('name'), 'vibes': vibes})
            if 'Delhi' not in city:
                non_matching.append({'issue': 'wrong city', 'venue': venue.get('name'), 'city': city})
        
        assert len(non_matching) == 0, f"Found non-matching venues: {non_matching[:5]}"
        print(f"[PASS] Royal + Delhi filter: {len(data)} venues returned")
    
    def test_all_vibes_return_results(self):
        """Test that all 7 vibe types return results"""
        vibes = ['Royal', 'Modern', 'Garden', 'Poolside', 'Heritage', 'Intimate', 'Grand Ballroom']
        results = {}
        
        for vibe in vibes:
            response = requests.get(f"{BASE_URL}/api/venues?vibe={vibe}&limit=200")
            assert response.status_code == 200, f"Failed for vibe {vibe}: {response.status_code}"
            data = response.json()
            results[vibe] = len(data)
            assert len(data) > 0, f"No venues returned for vibe: {vibe}"
        
        print(f"[PASS] All vibes return results:")
        for vibe, count in results.items():
            print(f"  - {vibe}: {count} venues")
    
    def test_no_vibe_filter_returns_all(self):
        """Test that no vibe filter returns all approved venues"""
        # Get count without vibe filter
        response_all = requests.get(f"{BASE_URL}/api/venues?limit=200")
        assert response_all.status_code == 200
        all_count = len(response_all.json())
        
        # Get count with Royal vibe
        response_royal = requests.get(f"{BASE_URL}/api/venues?vibe=Royal&limit=200")
        assert response_royal.status_code == 200
        royal_count = len(response_royal.json())
        
        # No filter should return more venues than filtered
        assert all_count >= royal_count, f"All venues ({all_count}) should be >= Royal ({royal_count})"
        print(f"[PASS] No filter: {all_count} venues, Royal filter: {royal_count} venues")
    
    def test_venues_have_vibes_field(self):
        """Test that venues include vibes array in response"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        # Check that venues have vibes field
        venues_with_vibes = 0
        for venue in data:
            if 'vibes' in venue and isinstance(venue.get('vibes'), list):
                venues_with_vibes += 1
        
        print(f"[INFO] {venues_with_vibes}/{len(data)} venues have vibes array in response")
        # At least some venues should have vibes
        assert venues_with_vibes > 0 or len(data) == 0, "No venues have vibes field"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
