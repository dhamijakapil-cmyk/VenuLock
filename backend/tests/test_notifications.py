"""
Test notification endpoints for VenuLoQ API.
Tests: GET /api/notifications, PUT /api/notifications/{id}/read, PUT /api/notifications/read-all
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for customer user."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestNotificationsEndpoints:
    """Test notification API endpoints."""

    def test_get_notifications_requires_auth(self):
        """Test GET /api/notifications returns 401 without auth."""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/notifications requires authentication")

    def test_get_notifications_success(self, auth_headers):
        """Test GET /api/notifications returns notifications list."""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications" in data, "Response should have 'notifications' key"
        assert "unread_count" in data, "Response should have 'unread_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        
        print(f"PASS: GET /api/notifications returns {len(data['notifications'])} notifications, {data['unread_count']} unread")

    def test_get_notifications_with_limit(self, auth_headers):
        """Test GET /api/notifications with limit parameter."""
        response = requests.get(f"{BASE_URL}/api/notifications?limit=5", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["notifications"]) <= 5, "Should respect limit parameter"
        print(f"PASS: GET /api/notifications with limit returns <= 5 notifications")

    def test_get_notifications_unread_only(self, auth_headers):
        """Test GET /api/notifications with unread_only parameter."""
        response = requests.get(f"{BASE_URL}/api/notifications?unread_only=true", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned notifications should be unread
        for notif in data["notifications"]:
            assert notif.get("read") == False or notif.get("read") is False, "All notifications should be unread"
        print(f"PASS: GET /api/notifications?unread_only=true returns only unread notifications")

    def test_notifications_structure(self, auth_headers):
        """Test notification response structure has required fields."""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data["notifications"]) > 0:
            notif = data["notifications"][0]
            # Check expected fields
            assert "notification_id" in notif, "Notification should have notification_id"
            assert "title" in notif, "Notification should have title"
            assert "message" in notif, "Notification should have message"
            assert "read" in notif, "Notification should have read status"
            assert "created_at" in notif, "Notification should have created_at"
            print(f"PASS: Notification structure is correct - has notification_id, title, message, read, created_at")
        else:
            print("SKIP: No notifications to verify structure")


class TestMarkNotificationRead:
    """Test mark notification as read endpoints."""

    def test_mark_read_requires_auth(self):
        """Test PUT /api/notifications/{id}/read requires auth."""
        response = requests.put(f"{BASE_URL}/api/notifications/test-id/read")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: PUT /api/notifications/{id}/read requires authentication")

    def test_mark_all_read_requires_auth(self):
        """Test PUT /api/notifications/read-all requires auth."""
        response = requests.put(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: PUT /api/notifications/read-all requires authentication")

    def test_mark_all_read_success(self, auth_headers):
        """Test PUT /api/notifications/read-all marks all as read."""
        response = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' key"
        assert data["success"] == True, "success should be True"
        print(f"PASS: PUT /api/notifications/read-all returns success=True, marked={data.get('marked', 'N/A')}")

    def test_after_mark_all_read_unread_is_zero(self, auth_headers):
        """Test that unread_count is 0 after marking all as read."""
        # First mark all as read
        requests.put(f"{BASE_URL}/api/notifications/read-all", headers=auth_headers)
        
        # Then check unread count
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["unread_count"] == 0, f"Expected unread_count=0, got {data['unread_count']}"
        print("PASS: After mark-all-read, unread_count is 0")


class TestMarkSingleNotificationRead:
    """Test marking single notification as read."""

    def test_mark_single_notification_read(self, auth_headers):
        """Test PUT /api/notifications/{id}/read for specific notification."""
        # First get notifications to find an ID
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        data = response.json()
        
        if len(data["notifications"]) == 0:
            pytest.skip("No notifications to test marking as read")
        
        notif_id = data["notifications"][0]["notification_id"]
        
        # Mark as read
        response = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert "success" in result, "Response should have 'success' key"
        print(f"PASS: PUT /api/notifications/{notif_id}/read returns success={result['success']}")

    def test_mark_nonexistent_notification_read(self, auth_headers):
        """Test marking non-existent notification returns success=false or still 200."""
        response = requests.put(
            f"{BASE_URL}/api/notifications/nonexistent-id-12345/read", 
            headers=auth_headers
        )
        # Should return 200 with success=false (no document matched)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert result.get("success") == False, "success should be False for non-existent notification"
        print("PASS: Marking non-existent notification returns success=false")
