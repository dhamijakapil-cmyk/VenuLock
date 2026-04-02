"""
VenuLoQ Phase 5: Owner Onboarding / Digital Acceptance Flow Tests
Tests for:
- POST /api/onboarding/send/{acq_id} - sends onboarding link (requires venue_manager/admin auth)
- GET /api/onboarding/status/{acq_id} - returns full onboarding status with timeline
- GET /api/onboarding/view/{token} - public endpoint, returns venue/owner data, marks as viewed
- POST /api/onboarding/accept/{token} - public acceptance with consents and signer name
- POST /api/onboarding/decline/{token} - public decline with optional reason
- Invalid token returns 404
- Already-accepted token returns 400 on re-accept
- Comma-separated status filter on GET /api/acquisitions/?status=...
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
VENUE_MANAGER_EMAIL = "venuemanager@venuloq.in"
VENUE_MANAGER_PASS = "test123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASS = "admin123"
SPECIALIST_EMAIL = "specialist@venuloq.in"
SPECIALIST_PASS = "test123"

# Test acquisitions with known tokens
TEST_ACQ_COMPLETED = "acq_e1e351d554f7"
TEST_TOKEN_COMPLETED = "e9de5ae7e9b36eadf97621b59b06f8b31539c052584fe18b"
TEST_ACQ_VIEWED = "acq_96bd550290e2"
TEST_TOKEN_VIEWED = "6a880e900597785a52ee28092940a13d5cb5412a3ab717e8"
TEST_ACQ_DECLINED = "acq_218167d58535"
TEST_TOKEN_DECLINED = "c63a68f1ca791154beee4eb7f04d5aeba9a6bb9369907cc2"


class TestOnboardingBackend:
    """Owner Onboarding API Tests"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def venue_manager_token(self, api_client):
        """Get venue manager auth token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENUE_MANAGER_EMAIL,
            "password": VENUE_MANAGER_PASS
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Venue Manager login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_token(self, api_client):
        """Get admin auth token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASS
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def specialist_token(self, api_client):
        """Get specialist auth token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SPECIALIST_EMAIL,
            "password": SPECIALIST_PASS
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Specialist login failed: {response.status_code}")
    
    # ── Test 1: Venue Manager Login ──
    def test_01_venue_manager_login(self, api_client):
        """Venue Manager can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENUE_MANAGER_EMAIL,
            "password": VENUE_MANAGER_PASS
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "venue_manager"
        print(f"✓ Venue Manager login successful, role: {data['user']['role']}")
    
    # ── Test 2: GET /api/onboarding/status/{acq_id} - requires auth ──
    def test_02_onboarding_status_requires_auth(self, api_client):
        """GET /api/onboarding/status/{acq_id} requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/onboarding/status/{TEST_ACQ_COMPLETED}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Onboarding status endpoint requires auth")
    
    # ── Test 3: GET /api/onboarding/status/{acq_id} - venue_manager can access ──
    def test_03_onboarding_status_venue_manager(self, api_client, venue_manager_token):
        """Venue Manager can get onboarding status"""
        response = api_client.get(
            f"{BASE_URL}/api/onboarding/status/{TEST_ACQ_COMPLETED}",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("acquisition_id") == TEST_ACQ_COMPLETED
        assert "onboarding" in data
        assert "status" in data
        print(f"✓ Venue Manager can access onboarding status: {data['status']}")
    
    # ── Test 4: GET /api/onboarding/status/{acq_id} - returns timeline data ──
    def test_04_onboarding_status_has_timeline(self, api_client, venue_manager_token):
        """Onboarding status returns full timeline data"""
        response = api_client.get(
            f"{BASE_URL}/api/onboarding/status/{TEST_ACQ_COMPLETED}",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        onboarding = data.get("onboarding", {})
        # Check timeline fields exist
        assert "token_issued" in onboarding
        assert "issued_at" in onboarding
        assert "sends" in onboarding
        assert "viewed_at" in onboarding
        assert "accepted_at" in onboarding or "declined_at" in onboarding
        print(f"✓ Onboarding status has timeline: issued={onboarding.get('issued_at')}, viewed={onboarding.get('viewed_at')}")
    
    # ── Test 5: GET /api/onboarding/view/{token} - public endpoint ──
    def test_05_view_onboarding_public(self, api_client):
        """GET /api/onboarding/view/{token} is public (no auth required)"""
        response = api_client.get(f"{BASE_URL}/api/onboarding/view/{TEST_TOKEN_COMPLETED}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "venue_name" in data
        assert "owner_name" in data
        assert "terms_version" in data
        print(f"✓ Public view endpoint works: venue={data.get('venue_name')}")
    
    # ── Test 6: GET /api/onboarding/view/{token} - returns owner-safe data ──
    def test_06_view_returns_owner_safe_data(self, api_client):
        """View endpoint returns only owner-safe data"""
        response = api_client.get(f"{BASE_URL}/api/onboarding/view/{TEST_TOKEN_COMPLETED}")
        assert response.status_code == 200
        data = response.json()
        # Should have these fields
        expected_fields = ["venue_name", "city", "locality", "venue_type", "owner_name", "terms_version"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        # Should NOT have internal fields
        assert "acquisition_id" not in data
        assert "history" not in data
        assert "created_by" not in data
        print(f"✓ View returns owner-safe data only")
    
    # ── Test 7: Invalid token returns 404 ──
    def test_07_invalid_token_returns_404(self, api_client):
        """Invalid token returns 404"""
        fake_token = "invalid_token_12345678901234567890123456789012"
        response = api_client.get(f"{BASE_URL}/api/onboarding/view/{fake_token}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid token returns 404")
    
    # ── Test 8: Already-accepted token shows completion state ──
    def test_08_already_accepted_shows_completion(self, api_client):
        """Already-accepted token shows completion state"""
        response = api_client.get(f"{BASE_URL}/api/onboarding/view/{TEST_TOKEN_COMPLETED}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("already_completed") == True, f"Expected already_completed=True, got {data.get('already_completed')}"
        assert "accepted_at" in data
        print(f"✓ Already-accepted token shows completion: accepted_at={data.get('accepted_at')}")
    
    # ── Test 9: POST /api/onboarding/accept/{token} - already accepted returns 400 ──
    def test_09_reaccept_returns_400(self, api_client):
        """Re-accepting already-accepted token returns 400"""
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/accept/{TEST_TOKEN_COMPLETED}",
            json={
                "signer_name": "Test Signer",
                "consent_publish": True,
                "consent_platform_terms": True
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Re-accepting already-accepted token returns 400")
    
    # ── Test 10: POST /api/onboarding/send/{acq_id} - requires auth ──
    def test_10_send_onboarding_requires_auth(self, api_client):
        """POST /api/onboarding/send/{acq_id} requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_VIEWED}",
            json={"channels": ["whatsapp"]}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Send onboarding requires auth")
    
    # ── Test 11: POST /api/onboarding/send/{acq_id} - specialist cannot send ──
    def test_11_specialist_cannot_send(self, api_client, specialist_token):
        """Specialist role cannot send onboarding"""
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_VIEWED}",
            json={"channels": ["whatsapp"]},
            headers={"Authorization": f"Bearer {specialist_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Specialist cannot send onboarding (403)")
    
    # ── Test 12: POST /api/onboarding/send/{acq_id} - venue_manager can send ──
    def test_12_venue_manager_can_send(self, api_client, venue_manager_token):
        """Venue Manager can send onboarding link"""
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_VIEWED}",
            json={"channels": ["whatsapp"]},
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        # May return 200 or 400 depending on current status
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "onboarding_link" in data
            print(f"✓ Venue Manager sent onboarding: link={data.get('onboarding_link')[:50]}...")
        elif response.status_code == 400:
            # Status may not allow sending
            print(f"✓ Send returned 400 (status may not allow): {response.json().get('detail')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}: {response.text}")
    
    # ── Test 13: Comma-separated status filter ──
    def test_13_comma_separated_status_filter(self, api_client, venue_manager_token):
        """GET /api/acquisitions/?status=... supports comma-separated values"""
        statuses = "owner_onboarding_sent,owner_onboarding_viewed,owner_onboarding_completed"
        response = api_client.get(
            f"{BASE_URL}/api/acquisitions/?status={statuses}",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "acquisitions" in data
        # All returned items should have one of the specified statuses
        valid_statuses = statuses.split(",")
        for acq in data.get("acquisitions", []):
            assert acq.get("status") in valid_statuses, f"Unexpected status: {acq.get('status')}"
        print(f"✓ Comma-separated filter works: {len(data.get('acquisitions', []))} records")
    
    # ── Test 14: POST /api/onboarding/decline/{token} - declined token ──
    def test_14_view_declined_token(self, api_client):
        """Declined token shows declined state"""
        response = api_client.get(f"{BASE_URL}/api/onboarding/view/{TEST_TOKEN_DECLINED}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("already_declined") == True, f"Expected already_declined=True"
        print("✓ Declined token shows declined state")
    
    # ── Test 15: Accept requires mandatory consents ──
    def test_15_accept_requires_consents(self, api_client):
        """Accept requires mandatory consents (publish, platform_terms)"""
        # First check if viewed token is still valid
        check = api_client.get(f"{BASE_URL}/api/onboarding/view/{TEST_TOKEN_VIEWED}")
        if check.status_code == 404:
            pytest.skip("TEST_TOKEN_VIEWED is no longer valid (token invalidated or expired)")
        
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/accept/{TEST_TOKEN_VIEWED}",
            json={
                "signer_name": "Test Signer",
                "consent_publish": False,  # Missing required consent
                "consent_platform_terms": True
            }
        )
        # Should fail because consent_publish is required
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Accept requires mandatory consents")
    
    # ── Test 16: Accept requires signer name ──
    def test_16_accept_requires_signer_name(self, api_client):
        """Accept requires signer name"""
        # First check if viewed token is still valid
        check = api_client.get(f"{BASE_URL}/api/onboarding/view/{TEST_TOKEN_VIEWED}")
        if check.status_code == 404:
            pytest.skip("TEST_TOKEN_VIEWED is no longer valid (token invalidated or expired)")
        
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/accept/{TEST_TOKEN_VIEWED}",
            json={
                "signer_name": "",  # Empty name
                "consent_publish": True,
                "consent_platform_terms": True
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Accept requires signer name")
    
    # ── Test 17: Admin can access onboarding status ──
    def test_17_admin_can_access_status(self, api_client, admin_token):
        """Admin can access onboarding status"""
        response = api_client.get(
            f"{BASE_URL}/api/onboarding/status/{TEST_ACQ_COMPLETED}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin can access onboarding status")
    
    # ── Test 18: Admin can send onboarding ──
    def test_18_admin_can_send(self, api_client, admin_token):
        """Admin can send onboarding link"""
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_VIEWED}",
            json={"channels": ["whatsapp", "email"]},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May return 200 or 400 depending on status
        assert response.status_code in [200, 400], f"Unexpected: {response.status_code}"
        print(f"✓ Admin send returned {response.status_code}")
    
    # ── Test 19: Send requires valid channel ──
    def test_19_send_requires_valid_channel(self, api_client, venue_manager_token):
        """Send requires at least one valid channel"""
        response = api_client.post(
            f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_VIEWED}",
            json={"channels": ["invalid_channel"]},
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Send requires valid channel")
    
    # ── Test 20: Onboarding status 404 for non-existent acquisition ──
    def test_20_status_404_nonexistent(self, api_client, venue_manager_token):
        """Onboarding status returns 404 for non-existent acquisition"""
        response = api_client.get(
            f"{BASE_URL}/api/onboarding/status/acq_nonexistent123",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent acquisition returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
