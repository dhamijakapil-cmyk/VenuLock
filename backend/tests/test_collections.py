"""
Collections (Wishlist) Feature Backend Tests
Tests all CRUD operations for collections including:
- Create collection (with/without venue)
- Get user collections
- Get single collection with venue details
- Update collection (name, is_public)
- Delete collection
- Add venue to collection
- Remove venue from collection
- Public shared collection access
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"


class TestCollectionsAuth:
    """Test authentication for collections endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for customer user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Create headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_collections_require_auth(self):
        """Collections endpoints should require authentication"""
        # GET /api/collections without auth
        response = requests.get(f"{BASE_URL}/api/collections")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
    def test_login_success(self, auth_token):
        """Verify customer login works"""
        assert auth_token is not None
        assert len(auth_token) > 10


class TestCollectionsCRUD:
    """Test CRUD operations for collections"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_venue_id(self, auth_headers):
        """Get a real venue ID for testing"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=1")
        assert response.status_code == 200
        venues = response.json()
        assert len(venues) > 0, "No venues found in database"
        return venues[0]["venue_id"]
    
    @pytest.fixture(scope="class")
    def created_collection(self, auth_headers):
        """Create a test collection and return it"""
        timestamp = int(time.time())
        name = f"TEST_Collection_{timestamp}"
        response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": name}
        )
        assert response.status_code == 200, f"Failed to create collection: {response.text}"
        collection = response.json()["collection"]
        yield collection
        # Cleanup: delete the collection
        requests.delete(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
    
    def test_create_collection(self, auth_headers):
        """POST /api/collections - Create a new collection"""
        timestamp = int(time.time())
        name = f"TEST_Wedding_Venues_{timestamp}"
        response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": name}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "collection" in data
        collection = data["collection"]
        
        # Validate structure
        assert "collection_id" in collection
        assert collection["collection_id"].startswith("col_")
        assert collection["name"] == name
        assert collection["venue_ids"] == []
        assert "share_token" in collection
        assert len(collection["share_token"]) == 8
        assert collection["is_public"] == False
        assert "created_at" in collection
        assert "updated_at" in collection
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
        print(f"✓ Created collection: {collection['collection_id']}")
    
    def test_create_collection_with_venue(self, auth_headers, test_venue_id):
        """POST /api/collections - Create collection with initial venue"""
        timestamp = int(time.time())
        name = f"TEST_With_Venue_{timestamp}"
        response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": name, "venue_id": test_venue_id}
        )
        assert response.status_code == 200
        
        collection = response.json()["collection"]
        assert test_venue_id in collection["venue_ids"]
        assert collection["venue_count"] == 1
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
        print(f"✓ Created collection with venue: {collection['collection_id']}")
    
    def test_create_collection_empty_name_fails(self, auth_headers):
        """POST /api/collections - Empty name should fail"""
        response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": "  "}
        )
        assert response.status_code == 400
        assert "required" in response.json()["detail"].lower()
        print("✓ Empty name validation works")
    
    def test_create_duplicate_name_fails(self, auth_headers, created_collection):
        """POST /api/collections - Duplicate name should fail"""
        response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": created_collection["name"]}
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
        print("✓ Duplicate name validation works")
    
    def test_get_collections(self, auth_headers, created_collection):
        """GET /api/collections - Get user's collections"""
        response = requests.get(
            f"{BASE_URL}/api/collections",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "collections" in data
        assert isinstance(data["collections"], list)
        
        # Verify our test collection is in the list
        collection_ids = [c["collection_id"] for c in data["collections"]]
        assert created_collection["collection_id"] in collection_ids
        
        # Each collection should have venue_count and cover_image
        for c in data["collections"]:
            assert "venue_count" in c
            assert "cover_image" in c
        
        print(f"✓ Got {len(data['collections'])} collections")
    
    def test_get_single_collection(self, auth_headers, created_collection):
        """GET /api/collections/:id - Get single collection with venue details"""
        response = requests.get(
            f"{BASE_URL}/api/collections/{created_collection['collection_id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "collection" in data
        collection = data["collection"]
        
        assert collection["collection_id"] == created_collection["collection_id"]
        assert collection["name"] == created_collection["name"]
        assert "venues" in collection  # Should have full venue details array
        assert "venue_count" in collection
        
        print(f"✓ Got collection details: {collection['name']}")
    
    def test_get_nonexistent_collection_404(self, auth_headers):
        """GET /api/collections/:id - Nonexistent collection should 404"""
        response = requests.get(
            f"{BASE_URL}/api/collections/col_nonexistent123",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Nonexistent collection returns 404")
    
    def test_update_collection_name(self, auth_headers, created_collection):
        """PUT /api/collections/:id - Update collection name"""
        new_name = f"UPDATED_{created_collection['name']}"
        response = requests.put(
            f"{BASE_URL}/api/collections/{created_collection['collection_id']}",
            headers=auth_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200
        
        updated = response.json()["collection"]
        assert updated["name"] == new_name
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{created_collection['collection_id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["collection"]["name"] == new_name
        
        print(f"✓ Updated collection name to: {new_name}")
    
    def test_update_collection_is_public(self, auth_headers, created_collection):
        """PUT /api/collections/:id - Update is_public flag"""
        response = requests.put(
            f"{BASE_URL}/api/collections/{created_collection['collection_id']}",
            headers=auth_headers,
            json={"is_public": True}
        )
        assert response.status_code == 200
        
        updated = response.json()["collection"]
        assert updated["is_public"] == True
        
        # Toggle back
        response2 = requests.put(
            f"{BASE_URL}/api/collections/{created_collection['collection_id']}",
            headers=auth_headers,
            json={"is_public": False}
        )
        assert response2.status_code == 200
        assert response2.json()["collection"]["is_public"] == False
        
        print("✓ Updated is_public flag (toggle works)")
    
    def test_update_empty_name_fails(self, auth_headers, created_collection):
        """PUT /api/collections/:id - Empty name should fail"""
        response = requests.put(
            f"{BASE_URL}/api/collections/{created_collection['collection_id']}",
            headers=auth_headers,
            json={"name": "  "}
        )
        assert response.status_code == 400
        print("✓ Empty name update validation works")


class TestCollectionVenues:
    """Test adding/removing venues from collections"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_venues(self, auth_headers):
        """Get multiple venue IDs for testing"""
        response = requests.get(f"{BASE_URL}/api/venues?limit=3")
        venues = response.json()
        assert len(venues) >= 2, "Need at least 2 venues for testing"
        return [v["venue_id"] for v in venues[:2]]
    
    @pytest.fixture(scope="class")
    def test_collection(self, auth_headers):
        """Create collection for venue tests"""
        timestamp = int(time.time())
        response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": f"TEST_VenueOps_{timestamp}"}
        )
        collection = response.json()["collection"]
        yield collection
        requests.delete(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
    
    def test_add_venue_to_collection(self, auth_headers, test_collection, test_venues):
        """POST /api/collections/:id/venues/:venue_id - Add venue"""
        venue_id = test_venues[0]
        response = requests.post(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}/venues/{venue_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Venue added"
        assert response.json()["venue_id"] == venue_id
        
        # Verify venue is in collection
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}",
            headers=auth_headers
        )
        collection = get_response.json()["collection"]
        assert venue_id in collection["venue_ids"]
        assert collection["venue_count"] >= 1
        
        print(f"✓ Added venue {venue_id} to collection")
    
    def test_add_duplicate_venue_idempotent(self, auth_headers, test_collection, test_venues):
        """POST /api/collections/:id/venues/:venue_id - Adding same venue twice is idempotent"""
        venue_id = test_venues[0]
        # Add again
        response = requests.post(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}/venues/{venue_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Count should still be 1 (uses $addToSet)
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}",
            headers=auth_headers
        )
        venue_ids = get_response.json()["collection"]["venue_ids"]
        assert venue_ids.count(venue_id) == 1
        
        print("✓ Duplicate add is idempotent")
    
    def test_add_second_venue(self, auth_headers, test_collection, test_venues):
        """Add a second venue to collection"""
        venue_id = test_venues[1]
        response = requests.post(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}/venues/{venue_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify both venues present
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}",
            headers=auth_headers
        )
        collection = get_response.json()["collection"]
        assert test_venues[0] in collection["venue_ids"]
        assert test_venues[1] in collection["venue_ids"]
        
        print(f"✓ Added second venue, collection now has {collection['venue_count']} venues")
    
    def test_remove_venue_from_collection(self, auth_headers, test_collection, test_venues):
        """DELETE /api/collections/:id/venues/:venue_id - Remove venue"""
        venue_id = test_venues[1]
        response = requests.delete(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}/venues/{venue_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Venue removed"
        
        # Verify venue is removed
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}",
            headers=auth_headers
        )
        collection = get_response.json()["collection"]
        assert venue_id not in collection["venue_ids"]
        
        print(f"✓ Removed venue {venue_id} from collection")
    
    def test_collection_has_venue_details(self, auth_headers, test_collection, test_venues):
        """Collection GET should return full venue details"""
        # Ensure at least one venue is in collection
        venue_id = test_venues[0]
        requests.post(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}/venues/{venue_id}",
            headers=auth_headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/collections/{test_collection['collection_id']}",
            headers=auth_headers
        )
        collection = response.json()["collection"]
        
        # Should have venues array with details
        assert "venues" in collection
        assert len(collection["venues"]) >= 1
        
        venue = collection["venues"][0]
        # Verify venue has expected fields
        assert "venue_id" in venue
        assert "name" in venue
        assert "city" in venue
        
        print(f"✓ Collection returns venue details: {venue['name']}")


class TestSharedCollections:
    """Test public shared collection access"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def public_collection(self, auth_headers):
        """Create a public collection with venues"""
        # Get a venue
        venues_response = requests.get(f"{BASE_URL}/api/venues?limit=1")
        venue_id = venues_response.json()[0]["venue_id"]
        
        # Create collection with venue
        timestamp = int(time.time())
        create_response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": f"TEST_Public_{timestamp}", "venue_id": venue_id}
        )
        collection = create_response.json()["collection"]
        
        # Make it public
        requests.put(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers,
            json={"is_public": True}
        )
        
        # Refresh to get updated is_public
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
        collection = get_response.json()["collection"]
        
        yield collection
        
        requests.delete(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
    
    def test_shared_collection_access_no_auth(self, public_collection):
        """GET /api/collections/shared/:token - No auth required for public"""
        share_token = public_collection["share_token"]
        
        # Access WITHOUT auth headers
        response = requests.get(f"{BASE_URL}/api/collections/shared/{share_token}")
        assert response.status_code == 200
        
        data = response.json()
        assert "collection" in data
        collection = data["collection"]
        
        assert collection["name"] == public_collection["name"]
        assert "venues" in collection
        assert "owner_name" in collection
        assert "venue_count" in collection
        
        print(f"✓ Accessed shared collection (no auth): {collection['name']}")
    
    def test_shared_collection_has_venue_details(self, public_collection):
        """Shared collection should include venue details"""
        share_token = public_collection["share_token"]
        response = requests.get(f"{BASE_URL}/api/collections/shared/{share_token}")
        
        collection = response.json()["collection"]
        assert len(collection["venues"]) >= 1
        
        venue = collection["venues"][0]
        assert "venue_id" in venue
        assert "name" in venue
        assert "city" in venue
        
        print(f"✓ Shared collection has venue details")
    
    def test_private_collection_not_shared(self, auth_headers):
        """Private collections should not be accessible via share token"""
        # Create a private collection
        timestamp = int(time.time())
        create_response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": f"TEST_Private_{timestamp}"}
        )
        collection = create_response.json()["collection"]
        assert collection["is_public"] == False
        
        # Try to access via share token (should 404)
        response = requests.get(
            f"{BASE_URL}/api/collections/shared/{collection['share_token']}"
        )
        assert response.status_code == 404
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/collections/{collection['collection_id']}",
            headers=auth_headers
        )
        
        print("✓ Private collection not accessible via share token")
    
    def test_invalid_share_token_404(self):
        """Invalid share token should return 404"""
        response = requests.get(f"{BASE_URL}/api/collections/shared/invalid123")
        assert response.status_code == 404
        print("✓ Invalid share token returns 404")


class TestCollectionDelete:
    """Test collection deletion"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_delete_collection(self, auth_headers):
        """DELETE /api/collections/:id - Delete collection"""
        # Create a collection to delete
        timestamp = int(time.time())
        create_response = requests.post(
            f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": f"TEST_ToDelete_{timestamp}"}
        )
        collection = create_response.json()["collection"]
        collection_id = collection["collection_id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/collections/{collection_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Collection deleted"
        
        # Verify it's gone
        get_response = requests.get(
            f"{BASE_URL}/api/collections/{collection_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        
        print(f"✓ Deleted collection {collection_id}")
    
    def test_delete_nonexistent_collection_404(self, auth_headers):
        """DELETE /api/collections/:id - Deleting nonexistent should 404"""
        response = requests.delete(
            f"{BASE_URL}/api/collections/col_nonexistent123",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Deleting nonexistent collection returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
