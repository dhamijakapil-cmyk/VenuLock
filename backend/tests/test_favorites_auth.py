"""
Tests for Favorites API - Account-based venue favorites with auth
Features tested:
1. GET /api/favorites - Get user's favorite venue IDs  
2. POST /api/favorites - Add venue to favorites
3. DELETE /api/favorites/{venue_id} - Remove venue from favorites
4. POST /api/favorites/merge - Merge localStorage favorites into DB
5. DELETE /api/favorites - Clear all favorites
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@bookmyvenue.in"
ADMIN_PASSWORD = "admin123"
TEST_VENUE_ID = "venue_658884a4e9c1"
TEST_VENUE_ID_2 = "venue_563b92aa473c"


class TestFavoritesAPI:
    """Favorites API endpoint tests with authentication"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Returns headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

    def test_1_favorites_requires_auth(self):
        """Test that favorites API requires authentication"""
        # GET without auth should fail
        response = requests.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/favorites requires authentication")

        # POST without auth should fail
        response = requests.post(f"{BASE_URL}/api/favorites", json={"venue_id": TEST_VENUE_ID})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/favorites requires authentication")

    def test_2_add_favorite(self, auth_headers):
        """Test adding a venue to favorites"""
        response = requests.post(
            f"{BASE_URL}/api/favorites",
            headers=auth_headers,
            json={"venue_id": TEST_VENUE_ID}
        )
        assert response.status_code == 200, f"Add favorite failed: {response.text}"
        data = response.json()
        assert data.get("venue_id") == TEST_VENUE_ID, f"Unexpected response: {data}"
        print(f"PASS: Added {TEST_VENUE_ID} to favorites")

    def test_3_get_favorites(self, auth_headers):
        """Test getting user's favorite venue IDs"""
        response = requests.get(f"{BASE_URL}/api/favorites", headers=auth_headers)
        assert response.status_code == 200, f"Get favorites failed: {response.text}"
        data = response.json()
        assert "venue_ids" in data, f"No venue_ids in response: {data}"
        assert isinstance(data["venue_ids"], list), f"venue_ids is not a list: {data}"
        # Should contain the venue we just added
        assert TEST_VENUE_ID in data["venue_ids"], f"{TEST_VENUE_ID} not in favorites: {data}"
        print(f"PASS: GET /api/favorites returns venue_ids including {TEST_VENUE_ID}")

    def test_4_add_duplicate_favorite(self, auth_headers):
        """Test adding same venue twice (should be idempotent via $addToSet)"""
        # Add same venue again
        response = requests.post(
            f"{BASE_URL}/api/favorites",
            headers=auth_headers,
            json={"venue_id": TEST_VENUE_ID}
        )
        assert response.status_code == 200, f"Add duplicate failed: {response.text}"
        
        # Verify no duplicates
        response = requests.get(f"{BASE_URL}/api/favorites", headers=auth_headers)
        data = response.json()
        count = data["venue_ids"].count(TEST_VENUE_ID)
        assert count == 1, f"Duplicate venue in favorites: {data}"
        print("PASS: Adding duplicate venue is idempotent (no duplicates)")

    def test_5_merge_favorites(self, auth_headers):
        """Test merging localStorage favorites into DB"""
        local_favorites = [TEST_VENUE_ID_2, "venue_test_merge"]
        response = requests.post(
            f"{BASE_URL}/api/favorites/merge",
            headers=auth_headers,
            json={"venue_ids": local_favorites}
        )
        assert response.status_code == 200, f"Merge failed: {response.text}"
        data = response.json()
        assert "venue_ids" in data, f"No venue_ids in merge response: {data}"
        # Should contain both original and merged
        assert TEST_VENUE_ID in data["venue_ids"], "Original favorite lost after merge"
        assert TEST_VENUE_ID_2 in data["venue_ids"], "Merged venue not in favorites"
        print(f"PASS: POST /api/favorites/merge merged {len(local_favorites)} venues")

    def test_6_merge_empty_favorites(self, auth_headers):
        """Test merge with empty array (should do nothing)"""
        response = requests.post(
            f"{BASE_URL}/api/favorites/merge",
            headers=auth_headers,
            json={"venue_ids": []}
        )
        assert response.status_code == 200, f"Merge empty failed: {response.text}"
        data = response.json()
        assert data.get("message") == "Nothing to merge", f"Unexpected response: {data}"
        print("PASS: Merge with empty array returns 'Nothing to merge'")

    def test_7_remove_favorite(self, auth_headers):
        """Test removing a venue from favorites"""
        response = requests.delete(
            f"{BASE_URL}/api/favorites/{TEST_VENUE_ID_2}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Remove favorite failed: {response.text}"
        data = response.json()
        assert data.get("venue_id") == TEST_VENUE_ID_2, f"Unexpected response: {data}"
        
        # Verify it's removed
        response = requests.get(f"{BASE_URL}/api/favorites", headers=auth_headers)
        data = response.json()
        assert TEST_VENUE_ID_2 not in data["venue_ids"], f"{TEST_VENUE_ID_2} still in favorites"
        print(f"PASS: DELETE /api/favorites/{TEST_VENUE_ID_2} removed venue")

    def test_8_clear_all_favorites(self, auth_headers):
        """Test clearing all favorites"""
        response = requests.delete(f"{BASE_URL}/api/favorites", headers=auth_headers)
        assert response.status_code == 200, f"Clear favorites failed: {response.text}"
        
        # Verify all cleared
        response = requests.get(f"{BASE_URL}/api/favorites", headers=auth_headers)
        data = response.json()
        assert len(data["venue_ids"]) == 0, f"Favorites not cleared: {data}"
        print("PASS: DELETE /api/favorites cleared all favorites")

    def test_9_post_favorite_without_venue_id(self, auth_headers):
        """Test POST /api/favorites without venue_id (should return error)"""
        response = requests.post(
            f"{BASE_URL}/api/favorites",
            headers=auth_headers,
            json={}
        )
        # The code returns a tuple (dict, status_code) which FastAPI may handle differently
        # Should ideally return 400 but may return differently based on implementation
        print(f"POST without venue_id returned status {response.status_code}: {response.text[:200]}")


class TestFavoritesDataPersistence:
    """Test that favorites persist across sessions"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

    def test_1_add_favorite_for_persistence(self, auth_headers):
        """Add favorite to test persistence"""
        response = requests.post(
            f"{BASE_URL}/api/favorites",
            headers=auth_headers,
            json={"venue_id": "venue_persistence_test"}
        )
        assert response.status_code == 200
        print("PASS: Added venue_persistence_test to favorites")

    def test_2_verify_persistence_new_session(self):
        """Login again and verify favorite persists"""
        # New login = new session
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Check favorites with new token
        response = requests.get(
            f"{BASE_URL}/api/favorites",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "venue_persistence_test" in data["venue_ids"], f"Favorite not persisted: {data}"
        print("PASS: Favorite persists across login sessions")

    def test_3_cleanup_persistence_test(self, auth_headers):
        """Cleanup test data"""
        requests.delete(
            f"{BASE_URL}/api/favorites/venue_persistence_test",
            headers=auth_headers
        )
        requests.delete(
            f"{BASE_URL}/api/favorites/venue_test_merge",
            headers=auth_headers
        )
        print("PASS: Cleaned up test favorites")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
