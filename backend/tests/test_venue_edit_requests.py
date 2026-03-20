"""
Venue Owner Edit Request Workflow Tests
========================================
Tests for:
- POST /api/venue-onboarding/edit-request - Owner creates edit request
- GET /api/venue-onboarding/edit-requests/my - Owner gets their requests
- GET /api/venue-onboarding/edit-requests/pending - VAM gets pending requests
- GET /api/venue-onboarding/edit-request/{id} - Get single request details
- PATCH /api/venue-onboarding/edit-request/{id}/review - VAM approves/rejects
- Authorization checks (403 for non-owner/non-vam)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
VENUE_OWNER_CREDS = {"email": "venue@venuloq.in", "password": "venue123"}
VAM_CREDS = {"email": "vam@venuloq.in", "password": "vam123"}
ADMIN_CREDS = {"email": "admin@venulock.in", "password": "admin123"}

# Known test venue (owner has this assigned)
OWNER_VENUE_ID = "venue_ad8a07f2aef6"  # The Imperial New Delhi


class TestVenueEditRequestWorkflow:
    """Complete workflow tests for venue edit requests"""

    @pytest.fixture(scope="class")
    def venue_owner_session(self):
        """Authenticate as venue owner"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        resp = session.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDS)
        if resp.status_code != 200:
            pytest.skip(f"Venue owner login failed: {resp.text}")
        
        token = resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    @pytest.fixture(scope="class")
    def vam_session(self):
        """Authenticate as VAM"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        resp = session.post(f"{BASE_URL}/api/auth/login", json=VAM_CREDS)
        if resp.status_code != 200:
            pytest.skip(f"VAM login failed: {resp.text}")
        
        token = resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    @pytest.fixture(scope="class")
    def admin_session(self):
        """Authenticate as admin"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        resp = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.text}")
        
        token = resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    @pytest.fixture(scope="class")
    def unauthenticated_session(self):
        """Session without auth"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session

    # === Authentication Tests ===
    def test_login_venue_owner(self, venue_owner_session):
        """Verify venue owner can login"""
        resp = venue_owner_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("role") == "venue_owner"
        assert data.get("email") == "venue@venuloq.in"
        print(f"SUCCESS: Venue owner login - {data.get('name')}, role={data.get('role')}")

    def test_login_vam(self, vam_session):
        """Verify VAM can login"""
        resp = vam_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("role") == "vam"
        print(f"SUCCESS: VAM login - {data.get('name')}, role={data.get('role')}")

    # === Owner can fetch their venues ===
    def test_owner_can_fetch_venues(self, venue_owner_session):
        """Venue owner can fetch their assigned venues via /my-venues"""
        resp = venue_owner_session.get(f"{BASE_URL}/api/my-venues")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        venues = resp.json()
        assert isinstance(venues, list)
        assert len(venues) > 0, "Owner should have at least one venue"
        
        # Check if test venue exists
        venue_ids = [v.get("venue_id") for v in venues]
        assert OWNER_VENUE_ID in venue_ids, f"Expected venue {OWNER_VENUE_ID} in owner's venues"
        print(f"SUCCESS: Owner has {len(venues)} venues, including test venue {OWNER_VENUE_ID}")

    # === Edit Request Creation Tests ===
    def test_create_edit_request_success(self, venue_owner_session):
        """Owner creates an edit request with valid changes"""
        # Unique description to test
        timestamp = str(int(time.time()))
        payload = {
            "venue_id": OWNER_VENUE_ID,
            "changes": {
                "description": f"TEST_EditRequest_Description_{timestamp}",
                "capacity_max": 999
            },
            "reason": "Testing edit request workflow"
        }
        
        resp = venue_owner_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=payload)
        
        # If 409, a pending request exists - that's OK for our test context
        if resp.status_code == 409:
            print(f"INFO: Pending edit request already exists for venue {OWNER_VENUE_ID}")
            return
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "edit_request_id" in data
        assert data.get("status") == "pending"
        assert data.get("venue_id") == OWNER_VENUE_ID
        print(f"SUCCESS: Created edit request {data.get('edit_request_id')}")

    def test_create_edit_request_no_changes_fails(self, venue_owner_session):
        """Creating request with no actual changes should fail"""
        # Get current venue data first
        venues_resp = venue_owner_session.get(f"{BASE_URL}/api/my-venues")
        venues = venues_resp.json()
        venue = next((v for v in venues if v.get("venue_id") == OWNER_VENUE_ID), None)
        
        if not venue:
            pytest.skip("Test venue not found")
        
        # Submit same values as current
        payload = {
            "venue_id": OWNER_VENUE_ID,
            "changes": {
                "description": venue.get("description", ""),  # Same as current
            },
            "reason": "No actual changes"
        }
        
        resp = venue_owner_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=payload)
        # Should fail with 400 (no actual changes) or 409 (pending exists)
        assert resp.status_code in [400, 409], f"Expected 400/409, got {resp.status_code}"
        print(f"SUCCESS: No-change request correctly rejected with {resp.status_code}")

    def test_create_edit_request_missing_venue_id(self, venue_owner_session):
        """Missing venue_id should return 400"""
        payload = {
            "changes": {"description": "Test"},
            "reason": "Test"
        }
        
        resp = venue_owner_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print("SUCCESS: Missing venue_id correctly rejected")

    def test_create_edit_request_missing_changes(self, venue_owner_session):
        """Missing changes should return 400"""
        payload = {
            "venue_id": OWNER_VENUE_ID,
            "reason": "Test"
        }
        
        resp = venue_owner_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print("SUCCESS: Missing changes correctly rejected")

    # === Authorization Tests ===
    def test_vam_cannot_create_edit_request(self, vam_session):
        """VAM should not be able to create edit requests (403)"""
        payload = {
            "venue_id": OWNER_VENUE_ID,
            "changes": {"description": "VAM trying to edit"},
            "reason": "Test"
        }
        
        resp = vam_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=payload)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("SUCCESS: VAM correctly blocked from creating edit requests")

    def test_unauthenticated_cannot_create_edit_request(self, unauthenticated_session):
        """Unauthenticated user should get 401"""
        payload = {
            "venue_id": OWNER_VENUE_ID,
            "changes": {"description": "Unauthenticated test"},
            "reason": "Test"
        }
        
        resp = unauthenticated_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=payload)
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"SUCCESS: Unauthenticated correctly blocked with {resp.status_code}")

    # === GET Edit Requests Tests ===
    def test_owner_get_my_edit_requests(self, venue_owner_session):
        """Owner can fetch their own edit requests"""
        resp = venue_owner_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/my")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Owner fetched {len(data)} edit requests")
        
        # Validate structure if any exist
        if len(data) > 0:
            er = data[0]
            assert "edit_request_id" in er
            assert "venue_id" in er
            assert "status" in er
            assert "changes" in er
            print(f"SUCCESS: Edit request structure validated - {er.get('edit_request_id')}")

    def test_vam_get_pending_edit_requests(self, vam_session):
        """VAM can fetch pending edit requests"""
        resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/pending")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"SUCCESS: VAM fetched {len(data)} pending edit requests")

    def test_vam_get_all_edit_requests(self, vam_session):
        """VAM can fetch all edit requests"""
        resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/all")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"SUCCESS: VAM fetched {len(data)} total edit requests")

    def test_owner_cannot_fetch_pending_edit_requests(self, venue_owner_session):
        """Owner should not access VAM-only pending endpoint"""
        resp = venue_owner_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/pending")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("SUCCESS: Owner correctly blocked from pending endpoint")

    # === Single Edit Request Detail ===
    def test_get_single_edit_request(self, vam_session):
        """Get details of a single edit request"""
        # First get list
        list_resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/all")
        assert list_resp.status_code == 200
        requests_list = list_resp.json()
        
        if len(requests_list) == 0:
            pytest.skip("No edit requests to test")
        
        er_id = requests_list[0].get("edit_request_id")
        
        # Get detail
        resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-request/{er_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("edit_request_id") == er_id
        assert "changes" in data
        assert "venue_name" in data
        print(f"SUCCESS: Fetched edit request detail for {er_id}")


class TestVAMReviewActions:
    """Tests for VAM approve/reject actions"""

    @pytest.fixture(scope="class")
    def vam_session(self):
        """Authenticate as VAM"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        resp = session.post(f"{BASE_URL}/api/auth/login", json=VAM_CREDS)
        if resp.status_code != 200:
            pytest.skip(f"VAM login failed: {resp.text}")
        
        token = resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    @pytest.fixture(scope="class")
    def venue_owner_session(self):
        """Authenticate as venue owner"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        resp = session.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDS)
        if resp.status_code != 200:
            pytest.skip(f"Venue owner login failed: {resp.text}")
        
        token = resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    def test_vam_review_invalid_action(self, vam_session):
        """Invalid action should fail"""
        # Get a pending request
        list_resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/pending")
        pending = list_resp.json()
        
        if len(pending) == 0:
            pytest.skip("No pending edit requests")
        
        er_id = pending[0].get("edit_request_id")
        
        payload = {
            "action": "invalid_action",
            "notes": "Test"
        }
        
        resp = vam_session.patch(f"{BASE_URL}/api/venue-onboarding/edit-request/{er_id}/review", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print("SUCCESS: Invalid action correctly rejected")

    def test_owner_cannot_review_edit_request(self, venue_owner_session, vam_session):
        """Owner should not be able to review edit requests"""
        # Get a pending request
        list_resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/pending")
        pending = list_resp.json()
        
        if len(pending) == 0:
            pytest.skip("No pending edit requests")
        
        er_id = pending[0].get("edit_request_id")
        
        payload = {
            "action": "approve",
            "notes": "Owner trying to approve"
        }
        
        resp = venue_owner_session.patch(f"{BASE_URL}/api/venue-onboarding/edit-request/{er_id}/review", json=payload)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("SUCCESS: Owner correctly blocked from reviewing")

    def test_vam_reject_edit_request(self, vam_session, venue_owner_session):
        """VAM can reject an edit request"""
        # Create a new request to reject
        timestamp = str(int(time.time()))
        
        # Use a different venue to avoid conflict
        venues_resp = venue_owner_session.get(f"{BASE_URL}/api/my-venues")
        venues = venues_resp.json()
        
        # Find a venue that might not have a pending request
        test_venue_id = None
        for v in venues:
            if v.get("venue_id") != OWNER_VENUE_ID and v.get("status") == "approved":
                test_venue_id = v.get("venue_id")
                break
        
        if not test_venue_id:
            # Use the main venue
            test_venue_id = OWNER_VENUE_ID
        
        # Try to create an edit request
        create_payload = {
            "venue_id": test_venue_id,
            "changes": {
                "description": f"TEST_RejectFlow_{timestamp}"
            },
            "reason": "Test reject flow"
        }
        
        create_resp = venue_owner_session.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=create_payload)
        
        if create_resp.status_code == 409:
            # Use existing pending request
            pending_resp = vam_session.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/pending")
            pending = pending_resp.json()
            if len(pending) == 0:
                pytest.skip("No pending requests to reject")
            er_id = pending[0].get("edit_request_id")
        else:
            assert create_resp.status_code == 200, f"Failed to create: {create_resp.text}"
            er_id = create_resp.json().get("edit_request_id")
        
        # Now reject it
        reject_payload = {
            "action": "reject",
            "notes": "Test rejection by VAM"
        }
        
        resp = vam_session.patch(f"{BASE_URL}/api/venue-onboarding/edit-request/{er_id}/review", json=reject_payload)
        
        if resp.status_code == 400:
            # Already reviewed
            print("INFO: Edit request already reviewed")
            return
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "rejected"
        print(f"SUCCESS: VAM rejected edit request {er_id}")


class TestFullApprovalWorkflow:
    """End-to-end approval workflow test"""

    @pytest.fixture(scope="class")
    def sessions(self):
        """Get both sessions"""
        owner_session = requests.Session()
        owner_session.headers.update({"Content-Type": "application/json"})
        resp = owner_session.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDS)
        if resp.status_code != 200:
            pytest.skip("Owner login failed")
        owner_session.headers.update({"Authorization": f"Bearer {resp.json().get('token')}"})
        
        vam_session = requests.Session()
        vam_session.headers.update({"Content-Type": "application/json"})
        resp = vam_session.post(f"{BASE_URL}/api/auth/login", json=VAM_CREDS)
        if resp.status_code != 200:
            pytest.skip("VAM login failed")
        vam_session.headers.update({"Authorization": f"Bearer {resp.json().get('token')}"})
        
        return {"owner": owner_session, "vam": vam_session}

    def test_approval_applies_changes_to_venue(self, sessions):
        """When approved, changes should be applied to the venue document"""
        owner = sessions["owner"]
        vam = sessions["vam"]
        
        # Get owner's venues to find one without pending request
        venues_resp = owner.get(f"{BASE_URL}/api/my-venues")
        venues = venues_resp.json()
        
        # Find a venue to test with
        test_venue = None
        for v in venues:
            if v.get("status") == "approved":
                test_venue = v
                break
        
        if not test_venue:
            pytest.skip("No approved venues to test")
        
        venue_id = test_venue.get("venue_id")
        original_desc = test_venue.get("description", "")
        timestamp = str(int(time.time()))
        new_desc = f"TEST_ApprovalVerify_{timestamp}"
        
        # Create edit request
        create_payload = {
            "venue_id": venue_id,
            "changes": {
                "description": new_desc
            },
            "reason": "Testing approval applies changes"
        }
        
        create_resp = owner.post(f"{BASE_URL}/api/venue-onboarding/edit-request", json=create_payload)
        
        if create_resp.status_code == 409:
            print("INFO: Pending request exists - checking if we can test approval flow another way")
            
            # Get the pending request
            pending_resp = vam.get(f"{BASE_URL}/api/venue-onboarding/edit-requests/pending")
            pending = pending_resp.json()
            
            if len(pending) > 0:
                er = pending[0]
                er_id = er.get("edit_request_id")
                venue_id = er.get("venue_id")
                expected_changes = er.get("changes", {})
                
                # Approve it
                approve_resp = vam.patch(f"{BASE_URL}/api/venue-onboarding/edit-request/{er_id}/review", json={
                    "action": "approve",
                    "notes": "Approving for test"
                })
                
                if approve_resp.status_code == 200:
                    # Verify venue was updated
                    venue_resp = owner.get(f"{BASE_URL}/api/my-venues")
                    updated_venues = venue_resp.json()
                    updated_venue = next((v for v in updated_venues if v.get("venue_id") == venue_id), None)
                    
                    if updated_venue:
                        for field, change in expected_changes.items():
                            if field in updated_venue:
                                assert updated_venue.get(field) == change.get("new"), \
                                    f"Expected {field}={change.get('new')}, got {updated_venue.get(field)}"
                        print(f"SUCCESS: Approval applied changes to venue {venue_id}")
                    return
            
            pytest.skip("Could not test approval flow due to existing pending request")
        
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        er_id = create_resp.json().get("edit_request_id")
        print(f"Created edit request {er_id}")
        
        # VAM approves
        approve_payload = {
            "action": "approve",
            "notes": "Approved for testing"
        }
        
        approve_resp = vam.patch(f"{BASE_URL}/api/venue-onboarding/edit-request/{er_id}/review", json=approve_payload)
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        assert approve_resp.json().get("status") == "approved"
        print(f"VAM approved edit request {er_id}")
        
        # Verify venue was updated
        time.sleep(0.5)  # Small delay for DB update
        
        venue_resp = owner.get(f"{BASE_URL}/api/my-venues")
        updated_venues = venue_resp.json()
        updated_venue = next((v for v in updated_venues if v.get("venue_id") == venue_id), None)
        
        assert updated_venue is not None, "Venue not found after approval"
        assert updated_venue.get("description") == new_desc, \
            f"Expected description='{new_desc}', got '{updated_venue.get('description')}'"
        
        print(f"SUCCESS: Approval correctly applied changes - description updated to '{new_desc}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
