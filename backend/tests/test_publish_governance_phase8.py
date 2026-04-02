"""
VenuLoQ Phase 8 — Publish Governance API Tests
Tests for supply activation: readiness gate, visibility controls, version discipline,
audit trail, and ranking eligibility posture.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
VENUE_MANAGER_EMAIL = "venuemanager@venuloq.in"
VENUE_MANAGER_PASSWORD = "test123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"

# Test acquisition IDs (seeded data)
ACQ_LIVE_001 = "acq_pub_test_001"  # Grand Heritage Palace - published_live, eligible
ACQ_LIVE_002 = "acq_pub_test_002"  # Sunset Garden Resort - published_live with draft, eligible
ACQ_NOT_READY = "acq_pub_test_003"  # Skyline Banquet - owner_onboarding_completed, not_ready 5/7


@pytest.fixture(scope="module")
def venue_manager_token():
    """Get venue_manager auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": VENUE_MANAGER_EMAIL,
        "password": VENUE_MANAGER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Venue manager login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def rm_token():
    """Get RM auth token (should NOT have publish access)."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"RM login failed: {response.status_code} - {response.text}")


class TestPublishQueueEndpoint:
    """Tests for GET /api/publish/queue"""

    def test_queue_requires_auth(self):
        """Queue endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/publish/queue")
        assert response.status_code == 401

    def test_queue_rm_forbidden(self, rm_token):
        """RM role should NOT have access to publish queue."""
        response = requests.get(
            f"{BASE_URL}/api/publish/queue",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 403

    def test_queue_venue_manager_access(self, venue_manager_token):
        """Venue manager can access publish queue."""
        response = requests.get(
            f"{BASE_URL}/api/publish/queue",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "count" in data
        assert "stats" in data

    def test_queue_tab_ready(self, venue_manager_token):
        """Queue with tab=ready returns ready/onboarding_completed venues."""
        response = requests.get(
            f"{BASE_URL}/api/publish/queue?tab=ready",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # All items should be in ready statuses
        for item in data.get("items", []):
            assert item["status"] in ["owner_onboarding_completed", "publish_ready"]

    def test_queue_tab_live(self, venue_manager_token):
        """Queue with tab=live returns published_live venues."""
        response = requests.get(
            f"{BASE_URL}/api/publish/queue?tab=live",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for item in data.get("items", []):
            assert item["status"] == "published_live"

    def test_queue_items_have_readiness_posture(self, venue_manager_token):
        """Queue items include publish_readiness and readiness_score."""
        response = requests.get(
            f"{BASE_URL}/api/publish/queue",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if data.get("items"):
            item = data["items"][0]
            assert "publish_readiness" in item
            assert "readiness_score" in item
            assert item["publish_readiness"] in ["ready", "ready_with_override", "not_ready"]


class TestReadinessEndpoint:
    """Tests for GET /api/publish/{acq_id}/readiness - 7-point readiness gate"""

    def test_readiness_requires_auth(self):
        """Readiness endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/readiness")
        assert response.status_code == 401

    def test_readiness_returns_7_checks(self, venue_manager_token):
        """Readiness returns 7 checks."""
        response = requests.get(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/readiness",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "overall" in data
        assert "checks" in data
        assert "passed_count" in data
        assert "total_count" in data
        assert data["total_count"] == 7
        
        # Verify check IDs
        check_ids = [c["id"] for c in data["checks"]]
        expected_ids = [
            "owner_onboarding", "identity_fields", "media_minimum",
            "pricing_posture", "publishable_summary", "no_risk_flags", "venue_active"
        ]
        for expected in expected_ids:
            assert expected in check_ids, f"Missing check: {expected}"

    def test_readiness_check_structure(self, venue_manager_token):
        """Each check has required fields."""
        response = requests.get(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/readiness",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for check in data["checks"]:
            assert "id" in check
            assert "label" in check
            assert "passed" in check
            assert "detail" in check
            assert "required" in check

    def test_readiness_not_found(self, venue_manager_token):
        """Readiness returns 404 for non-existent acquisition."""
        response = requests.get(
            f"{BASE_URL}/api/publish/acq_nonexistent/readiness",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 404


class TestPreviewEndpoint:
    """Tests for GET /api/publish/{acq_id}/preview - public venue card preview"""

    def test_preview_requires_auth(self):
        """Preview endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/preview")
        assert response.status_code == 401

    def test_preview_returns_public_schema(self, venue_manager_token):
        """Preview returns data matching public venues collection schema."""
        response = requests.get(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/preview",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check public venue schema fields
        assert "venue_id" in data
        assert "name" in data
        assert "slug" in data
        assert "city" in data
        assert "area" in data
        assert "venue_type" in data
        assert "capacity_min" in data
        assert "capacity_max" in data
        assert "pricing" in data
        assert "images" in data
        assert "description" in data
        
        # Preview-specific fields
        assert data.get("_preview") == True
        assert "acquisition_id" in data
        assert "current_status" in data
        assert "ranking_eligibility" in data


class TestPublishEndpoint:
    """Tests for POST /api/publish/{acq_id}/publish"""

    def test_publish_requires_auth(self):
        """Publish endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_NOT_READY}/publish", json={})
        assert response.status_code == 401

    def test_publish_rm_forbidden(self, rm_token):
        """RM role cannot publish."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_NOT_READY}/publish",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={}
        )
        assert response.status_code == 403

    def test_publish_blocked_when_not_ready(self, venue_manager_token):
        """Publish is blocked when readiness is not_ready."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_NOT_READY}/publish",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={}
        )
        # Should fail with 400 due to readiness checks
        assert response.status_code == 400
        assert "blocked" in response.json().get("detail", "").lower() or "not" in response.json().get("detail", "").lower()


class TestUnpublishEndpoint:
    """Tests for POST /api/publish/{acq_id}/unpublish"""

    def test_unpublish_requires_auth(self):
        """Unpublish endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/unpublish", json={"reason": "test"})
        assert response.status_code == 401

    def test_unpublish_requires_reason(self, venue_manager_token):
        """Unpublish requires a reason."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/unpublish",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={}
        )
        # Should fail validation - reason is required
        assert response.status_code == 422 or response.status_code == 400


class TestHideUnhideEndpoints:
    """Tests for POST /api/publish/{acq_id}/hide and /unhide"""

    def test_hide_requires_auth(self):
        """Hide endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/hide", json={"reason": "test"})
        assert response.status_code == 401

    def test_hide_requires_reason(self, venue_manager_token):
        """Hide requires a reason."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/hide",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={}
        )
        assert response.status_code == 422 or response.status_code == 400

    def test_unhide_requires_auth(self):
        """Unhide endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/unhide", json={})
        assert response.status_code == 401


class TestArchiveEndpoint:
    """Tests for POST /api/publish/{acq_id}/archive - admin only"""

    def test_archive_requires_auth(self):
        """Archive endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/archive", json={"reason": "test"})
        assert response.status_code == 401

    def test_archive_venue_manager_forbidden(self, venue_manager_token):
        """Venue manager cannot archive - admin only."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/archive",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"reason": "test archive"}
        )
        assert response.status_code == 403

    def test_archive_admin_can_access(self, admin_token):
        """Admin can access archive endpoint."""
        # We won't actually archive the test data, just verify access
        response = requests.post(
            f"{BASE_URL}/api/publish/acq_nonexistent/archive",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "test archive"}
        )
        # Should be 404 (not found) not 403 (forbidden)
        assert response.status_code == 404


class TestVersionsEndpoint:
    """Tests for GET /api/publish/{acq_id}/versions"""

    def test_versions_requires_auth(self):
        """Versions endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/versions")
        assert response.status_code == 401

    def test_versions_returns_structure(self, venue_manager_token):
        """Versions returns live, draft, approved version info."""
        response = requests.get(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/versions",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "acquisition_id" in data
        assert "status" in data
        assert "has_live" in data
        assert "has_draft" in data
        assert "has_approved" in data
        assert "live_version" in data
        assert "draft_version" in data
        assert "last_approved_version" in data

    def test_versions_with_draft_has_diff(self, venue_manager_token):
        """Versions with draft shows diff between live and draft."""
        response = requests.get(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_002}/versions",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # ACQ_LIVE_002 should have a draft
        if data.get("has_draft") and data.get("has_live"):
            assert "diff" in data
            if data["diff"]:
                # Each diff item should have field, live, draft
                for d in data["diff"]:
                    assert "field" in d
                    assert "live" in d
                    assert "draft" in d


class TestSaveDraftEndpoint:
    """Tests for POST /api/publish/{acq_id}/save-draft"""

    def test_save_draft_requires_auth(self):
        """Save draft endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/save-draft", json={})
        assert response.status_code == 401

    def test_save_draft_works(self, venue_manager_token):
        """Save draft saves changes without affecting live."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/save-draft",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"publishable_summary": "Test draft summary update"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "draft_version" in data


class TestPromoteDraftEndpoint:
    """Tests for POST /api/publish/{acq_id}/promote-draft"""

    def test_promote_draft_requires_auth(self):
        """Promote draft endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/promote-draft", json={"confirm": True})
        assert response.status_code == 401

    def test_promote_draft_requires_confirm(self, venue_manager_token):
        """Promote draft requires explicit confirm=true."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/promote-draft",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"reason": "test"}
        )
        assert response.status_code == 400
        assert "confirm" in response.json().get("detail", "").lower()


class TestAuditEndpoint:
    """Tests for GET /api/publish/{acq_id}/audit"""

    def test_audit_requires_auth(self):
        """Audit endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/audit")
        assert response.status_code == 401

    def test_audit_returns_trail(self, venue_manager_token):
        """Audit returns publish audit trail."""
        response = requests.get(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/audit",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "acquisition_id" in data
        assert "venue_name" in data
        assert "status" in data
        assert "audit" in data
        assert isinstance(data["audit"], list)


class TestRankingEndpoint:
    """Tests for POST /api/publish/{acq_id}/ranking"""

    def test_ranking_requires_auth(self):
        """Ranking endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/ranking", json={"ranking_eligibility": "eligible"})
        assert response.status_code == 401

    def test_ranking_rm_forbidden(self, rm_token):
        """RM role cannot update ranking."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/ranking",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"ranking_eligibility": "eligible"}
        )
        assert response.status_code == 403

    def test_ranking_invalid_value(self, venue_manager_token):
        """Ranking rejects invalid values."""
        response = requests.post(
            f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/ranking",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"ranking_eligibility": "invalid_value"}
        )
        assert response.status_code == 400

    def test_ranking_valid_values(self, venue_manager_token):
        """Ranking accepts valid values."""
        valid_values = ["not_eligible", "eligible", "blocked_quality", "hidden"]
        for val in valid_values:
            response = requests.post(
                f"{BASE_URL}/api/publish/{ACQ_LIVE_001}/ranking",
                headers={"Authorization": f"Bearer {venue_manager_token}"},
                json={"ranking_eligibility": val, "reason": f"Testing {val}"}
            )
            assert response.status_code == 200, f"Failed for value: {val}"
            data = response.json()
            assert data["ranking_eligibility"] == val


class TestRoleGating:
    """Tests for role-based access control"""

    def test_rm_cannot_access_publish_endpoints(self, rm_token):
        """RM role should be forbidden from all publish endpoints."""
        endpoints = [
            ("GET", f"/api/publish/queue"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/readiness"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/preview"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/versions"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/audit"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers={"Authorization": f"Bearer {rm_token}"}
                )
            assert response.status_code == 403, f"RM should be forbidden from {endpoint}"

    def test_venue_manager_can_access_publish_endpoints(self, venue_manager_token):
        """Venue manager can access publish endpoints."""
        endpoints = [
            ("GET", f"/api/publish/queue"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/readiness"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/preview"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/versions"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/audit"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers={"Authorization": f"Bearer {venue_manager_token}"}
                )
            assert response.status_code in [200, 404], f"Venue manager should access {endpoint}, got {response.status_code}"

    def test_admin_can_access_all_endpoints(self, admin_token):
        """Admin can access all publish endpoints including archive."""
        endpoints = [
            ("GET", f"/api/publish/queue"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/readiness"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/preview"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/versions"),
            ("GET", f"/api/publish/{ACQ_LIVE_001}/audit"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
            assert response.status_code in [200, 404], f"Admin should access {endpoint}, got {response.status_code}"
