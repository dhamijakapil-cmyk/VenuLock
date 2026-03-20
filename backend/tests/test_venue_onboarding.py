"""
Test Suite: VenuLoQ Venue Onboarding API
=========================================
Tests the complete venue acquisition workflow:
- Specialist creates venue draft
- Specialist adds media (photos/videos)
- Specialist submits for review
- VAM reviews and approves/rejects/requests changes
- Admin create employee with venue_specialist and vam roles

Endpoints tested:
- POST /api/venue-onboarding/create
- GET /api/venue-onboarding/my-submissions
- GET /api/venue-onboarding/{venue_id}
- PUT /api/venue-onboarding/{venue_id}
- POST /api/venue-onboarding/{venue_id}/media
- DELETE /api/venue-onboarding/{venue_id}/media/{media_id}
- POST /api/venue-onboarding/{venue_id}/submit
- GET /api/venue-onboarding/review-queue
- GET /api/venue-onboarding/all
- GET /api/venue-onboarding/stats
- GET /api/venue-onboarding/options
- PATCH /api/venue-onboarding/{venue_id}/review
- POST /api/admin/create-employee
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-event-search.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASS = "admin123"
SPECIALIST_EMAIL = "specialist@venuloq.in"
SPECIALIST_PASS = "spec123"
VAM_EMAIL = "vam@venuloq.in"
VAM_PASS = "vam123"

# Small base64 PNG for testing media upload
TEST_PHOTO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


class TestVenueOnboardingAPI:
    """Full venue onboarding workflow tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_venue_id = None
        self.created_media_id = None
    
    def _get_token(self, email, password):
        """Helper to get auth token"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        return None
    
    def _auth_headers(self, token):
        """Helper to create auth headers"""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # ============== GET OPTIONS ENDPOINT ==============
    
    def test_01_get_options_public(self):
        """GET /api/venue-onboarding/options returns venue types, amenities, vibes"""
        resp = self.session.get(f"{BASE_URL}/api/venue-onboarding/options")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "venue_types" in data
        assert "amenities" in data
        assert "vibes" in data
        assert len(data["venue_types"]) > 0
        assert len(data["amenities"]) > 0
        assert len(data["vibes"]) > 0
        print(f"✓ Options endpoint returns {len(data['venue_types'])} venue types, {len(data['amenities'])} amenities, {len(data['vibes'])} vibes")

    # ============== SPECIALIST AUTHENTICATION ==============
    
    def test_02_specialist_login(self):
        """Specialist can login with specialist@venuloq.in / spec123"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SPECIALIST_EMAIL,
            "password": SPECIALIST_PASS
        })
        assert resp.status_code == 200, f"Specialist login failed: {resp.text}"
        data = resp.json()
        assert data.get("user", {}).get("role") == "venue_specialist"
        print(f"✓ Specialist login successful - role: venue_specialist")

    # ============== CREATE VENUE DRAFT ==============
    
    def test_03_create_venue_draft(self):
        """POST /api/venue-onboarding/create creates venue draft"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_data = {
            "name": f"TEST_VenueOnboard_{int(time.time())}",
            "venue_type": "Banquet Hall",
            "description": "A beautiful test venue for onboarding workflow",
            "city": "Mumbai",
            "address": "123 Test Street, Mumbai",
        }
        
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/create",
            json=venue_data,
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Create venue failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "venue_onboarding_id" in data
        assert data["venue_onboarding_id"].startswith("vonb_")
        
        # Store for later tests
        TestVenueOnboardingAPI.created_venue_id = data["venue_onboarding_id"]
        print(f"✓ Venue draft created: {data['venue_onboarding_id']}")

    # ============== GET MY SUBMISSIONS ==============
    
    def test_04_get_my_submissions(self):
        """GET /api/venue-onboarding/my-submissions returns specialist's venues"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/my-submissions",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Get submissions failed: {resp.text}"
        data = resp.json()
        assert "venues" in data
        assert "total" in data
        # Should include the just-created venue
        venue_ids = [v["venue_onboarding_id"] for v in data["venues"]]
        assert TestVenueOnboardingAPI.created_venue_id in venue_ids
        print(f"✓ My submissions returns {data['total']} venues")

    # ============== GET SPECIALIST STATS ==============
    
    def test_05_get_specialist_stats(self):
        """GET /api/venue-onboarding/stats returns stats for dashboard"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/stats",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Get stats failed: {resp.text}"
        data = resp.json()
        required_fields = ["drafts", "submitted", "approved", "changes_requested", "rejected", "total"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        assert data["drafts"] >= 1, "Should have at least 1 draft"
        print(f"✓ Stats: drafts={data['drafts']}, submitted={data['submitted']}, approved={data['approved']}")

    # ============== GET VENUE DETAIL ==============
    
    def test_06_get_venue_detail(self):
        """GET /api/venue-onboarding/{venue_id} returns full venue details"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Get venue detail failed: {resp.text}"
        data = resp.json()
        assert data["venue_onboarding_id"] == venue_id
        assert data["status"] == "draft"
        assert "name" in data
        assert "city" in data
        print(f"✓ Venue detail retrieved: {data['name']} in {data['city']}")

    # ============== UPDATE VENUE DRAFT ==============
    
    def test_07_update_venue_draft(self):
        """PUT /api/venue-onboarding/{venue_id} updates venue draft"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        updates = {
            "capacity_min": 100,
            "capacity_max": 500,
            "per_person_price": 2500,
            "min_spend": 250000,
            "amenities": ["Parking", "AC", "DJ"],
            "vibes": ["Royal", "Modern"],
            "owner_name": "Test Owner",
            "owner_phone": "9876543210",
            "owner_email": "testowner@venue.in",
        }
        
        resp = self.session.put(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            json=updates,
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Update venue failed: {resp.text}"
        data = resp.json()
        assert data["message"] == "Venue updated"
        print(f"✓ Venue updated with capacity, pricing, amenities, vibes, owner contact")

    # ============== ADD MEDIA (PHOTO) ==============
    
    def test_08_add_photo_media(self):
        """POST /api/venue-onboarding/{venue_id}/media adds photo"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        media_data = {
            "type": "photo",
            "file_data": TEST_PHOTO_BASE64,
            "caption": "Test venue exterior"
        }
        
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/media",
            json=media_data,
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Add photo failed: {resp.text}"
        data = resp.json()
        assert "media_id" in data
        assert data["media_id"].startswith("media_")
        
        TestVenueOnboardingAPI.created_media_id = data["media_id"]
        print(f"✓ Photo added: {data['media_id']}")

    # ============== ADD VIDEO MEDIA ==============
    
    def test_09_add_video_media(self):
        """POST /api/venue-onboarding/{venue_id}/media adds video"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        media_data = {
            "type": "video",
            "file_data": "data:video/mp4;base64,AAAAIGZ0eXBpc29t",  # Minimal video data
            "caption": "Venue walkthrough"
        }
        
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/media",
            json=media_data,
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Add video failed: {resp.text}"
        data = resp.json()
        assert "media_id" in data
        print(f"✓ Video added: {data['media_id']}")

    # ============== VERIFY MEDIA IN VENUE ==============
    
    def test_10_verify_media_in_venue(self):
        """Verify photos and videos are present in venue detail"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert len(data["photos"]) >= 1, "Should have at least 1 photo"
        assert len(data["videos"]) >= 1, "Should have at least 1 video"
        print(f"✓ Venue has {len(data['photos'])} photos and {len(data['videos'])} videos")

    # ============== SUBMIT WITHOUT PHOTO FAILS ==============
    
    def test_11_submit_requires_photo(self):
        """POST /api/venue-onboarding/{venue_id}/submit requires at least 1 photo"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        # Create a venue without photos
        venue_data = {"name": f"TEST_NoPhoto_{int(time.time())}", "city": "Delhi"}
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/create",
            json=venue_data,
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200
        no_photo_id = resp.json()["venue_onboarding_id"]
        
        # Try to submit without photo
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{no_photo_id}/submit",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "photo" in resp.text.lower()
        print(f"✓ Submit without photo correctly returns 400")

    # ============== SUBMIT FOR REVIEW ==============
    
    def test_12_submit_for_review(self):
        """POST /api/venue-onboarding/{venue_id}/submit submits venue for VAM review"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/submit",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Submit failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "submitted"
        print(f"✓ Venue submitted for review")

    # ============== CANNOT EDIT SUBMITTED VENUE ==============
    
    def test_13_cannot_edit_submitted_venue(self):
        """PUT /api/venue-onboarding/{venue_id} fails for submitted venues"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.put(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            json={"name": "Trying to edit submitted venue"},
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"✓ Cannot edit submitted venue - returns 400")

    # ============== VAM LOGIN ==============
    
    def test_14_vam_login(self):
        """VAM can login with vam@venuloq.in / vam123"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VAM_EMAIL,
            "password": VAM_PASS
        })
        assert resp.status_code == 200, f"VAM login failed: {resp.text}"
        data = resp.json()
        assert data.get("user", {}).get("role") == "vam"
        print(f"✓ VAM login successful - role: vam")

    # ============== VAM GET REVIEW QUEUE ==============
    
    def test_15_vam_review_queue(self):
        """GET /api/venue-onboarding/review-queue returns submitted venues"""
        token = self._get_token(VAM_EMAIL, VAM_PASS)
        assert token, "Failed to get VAM token"
        
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/review-queue",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Review queue failed: {resp.text}"
        data = resp.json()
        assert "venues" in data
        # Our submitted venue should be in the queue
        venue_ids = [v["venue_onboarding_id"] for v in data["venues"]]
        assert TestVenueOnboardingAPI.created_venue_id in venue_ids
        print(f"✓ Review queue has {data['total']} venues pending")

    # ============== VAM GET ALL VENUES ==============
    
    def test_16_vam_get_all_venues(self):
        """GET /api/venue-onboarding/all returns all onboarding venues"""
        token = self._get_token(VAM_EMAIL, VAM_PASS)
        assert token, "Failed to get VAM token"
        
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/all",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Get all venues failed: {resp.text}"
        data = resp.json()
        assert "venues" in data
        assert data["total"] >= 1
        print(f"✓ VAM sees {data['total']} total venues")

    # ============== VAM GET VENUE DETAIL ==============
    
    def test_17_vam_get_venue_detail(self):
        """VAM can view full venue detail for review"""
        token = self._get_token(VAM_EMAIL, VAM_PASS)
        assert token, "Failed to get VAM token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"VAM get venue detail failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "submitted"
        assert len(data["photos"]) >= 1
        print(f"✓ VAM can view venue detail for review")

    # ============== VAM REQUEST CHANGES ==============
    
    def test_18_vam_request_changes(self):
        """PATCH /api/venue-onboarding/{venue_id}/review with action=request_changes"""
        token = self._get_token(VAM_EMAIL, VAM_PASS)
        assert token, "Failed to get VAM token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.patch(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/review",
            json={"action": "request_changes", "notes": "Please add more photos of interior"},
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Request changes failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "changes_requested"
        print(f"✓ VAM requested changes")

    # ============== SPECIALIST CAN EDIT AFTER CHANGES REQUESTED ==============
    
    def test_19_specialist_can_edit_after_changes(self):
        """Specialist can edit venue when status is changes_requested"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.put(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            json={"description": "Updated description after review feedback"},
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Edit after changes failed: {resp.text}"
        print(f"✓ Specialist can edit venue after changes requested")

    # ============== RE-SUBMIT AFTER CHANGES ==============
    
    def test_20_resubmit_after_changes(self):
        """Specialist can re-submit after making changes"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/submit",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Re-submit failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "submitted"
        print(f"✓ Venue re-submitted after changes")

    # ============== VAM APPROVE ==============
    
    def test_21_vam_approve(self):
        """PATCH /api/venue-onboarding/{venue_id}/review with action=approve publishes venue"""
        token = self._get_token(VAM_EMAIL, VAM_PASS)
        assert token, "Failed to get VAM token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.patch(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/review",
            json={"action": "approve", "notes": "Looks great!"},
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Approve failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "approved"
        print(f"✓ VAM approved venue")

    # ============== VERIFY APPROVED STATUS ==============
    
    def test_22_verify_approved_status(self):
        """Verify venue is now approved and has published_venue_id"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token, "Failed to get specialist token"
        
        venue_id = TestVenueOnboardingAPI.created_venue_id
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"
        assert data.get("published_venue_id"), "Should have published_venue_id after approval"
        print(f"✓ Venue approved and published: {data['published_venue_id']}")


class TestVAMRejectWorkflow:
    """Test VAM rejection workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _get_token(self, email, password):
        """Helper to get auth token"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        return None
    
    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_23_vam_reject_venue(self):
        """PATCH /api/venue-onboarding/{venue_id}/review with action=reject"""
        # Create and submit a venue
        spec_token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert spec_token
        
        # Create venue with photo
        venue_data = {"name": f"TEST_Reject_{int(time.time())}", "city": "Delhi"}
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/create",
            json=venue_data,
            headers=self._auth_headers(spec_token)
        )
        venue_id = resp.json()["venue_onboarding_id"]
        
        # Add photo
        self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/media",
            json={"type": "photo", "file_data": TEST_PHOTO_BASE64, "caption": "Test"},
            headers=self._auth_headers(spec_token)
        )
        
        # Submit
        self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/submit",
            headers=self._auth_headers(spec_token)
        )
        
        # VAM reject
        vam_token = self._get_token(VAM_EMAIL, VAM_PASS)
        assert vam_token
        
        resp = self.session.patch(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/review",
            json={"action": "reject", "notes": "Venue doesn't meet quality standards"},
            headers=self._auth_headers(vam_token)
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"
        print(f"✓ VAM reject flow works correctly")


class TestAdminCreateSpecialistVAM:
    """Test admin creating venue_specialist and vam roles"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _get_token(self, email, password):
        """Helper to get auth token"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        return None
    
    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_24_admin_create_specialist(self):
        """POST /api/admin/create-employee with role=venue_specialist"""
        token = self._get_token(ADMIN_EMAIL, ADMIN_PASS)
        assert token, "Failed to get admin token"
        
        resp = self.session.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={
                "name": "Test Specialist",
                "email": f"TEST_specialist_{int(time.time())}@venuloq.in",
                "password": "temppass123",
                "role": "venue_specialist"
            },
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Create specialist failed: {resp.text}"
        data = resp.json()
        assert data["role"] == "venue_specialist"
        print(f"✓ Admin created venue_specialist: {data['email']}")
    
    def test_25_admin_create_vam(self):
        """POST /api/admin/create-employee with role=vam"""
        token = self._get_token(ADMIN_EMAIL, ADMIN_PASS)
        assert token, "Failed to get admin token"
        
        resp = self.session.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={
                "name": "Test VAM",
                "email": f"TEST_vam_{int(time.time())}@venuloq.in",
                "password": "temppass123",
                "role": "vam"
            },
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Create VAM failed: {resp.text}"
        data = resp.json()
        assert data["role"] == "vam"
        print(f"✓ Admin created vam: {data['email']}")


class TestMediaDelete:
    """Test media removal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _get_token(self, email, password):
        """Helper to get auth token"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        return None
    
    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_26_delete_media(self):
        """DELETE /api/venue-onboarding/{venue_id}/media/{media_id} removes media"""
        token = self._get_token(SPECIALIST_EMAIL, SPECIALIST_PASS)
        assert token
        
        # Create venue and add photo
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/create",
            json={"name": f"TEST_MediaDel_{int(time.time())}", "city": "Gurgaon"},
            headers=self._auth_headers(token)
        )
        venue_id = resp.json()["venue_onboarding_id"]
        
        # Add photo
        resp = self.session.post(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/media",
            json={"type": "photo", "file_data": TEST_PHOTO_BASE64, "caption": "To be deleted"},
            headers=self._auth_headers(token)
        )
        media_id = resp.json()["media_id"]
        
        # Delete photo
        resp = self.session.delete(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}/media/{media_id}",
            headers=self._auth_headers(token)
        )
        assert resp.status_code == 200, f"Delete media failed: {resp.text}"
        
        # Verify photo removed
        resp = self.session.get(
            f"{BASE_URL}/api/venue-onboarding/{venue_id}",
            headers=self._auth_headers(token)
        )
        data = resp.json()
        photo_ids = [p.get("id") for p in data.get("photos", [])]
        assert media_id not in photo_ids, "Photo should be removed"
        print(f"✓ Media deleted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
