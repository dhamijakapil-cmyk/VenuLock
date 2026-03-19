"""
Push Notification API Tests for VenuLoQ
Tests: VAPID key endpoint, subscribe, unsubscribe, test notification
Also verifies collections route is removed (404)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "democustomer@venulock.in"
TEST_PASSWORD = "password123"

# Test subscription data
TEST_SUBSCRIPTION = {
    "endpoint": "https://test.example.com/push/pytest_test_endpoint_123",
    "keys": {
        "p256dh": "test_p256dh_key_pytest",
        "auth": "test_auth_key_pytest"
    }
}


class TestPushNotificationAPIs:
    """Push notification endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    # ==================== VAPID Public Key ====================
    
    def test_vapid_public_key_returns_key(self):
        """GET /api/push/vapid-public-key returns a valid public key (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "public_key" in data, "Response should contain 'public_key'"
        
        # Verify key is a non-empty string (VAPID key is base64url encoded)
        public_key = data["public_key"]
        assert isinstance(public_key, str), "public_key should be a string"
        assert len(public_key) > 50, "VAPID public key should be substantial length"
        
        print(f"PASS: VAPID public key returned (length: {len(public_key)})")

    # ==================== Subscribe ====================
    
    def test_subscribe_requires_auth(self):
        """POST /api/push/subscribe without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json=TEST_SUBSCRIPTION
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: Subscribe endpoint requires auth (returned {response.status_code})")
    
    def test_subscribe_with_auth_success(self, auth_headers):
        """POST /api/push/subscribe with auth token stores subscription"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers=auth_headers,
            json=TEST_SUBSCRIPTION
        )
        
        assert response.status_code == 200, f"Subscribe failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("success") == True, "Response should indicate success"
        print("PASS: Subscribe endpoint stores subscription successfully")

    # ==================== Test Push ====================
    
    def test_push_requires_auth(self):
        """POST /api/push/test without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/push/test")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: Test push endpoint requires auth (returned {response.status_code})")
    
    def test_push_with_auth_success(self, auth_headers):
        """POST /api/push/test with auth returns success (sent:0 expected as no real subscriptions)"""
        response = requests.post(
            f"{BASE_URL}/api/push/test",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Test push failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should indicate success"
        assert "sent" in data, "Response should contain 'sent' count"
        
        # sent can be 0 or more depending on active subscriptions
        assert isinstance(data["sent"], int), "'sent' should be an integer"
        print(f"PASS: Test push endpoint returned success with sent={data['sent']}")

    # ==================== Unsubscribe ====================
    
    def test_unsubscribe_requires_auth(self):
        """DELETE /api/push/unsubscribe without auth should return 401"""
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            json=TEST_SUBSCRIPTION
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: Unsubscribe endpoint requires auth (returned {response.status_code})")
    
    def test_unsubscribe_with_auth_success(self, auth_headers):
        """DELETE /api/push/unsubscribe with auth removes subscription"""
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            headers=auth_headers,
            json=TEST_SUBSCRIPTION
        )
        
        assert response.status_code == 200, f"Unsubscribe failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("success") == True, "Response should indicate success"
        print("PASS: Unsubscribe endpoint removes subscription successfully")


class TestCollectionsRouteRemoved:
    """Verify collections route has been removed"""
    
    def test_collections_route_returns_404(self):
        """GET /api/collections should return 404 (route removed)"""
        response = requests.get(f"{BASE_URL}/api/collections")
        
        assert response.status_code == 404, f"Expected 404 for removed collections route, got {response.status_code}"
        print("PASS: Collections route correctly returns 404 (removed)")
    
    def test_collections_route_with_id_returns_404(self):
        """GET /api/collections/{id} should return 404 (route removed)"""
        response = requests.get(f"{BASE_URL}/api/collections/some_collection_id")
        
        assert response.status_code == 404, f"Expected 404 for removed collections route, got {response.status_code}"
        print("PASS: Collections route with ID correctly returns 404 (removed)")


class TestServiceWorkerExists:
    """Verify service worker file exists and has push handler"""
    
    def test_service_worker_accessible(self):
        """GET /sw.js should return service worker file"""
        response = requests.get(f"{BASE_URL}/sw.js")
        
        assert response.status_code == 200, f"Service worker not accessible: {response.status_code}"
        
        content = response.text
        
        # Verify push event handler exists
        assert "self.addEventListener('push'" in content, "Service worker should have push event listener"
        
        # Verify notification click handler exists  
        assert "self.addEventListener('notificationclick'" in content, "Service worker should have notificationclick listener"
        
        print("PASS: Service worker exists with push and notificationclick handlers")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
