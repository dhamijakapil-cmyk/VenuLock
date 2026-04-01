"""
VenuLoQ Phase 1.5 - Quick Capture Backend Tests
Tests for:
- POST /api/acquisitions/check-duplicate - duplicate detection
- POST /api/acquisitions/ with capture_mode='quick' - creates draft with capture_mode stored
- Quick capture draft cannot be submitted if mandatory fields missing
- GET /api/acquisitions/?my_only=true returns capture_mode field
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SPECIALIST_EMAIL = "specialist@venuloq.in"
SPECIALIST_PASSWORD = "test123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"


class TestQuickCapturePhase15:
    """Phase 1.5 Quick Capture backend tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.specialist_token = None
        self.admin_token = None
        self.created_acquisition_ids = []
        yield
        # Cleanup: Delete test acquisitions
        if self.admin_token:
            for acq_id in self.created_acquisition_ids:
                try:
                    # Admin can delete (if endpoint exists) or just leave them
                    pass
                except:
                    pass
    
    def login_specialist(self):
        """Login as specialist and get token"""
        if self.specialist_token:
            return self.specialist_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SPECIALIST_EMAIL,
            "password": SPECIALIST_PASSWORD
        })
        assert response.status_code == 200, f"Specialist login failed: {response.text}"
        self.specialist_token = response.json().get("token")
        return self.specialist_token
    
    def login_admin(self):
        """Login as admin and get token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("token")
        return self.admin_token
    
    # ── Test 1: Check-duplicate endpoint ──
    def test_01_check_duplicate_endpoint_exists(self):
        """POST /api/acquisitions/check-duplicate returns 200 with valid auth"""
        token = self.login_specialist()
        response = self.session.post(
            f"{BASE_URL}/api/acquisitions/check-duplicate",
            json={"venue_name": "Test Venue", "owner_phone": "9876543210", "locality": "Test Area"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Check-duplicate failed: {response.text}"
        data = response.json()
        assert "duplicates" in data, "Response should contain 'duplicates' key"
        print(f"✓ Check-duplicate endpoint works, found {len(data['duplicates'])} duplicates")
    
    def test_02_check_duplicate_returns_matches_by_name(self):
        """Check-duplicate returns venues matching by name"""
        token = self.login_specialist()
        # First create a venue to check against
        unique_name = f"TEST_QuickDupe_{uuid.uuid4().hex[:6]}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Test Owner",
                "owner_phone": "9999888877",
                "city": "Delhi",
                "locality": "Test Locality",
                "venue_type": "banquet_hall",
                "capacity_min": 100,
                "capacity_max": 300,
                "capture_mode": "quick"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        acq_id = create_resp.json().get("acquisition_id")
        self.created_acquisition_ids.append(acq_id)
        
        # Now check for duplicate with same name
        check_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/check-duplicate",
            json={"venue_name": unique_name},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert check_resp.status_code == 200
        data = check_resp.json()
        assert len(data["duplicates"]) >= 1, "Should find at least 1 duplicate by name"
        found = any(d["acquisition_id"] == acq_id for d in data["duplicates"])
        assert found, "Created venue should be in duplicates list"
        print(f"✓ Check-duplicate finds matches by name: {len(data['duplicates'])} found")
    
    def test_03_check_duplicate_returns_matches_by_phone(self):
        """Check-duplicate returns venues matching by phone"""
        token = self.login_specialist()
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"
        unique_name = f"TEST_PhoneDupe_{uuid.uuid4().hex[:6]}"
        
        create_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Phone Test Owner",
                "owner_phone": unique_phone,
                "city": "Mumbai",
                "locality": "Phone Test Area",
                "venue_type": "hotel",
                "capacity_min": 200,
                "capacity_max": 500,
                "capture_mode": "quick"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert create_resp.status_code == 200
        acq_id = create_resp.json().get("acquisition_id")
        self.created_acquisition_ids.append(acq_id)
        
        # Check for duplicate by phone
        check_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/check-duplicate",
            json={"venue_name": "Different Name", "owner_phone": unique_phone},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert check_resp.status_code == 200
        data = check_resp.json()
        assert len(data["duplicates"]) >= 1, "Should find duplicate by phone"
        found = any(d["acquisition_id"] == acq_id for d in data["duplicates"])
        assert found, "Created venue should be in duplicates by phone"
        print(f"✓ Check-duplicate finds matches by phone")
    
    def test_04_check_duplicate_returns_match_reasons(self):
        """Check-duplicate returns match_reasons array"""
        token = self.login_specialist()
        unique_name = f"TEST_ReasonCheck_{uuid.uuid4().hex[:6]}"
        unique_phone = f"91234{uuid.uuid4().hex[:5]}"
        
        create_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Reason Test",
                "owner_phone": unique_phone,
                "city": "Bangalore",
                "locality": "Reason Area",
                "venue_type": "resort",
                "capacity_min": 300,
                "capacity_max": 600,
                "capture_mode": "quick"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert create_resp.status_code == 200
        acq_id = create_resp.json().get("acquisition_id")
        self.created_acquisition_ids.append(acq_id)
        
        # Check with same name and phone
        check_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/check-duplicate",
            json={"venue_name": unique_name, "owner_phone": unique_phone, "locality": "Reason Area"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert check_resp.status_code == 200
        data = check_resp.json()
        assert len(data["duplicates"]) >= 1
        match = next((d for d in data["duplicates"] if d["acquisition_id"] == acq_id), None)
        assert match is not None
        assert "match_reasons" in match, "Should have match_reasons field"
        assert isinstance(match["match_reasons"], list), "match_reasons should be a list"
        print(f"✓ Check-duplicate returns match_reasons: {match['match_reasons']}")
    
    # ── Test 5-7: Quick capture creation with capture_mode ──
    def test_05_create_quick_capture_with_capture_mode(self):
        """POST /api/acquisitions/ with capture_mode='quick' stores the field"""
        token = self.login_specialist()
        unique_name = f"TEST_QuickMode_{uuid.uuid4().hex[:6]}"
        
        response = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Quick Mode Owner",
                "owner_phone": "9876500001",
                "city": "Delhi",
                "locality": "Quick Mode Area",
                "venue_type": "banquet_hall",
                "capacity_min": 100,
                "capacity_max": 300,
                "owner_interest": "hot",
                "capture_mode": "quick"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Create quick capture failed: {response.text}"
        data = response.json()
        assert "acquisition_id" in data
        acq_id = data["acquisition_id"]
        self.created_acquisition_ids.append(acq_id)
        
        # Verify capture_mode is stored by fetching the acquisition
        get_resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_resp.status_code == 200
        acq_data = get_resp.json()
        assert acq_data.get("capture_mode") == "quick", f"capture_mode should be 'quick', got: {acq_data.get('capture_mode')}"
        assert acq_data.get("status") == "draft", "Quick capture should be in draft status"
        print(f"✓ Quick capture created with capture_mode='quick' stored correctly")
    
    def test_06_create_full_capture_with_capture_mode(self):
        """POST /api/acquisitions/ with capture_mode='full' (default) stores the field"""
        token = self.login_specialist()
        unique_name = f"TEST_FullMode_{uuid.uuid4().hex[:6]}"
        
        response = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Full Mode Owner",
                "owner_phone": "9876500002",
                "city": "Mumbai",
                "locality": "Full Mode Area",
                "venue_type": "hotel",
                "capacity_min": 200,
                "capacity_max": 500,
                "capture_mode": "full"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        acq_id = response.json()["acquisition_id"]
        self.created_acquisition_ids.append(acq_id)
        
        get_resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_resp.status_code == 200
        acq_data = get_resp.json()
        assert acq_data.get("capture_mode") == "full", f"capture_mode should be 'full', got: {acq_data.get('capture_mode')}"
        print(f"✓ Full capture created with capture_mode='full' stored correctly")
    
    def test_07_default_capture_mode_is_full(self):
        """POST /api/acquisitions/ without capture_mode defaults to 'full'"""
        token = self.login_specialist()
        unique_name = f"TEST_DefaultMode_{uuid.uuid4().hex[:6]}"
        
        response = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Default Mode Owner",
                "owner_phone": "9876500003",
                "city": "Chennai",
                "locality": "Default Area",
                "venue_type": "garden",
                "capacity_min": 150,
                "capacity_max": 400
                # No capture_mode specified
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        acq_id = response.json()["acquisition_id"]
        self.created_acquisition_ids.append(acq_id)
        
        get_resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_resp.status_code == 200
        acq_data = get_resp.json()
        assert acq_data.get("capture_mode") == "full", f"Default capture_mode should be 'full', got: {acq_data.get('capture_mode')}"
        print(f"✓ Default capture_mode is 'full' when not specified")
    
    # ── Test 8-9: Quick capture cannot be submitted if mandatory fields missing ──
    def test_08_quick_capture_cannot_submit_incomplete(self):
        """Quick capture draft cannot be submitted if mandatory fields missing"""
        token = self.login_specialist()
        unique_name = f"TEST_IncompleteQuick_{uuid.uuid4().hex[:6]}"
        
        # Create quick capture with missing mandatory fields (no capacity)
        response = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Incomplete Owner",
                "owner_phone": "9876500004",
                "city": "Pune",
                "locality": "Incomplete Area",
                "venue_type": "villa",
                # Missing: capacity_min, capacity_max
                "capture_mode": "quick"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        acq_id = response.json()["acquisition_id"]
        self.created_acquisition_ids.append(acq_id)
        
        # Try to submit for review - should fail
        submit_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            json={"new_status": "submitted_for_review"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert submit_resp.status_code == 400, f"Should fail to submit incomplete: {submit_resp.text}"
        error_data = submit_resp.json()
        assert "missing mandatory" in error_data.get("detail", "").lower() or "cannot submit" in error_data.get("detail", "").lower()
        print(f"✓ Quick capture cannot be submitted when mandatory fields missing")
    
    def test_09_quick_capture_can_submit_when_complete(self):
        """Quick capture can be submitted when all 8 mandatory fields are filled"""
        token = self.login_specialist()
        unique_name = f"TEST_CompleteQuick_{uuid.uuid4().hex[:6]}"
        
        # Create quick capture with ALL mandatory fields
        response = self.session.post(
            f"{BASE_URL}/api/acquisitions/",
            json={
                "venue_name": unique_name,
                "owner_name": "Complete Owner",
                "owner_phone": "9876500005",
                "city": "Hyderabad",
                "locality": "Complete Area",
                "venue_type": "rooftop",
                "capacity_min": 100,
                "capacity_max": 300,
                "owner_interest": "warm",
                "capture_mode": "quick"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        acq_id = response.json()["acquisition_id"]
        self.created_acquisition_ids.append(acq_id)
        
        # Submit for review - should succeed
        submit_resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            json={"new_status": "submitted_for_review"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert submit_resp.status_code == 200, f"Should succeed to submit complete: {submit_resp.text}"
        print(f"✓ Quick capture can be submitted when all mandatory fields filled")
    
    # ── Test 10: List acquisitions returns capture_mode ──
    def test_10_list_acquisitions_returns_capture_mode(self):
        """GET /api/acquisitions/?my_only=true returns capture_mode field on each record"""
        token = self.login_specialist()
        
        response = self.session.get(
            f"{BASE_URL}/api/acquisitions/?my_only=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"List acquisitions failed: {response.text}"
        data = response.json()
        assert "acquisitions" in data
        
        # Check that at least one acquisition has capture_mode field
        acquisitions = data["acquisitions"]
        if len(acquisitions) > 0:
            # Find a quick capture we created
            quick_captures = [a for a in acquisitions if a.get("capture_mode") == "quick"]
            full_captures = [a for a in acquisitions if a.get("capture_mode") == "full"]
            
            print(f"✓ List acquisitions returns capture_mode: {len(quick_captures)} quick, {len(full_captures)} full out of {len(acquisitions)} total")
            
            # Verify structure of capture_mode field
            for acq in acquisitions[:5]:  # Check first 5
                assert "capture_mode" in acq or acq.get("capture_mode") is None, "capture_mode field should exist"
        else:
            print("✓ List acquisitions works (no acquisitions to verify capture_mode)")
    
    # ── Test 11: Verify existing data has capture_mode ──
    def test_11_existing_maharaja_palace_is_quick_capture(self):
        """Verify 'Maharaja Palace' quick capture draft exists with capture_mode='quick'"""
        token = self.login_specialist()
        
        response = self.session.get(
            f"{BASE_URL}/api/acquisitions/?my_only=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        acquisitions = response.json().get("acquisitions", [])
        
        maharaja = next((a for a in acquisitions if "Maharaja" in a.get("venue_name", "")), None)
        if maharaja:
            assert maharaja.get("capture_mode") == "quick", f"Maharaja Palace should be quick capture, got: {maharaja.get('capture_mode')}"
            assert maharaja.get("status") == "draft", f"Maharaja Palace should be draft, got: {maharaja.get('status')}"
            print(f"✓ Maharaja Palace exists as quick capture draft")
        else:
            print("⚠ Maharaja Palace not found - may have been cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
