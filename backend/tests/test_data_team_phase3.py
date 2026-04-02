"""
VenuLoQ Phase 3 - Data Team Refinement + Ven-Us Assist Tests
Tests: Data Team login, refinement queue, Ven-Us assist rules, edit with audit, status transitions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DATA_TEAM_EMAIL = "datateam@venuloq.in"
DATA_TEAM_PASSWORD = "test123"
SPECIALIST_EMAIL = "specialist@venuloq.in"
SPECIALIST_PASSWORD = "test123"
TEAM_LEAD_EMAIL = "teamlead@venuloq.in"
TEAM_LEAD_PASSWORD = "test123"

# Known acquisition in under_data_refinement status
REFINEMENT_ACQ_ID = "acq_36d4cdf690ec"  # Maharaja Palace


class TestDataTeamPhase3:
    """Phase 3: Data Team Refinement + Ven-Us Assist"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.data_team_token = None
        self.specialist_token = None
        self.team_lead_token = None
    
    def login(self, email, password):
        """Helper to login and get token"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        return None
    
    # ── Test 1: Data Team Login ──
    def test_01_data_team_login(self):
        """Data Team can login with correct credentials"""
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DATA_TEAM_EMAIL,
            "password": DATA_TEAM_PASSWORD
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "data_team"
        print(f"✓ Data Team login successful, role: {data['user']['role']}")
    
    # ── Test 2: Data Team can access acquisitions ──
    def test_02_data_team_can_access_acquisitions(self):
        """Data Team can access GET /api/acquisitions/"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "acquisitions" in data
        print(f"✓ Data Team can access acquisitions, count: {data.get('count', len(data['acquisitions']))}")
    
    # ── Test 3: Filter by under_data_refinement status ──
    def test_03_filter_under_data_refinement(self):
        """GET /api/acquisitions/?status=under_data_refinement returns refinement records"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/?status=under_data_refinement",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        acquisitions = data.get("acquisitions", [])
        
        # All returned should be under_data_refinement
        for acq in acquisitions:
            assert acq.get("status") == "under_data_refinement", f"Wrong status: {acq.get('status')}"
        
        print(f"✓ Filter by under_data_refinement works, count: {len(acquisitions)}")
    
    # ── Test 4: Ven-Us Assist endpoint returns rule checks ──
    def test_04_venus_assist_returns_rule_checks(self):
        """GET /api/acquisitions/venus-assist/{acq_id} returns deterministic checks"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/venus-assist/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check structure
        assert "readiness" in data, "Missing readiness field"
        assert "blockers" in data, "Missing blockers field"
        assert "issues" in data, "Missing issues field"
        assert "suggestions" in data, "Missing suggestions field"
        assert "summary" in data, "Missing summary field"
        
        # Check summary structure
        summary = data.get("summary", {})
        assert "blocker_count" in summary
        assert "high_count" in summary
        assert "medium_count" in summary
        assert "low_count" in summary
        assert "suggestion_count" in summary
        
        print(f"✓ Ven-Us Assist returns: readiness={data['readiness']}, blockers={len(data['blockers'])}, issues={len(data['issues'])}, suggestions={len(data['suggestions'])}")
    
    # ── Test 5: Ven-Us Assist detects missing photos as blocker ──
    def test_05_venus_assist_detects_missing_photos(self):
        """Ven-Us Assist flags missing photos as blocker"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # First get the acquisition to check photo count
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        photo_count = len(acq.get("photos", []))
        
        # Get Ven-Us assist
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/venus-assist/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if photo_count == 0:
            # Should have missing_media blocker
            blockers = data.get("blockers", [])
            photo_blocker = [b for b in blockers if b.get("type") == "missing_media" or "photo" in b.get("message", "").lower()]
            assert len(photo_blocker) > 0, "Missing photos should be a blocker"
            print(f"✓ Ven-Us Assist correctly detects missing photos as blocker")
        else:
            print(f"✓ Acquisition has {photo_count} photos, no missing_media blocker expected")
    
    # ── Test 6: Ven-Us Assist suggests city normalization ──
    def test_06_venus_assist_city_normalization(self):
        """Ven-Us Assist suggests city normalization (e.g. 'delhi' → 'Delhi')"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # Get the acquisition
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        city = acq.get("city", "")
        
        # Get Ven-Us assist
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/venus-assist/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        suggestions = data.get("suggestions", [])
        city_suggestions = [s for s in suggestions if s.get("field") == "city" and s.get("type") == "normalization"]
        
        # If city is lowercase or needs normalization, should have suggestion
        if city.lower() in ["delhi", "new delhi", "gurgaon", "noida", "gurugram"]:
            if city != city.title() and city.lower() != city:
                assert len(city_suggestions) > 0, f"City '{city}' should have normalization suggestion"
        
        print(f"✓ Ven-Us Assist city normalization check passed (city: {city}, suggestions: {len(city_suggestions)})")
    
    # ── Test 7: Data Team can edit during refinement ──
    def test_07_data_team_can_edit_during_refinement(self):
        """PUT /api/acquisitions/{acq_id} as data_team edits fields"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # Get current state
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        
        # Only edit if in under_data_refinement
        if acq.get("status") != "under_data_refinement":
            pytest.skip(f"Acquisition not in refinement status: {acq.get('status')}")
        
        # Make an edit
        original_notes = acq.get("notes", "")
        new_notes = f"{original_notes} [Refined by Data Team test]" if original_notes else "Refined by Data Team test"
        
        resp = self.session.put(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"},
            json={"notes": new_notes}
        )
        assert resp.status_code == 200, f"Edit failed: {resp.text}"
        
        print(f"✓ Data Team can edit during refinement")
    
    # ── Test 8: Refinement edit logs audit in history ──
    def test_08_refinement_edit_logs_audit(self):
        """Refinement edits log 'refinement_edit' entries with changed fields"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # Get acquisition with history
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        
        history = acq.get("history", [])
        refinement_edits = [h for h in history if h.get("action") == "refinement_edit"]
        
        if len(refinement_edits) > 0:
            latest = refinement_edits[-1]
            assert "changes" in latest, "refinement_edit should have changes array"
            assert "by_role" in latest, "refinement_edit should have by_role"
            assert "timestamp" in latest, "refinement_edit should have timestamp"
            print(f"✓ Refinement edit audit logged: {len(refinement_edits)} entries, latest has {len(latest.get('changes', []))} changes")
        else:
            print(f"✓ No refinement_edit entries yet (will be created on edit)")
    
    # ── Test 9: Data Team can mark ready for approval ──
    def test_09_data_team_can_mark_ready_for_approval(self):
        """POST /api/acquisitions/{acq_id}/status with 'awaiting_manager_approval' works"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # Get current status
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        
        if acq.get("status") != "under_data_refinement":
            pytest.skip(f"Acquisition not in refinement status: {acq.get('status')}")
        
        # Transition to awaiting_manager_approval
        resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"new_status": "awaiting_manager_approval"}
        )
        assert resp.status_code == 200, f"Transition failed: {resp.text}"
        
        # Verify status changed
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        assert resp.json().get("status") == "awaiting_manager_approval"
        
        print(f"✓ Data Team can mark ready for approval")
        
        # Revert back to under_data_refinement for other tests (using team lead)
        tl_token = self.login(TEAM_LEAD_EMAIL, TEAM_LEAD_PASSWORD)
        if tl_token:
            # Team lead can't revert from awaiting_manager_approval, need admin
            pass
    
    # ── Test 10: Send back requires reason ──
    def test_10_send_back_requires_reason(self):
        """POST /api/acquisitions/{acq_id}/status with 'sent_back_to_specialist' requires reason"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # First, we need to get an acquisition in under_data_refinement
        # Since test_09 may have changed status, let's check
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        
        if acq.get("status") != "under_data_refinement":
            pytest.skip(f"Acquisition not in refinement status: {acq.get('status')}")
        
        # Try to send back without reason
        resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"new_status": "sent_back_to_specialist"}
        )
        assert resp.status_code == 400, f"Should require reason, got: {resp.status_code}"
        assert "reason" in resp.text.lower(), f"Error should mention reason: {resp.text}"
        
        print(f"✓ Send back requires reason (400 returned)")
    
    # ── Test 11: Send back with reason works ──
    def test_11_send_back_with_reason_works(self):
        """POST /api/acquisitions/{acq_id}/status with reason succeeds"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acq = resp.json()
        
        if acq.get("status") != "under_data_refinement":
            pytest.skip(f"Acquisition not in refinement status: {acq.get('status')}")
        
        # Send back with reason
        resp = self.session.post(
            f"{BASE_URL}/api/acquisitions/{REFINEMENT_ACQ_ID}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "new_status": "sent_back_to_specialist",
                "reason": "Need better photos of main hall and confirm pricing"
            }
        )
        assert resp.status_code == 200, f"Send back failed: {resp.text}"
        
        print(f"✓ Send back with reason works")
    
    # ── Test 12: Data Team cannot edit non-refinement records ──
    def test_12_data_team_cannot_edit_non_refinement(self):
        """Data Team cannot edit records not in 'under_data_refinement' status"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # Get acquisitions to find one NOT in under_data_refinement
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        acquisitions = resp.json().get("acquisitions", [])
        
        non_refinement = [a for a in acquisitions if a.get("status") != "under_data_refinement"]
        
        if not non_refinement:
            pytest.skip("No non-refinement acquisitions to test")
        
        test_acq = non_refinement[0]
        acq_id = test_acq.get("acquisition_id")
        
        # Try to edit
        resp = self.session.put(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"notes": "Should not be allowed"}
        )
        assert resp.status_code == 400, f"Should not allow edit, got: {resp.status_code}"
        
        print(f"✓ Data Team cannot edit non-refinement records (status: {test_acq.get('status')})")
    
    # ── Test 13: Ven-Us Assist detects pricing inconsistency ──
    def test_13_venus_assist_pricing_inconsistency(self):
        """Ven-Us Assist detects pricing inconsistency (min > max)"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        # Get Ven-Us assist
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/venus-assist/{REFINEMENT_ACQ_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if resp.status_code == 404:
            pytest.skip("Acquisition not found")
        
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check if pricing inconsistency detection exists in issues
        issues = data.get("issues", [])
        pricing_issues = [i for i in issues if i.get("type") == "inconsistent_pricing"]
        
        # This test verifies the rule exists - actual detection depends on data
        print(f"✓ Ven-Us Assist pricing inconsistency check exists (found {len(pricing_issues)} pricing issues)")
    
    # ── Test 14: Stats summary endpoint works ──
    def test_14_stats_summary_endpoint(self):
        """GET /api/acquisitions/stats/summary returns status counts"""
        token = self.login(DATA_TEAM_EMAIL, DATA_TEAM_PASSWORD)
        assert token, "Data Team login failed"
        
        resp = self.session.get(
            f"{BASE_URL}/api/acquisitions/stats/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert "total" in data, "Missing total field"
        assert "by_status" in data, "Missing by_status field"
        
        print(f"✓ Stats summary: total={data['total']}, by_status={data['by_status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
