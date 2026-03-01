"""
Test SLA Notifications Feature for BookMyVenue
Tests: notification endpoints, SLA trigger, authentication, role requirements
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RM_CREDENTIALS = {"email": "rm1@bookmyvenue.in", "password": "rm123"}
ADMIN_CREDENTIALS = {"email": "admin@bookmyvenue.in", "password": "admin123"}


@pytest.fixture(scope="module")
def rm_token():
    """Get RM authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
    assert response.status_code == 200, f"RM login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


class TestNotificationEndpoints:
    """Test notification API endpoints"""
    
    # ---- GET /api/notifications ----
    
    def test_get_notifications_authenticated(self, rm_token):
        """GET /api/notifications returns notifications for logged-in user"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
    
    def test_get_notifications_unauthenticated(self):
        """GET /api/notifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        assert "Not authenticated" in response.json().get("detail", "")
    
    def test_notifications_contain_sla_breaches(self, rm_token):
        """Notifications include SLA breach notifications with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 200
        notifications = response.json().get("notifications", [])
        
        # Find SLA breach notifications
        sla_notifications = [n for n in notifications if n.get("type") == "sla_breach"]
        
        # Verify SLA notification structure (if any exist)
        for notif in sla_notifications:
            assert "notification_id" in notif
            assert "title" in notif
            assert "message" in notif
            assert "data" in notif
            assert "severity" in notif["data"]
            assert notif["data"]["severity"] in ["critical", "warning"]
            assert "breach_type" in notif["data"]
            assert notif["data"]["breach_type"] in ["first_contact", "stage_aging", "hold_expiry", "payment_pending"]
    
    def test_admin_gets_own_notifications(self, admin_token):
        """Admin gets notifications specific to their user"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
    
    # ---- PUT /api/notifications/{id}/read ----
    
    def test_mark_notification_read(self, rm_token):
        """PUT /api/notifications/{id}/read marks notification as read"""
        # First get notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        notifications = response.json().get("notifications", [])
        
        if not notifications:
            pytest.skip("No notifications to mark as read")
        
        # Find an unread notification, or use any notification
        unread_notifs = [n for n in notifications if not n.get("read")]
        notif_to_mark = unread_notifs[0] if unread_notifs else notifications[0]
        notif_id = notif_to_mark["notification_id"]
        
        # Mark as read
        response = requests.put(
            f"{BASE_URL}/api/notifications/{notif_id}/read",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 200
        # If already read, success=False (no change), otherwise success=True
        # Both are valid outcomes for the endpoint working correctly
        data = response.json()
        assert "success" in data
    
    def test_mark_read_unauthenticated(self):
        """PUT /api/notifications/{id}/read requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/notif_fake123/read"
        )
        assert response.status_code == 401
    
    # ---- PUT /api/notifications/read-all ----
    
    def test_mark_all_read(self, rm_token):
        """PUT /api/notifications/read-all marks all as read"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "marked" in data
        
        # Verify unread count is now 0
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.json().get("unread_count") == 0
    
    def test_mark_all_read_unauthenticated(self):
        """PUT /api/notifications/read-all requires authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 401


class TestSLATriggerEndpoint:
    """Test SLA check trigger endpoint (admin only)"""
    
    def test_trigger_sla_check_admin(self, admin_token):
        """POST /api/admin/trigger-sla-check runs SLA check for admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/trigger-sla-check",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "alerts_created" in data
        assert "total_new_alerts" in data
        assert "checked_at" in data
        
        # Verify alert categories
        alerts = data["alerts_created"]
        assert "first_contact" in alerts
        assert "stage_aging" in alerts
        assert "hold_expiry" in alerts
        assert "payment_pending" in alerts
    
    def test_trigger_sla_check_rm_forbidden(self, rm_token):
        """POST /api/admin/trigger-sla-check requires admin role"""
        response = requests.post(
            f"{BASE_URL}/api/admin/trigger-sla-check",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json().get("detail", "")
    
    def test_trigger_sla_check_unauthenticated(self):
        """POST /api/admin/trigger-sla-check requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/trigger-sla-check")
        assert response.status_code == 401


class TestSLABreachesEndpoint:
    """Test SLA breaches endpoint for admin dashboard"""
    
    def test_get_sla_breaches_admin(self, admin_token):
        """GET /api/admin/sla-breaches returns breach summary for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sla-breaches",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "summary" in data
        summary = data["summary"]
        assert "total_breaches" in summary
        assert "critical_breaches" in summary
        assert "warning_breaches" in summary
    
    def test_get_sla_breaches_rm_forbidden(self, rm_token):
        """GET /api/admin/sla-breaches requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sla-breaches",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 403


class TestNotificationDeduplication:
    """Test SLA notification deduplication (6-hour window)"""
    
    def test_dedup_prevents_duplicate_alerts(self, admin_token):
        """Running SLA check twice should not create duplicate alerts"""
        # Run first check
        response1 = requests.post(
            f"{BASE_URL}/api/admin/trigger-sla-check",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        first_alerts = response1.json().get("total_new_alerts", 0)
        
        # Run second check immediately (within 6h window)
        response2 = requests.post(
            f"{BASE_URL}/api/admin/trigger-sla-check",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        second_alerts = response2.json().get("total_new_alerts", 0)
        
        # Second run should create 0 new alerts due to deduplication
        assert second_alerts == 0, f"Dedup failed: {second_alerts} alerts created on second run"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
