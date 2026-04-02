"""
VenuLoQ Phase 2 - Team Lead Review Surface Tests
Tests for Team Lead (vam role) review queue and status transitions.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEAM_LEAD_EMAIL = "teamlead@venuloq.in"
TEAM_LEAD_PASSWORD = "test123"
SPECIALIST_EMAIL = "specialist@venuloq.in"
SPECIALIST_PASSWORD = "test123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"


class TestTeamLeadReviewPhase2:
    """Phase 2: Team Lead Review Queue and Status Transitions"""
    
    team_lead_token = None
    specialist_token = None
    admin_token = None
    test_acquisition_id = None
    
    # ── Authentication Tests ──
    
    def test_01_team_lead_login(self):
        """Team Lead (vam role) can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_LEAD_EMAIL,
            "password": TEAM_LEAD_PASSWORD
        })
        print(f"Team Lead login response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Team Lead login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "vam", f"Expected role 'vam', got {data.get('user', {}).get('role')}"
        
        TestTeamLeadReviewPhase2.team_lead_token = data["token"]
        print(f"Team Lead logged in successfully with role: {data['user']['role']}")
    
    def test_02_specialist_login(self):
        """Specialist can login for creating test data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SPECIALIST_EMAIL,
            "password": SPECIALIST_PASSWORD
        })
        assert response.status_code == 200, f"Specialist login failed: {response.text}"
        
        data = response.json()
        TestTeamLeadReviewPhase2.specialist_token = data["token"]
        print(f"Specialist logged in successfully")
    
    # ── Access Control Tests ──
    
    def test_03_team_lead_can_access_acquisitions(self):
        """Team Lead can access acquisitions list"""
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        response = requests.get(f"{BASE_URL}/api/acquisitions/", headers=headers)
        
        print(f"Team Lead acquisitions access: {response.status_code}")
        assert response.status_code == 200, f"Team Lead cannot access acquisitions: {response.text}"
        
        data = response.json()
        assert "acquisitions" in data, "No acquisitions key in response"
        print(f"Team Lead can see {len(data['acquisitions'])} acquisitions")
    
    def test_04_team_lead_can_filter_submitted_for_review(self):
        """GET /api/acquisitions/?status=submitted_for_review returns submitted records"""
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        response = requests.get(f"{BASE_URL}/api/acquisitions/?status=submitted_for_review", headers=headers)
        
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        data = response.json()
        acquisitions = data.get("acquisitions", [])
        print(f"Found {len(acquisitions)} submitted_for_review acquisitions")
        
        # All returned should have status submitted_for_review
        for acq in acquisitions:
            assert acq.get("status") == "submitted_for_review", f"Wrong status: {acq.get('status')}"
        
        # Store one for later tests
        if acquisitions:
            TestTeamLeadReviewPhase2.test_acquisition_id = acquisitions[0]["acquisition_id"]
            print(f"Using acquisition {self.test_acquisition_id} for status transition tests")
    
    def test_05_team_lead_can_get_stats_summary(self):
        """Team Lead can access stats summary"""
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        response = requests.get(f"{BASE_URL}/api/acquisitions/stats/summary", headers=headers)
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        data = response.json()
        assert "by_status" in data, "No by_status in stats"
        print(f"Stats: {data}")
    
    # ── Status Transition Tests ──
    
    def test_06_send_back_requires_reason(self):
        """POST /api/acquisitions/{id}/status with 'sent_back_to_specialist' requires reason"""
        if not self.test_acquisition_id:
            pytest.skip("No test acquisition available")
        
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        
        # Try without reason - should fail
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{self.test_acquisition_id}/status",
            headers=headers,
            json={"new_status": "sent_back_to_specialist"}
        )
        
        print(f"Send back without reason: {response.status_code} - {response.text}")
        assert response.status_code == 400, f"Should require reason, got {response.status_code}"
        assert "reason" in response.text.lower(), "Error should mention reason"
    
    def test_07_reject_requires_reason(self):
        """POST /api/acquisitions/{id}/status with 'rejected' requires reason"""
        if not self.test_acquisition_id:
            pytest.skip("No test acquisition available")
        
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        
        # Try without reason - should fail
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{self.test_acquisition_id}/status",
            headers=headers,
            json={"new_status": "rejected"}
        )
        
        print(f"Reject without reason: {response.status_code} - {response.text}")
        assert response.status_code == 400, f"Should require reason, got {response.status_code}"
        assert "reason" in response.text.lower(), "Error should mention reason"
    
    def test_08_pass_to_data_team_works_without_reason(self):
        """POST /api/acquisitions/{id}/status with 'under_data_refinement' works without reason"""
        if not self.test_acquisition_id:
            pytest.skip("No test acquisition available")
        
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        
        # First check current status
        get_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{self.test_acquisition_id}",
            headers=headers
        )
        current_status = get_response.json().get("status")
        print(f"Current status: {current_status}")
        
        if current_status != "submitted_for_review":
            pytest.skip(f"Acquisition not in submitted_for_review status (is {current_status})")
        
        # Pass to data team without reason - should work
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{self.test_acquisition_id}/status",
            headers=headers,
            json={"new_status": "under_data_refinement"}
        )
        
        print(f"Pass to data team: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Pass to data team failed: {response.text}"
        
        # Verify status changed
        verify_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{self.test_acquisition_id}",
            headers=headers
        )
        assert verify_response.json().get("status") == "under_data_refinement"
    
    def test_09_team_lead_cannot_transition_from_draft(self):
        """Team Lead cannot transition from draft status (only from submitted_for_review)"""
        # Create a draft acquisition as specialist
        headers = {"Authorization": f"Bearer {self.specialist_token}"}
        
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=headers,
            json={
                "venue_name": "TEST_Draft_Venue_Phase2",
                "capture_mode": "quick"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test draft: {create_response.text}")
        
        draft_id = create_response.json().get("acquisition_id")
        print(f"Created draft: {draft_id}")
        
        # Try to transition as team lead
        tl_headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{draft_id}/status",
            headers=tl_headers,
            json={"new_status": "under_data_refinement", "reason": "Test"}
        )
        
        print(f"Team Lead transition from draft: {response.status_code} - {response.text}")
        assert response.status_code == 400, f"Should not allow transition from draft, got {response.status_code}"
    
    def test_10_status_history_logs_user_role_timestamp_reason(self):
        """Status transitions log user/role/timestamp/reason in history"""
        # Create and submit a new acquisition for this test
        spec_headers = {"Authorization": f"Bearer {self.specialist_token}"}
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=spec_headers,
            json={
                "venue_name": "TEST_History_Venue_Phase2",
                "owner_name": "Test Owner",
                "owner_phone": "9876543210",
                "city": "Mumbai",
                "locality": "Andheri",
                "venue_type": "banquet_hall",
                "capacity_min": 100,
                "capacity_max": 500,
                "capture_mode": "full"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test acquisition: {create_response.text}")
        
        acq_id = create_response.json().get("acquisition_id")
        print(f"Created acquisition: {acq_id}")
        
        # Submit for review
        submit_response = requests.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            headers=spec_headers,
            json={"new_status": "submitted_for_review"}
        )
        print(f"Submit response: {submit_response.status_code}")
        
        if submit_response.status_code != 200:
            pytest.skip(f"Could not submit: {submit_response.text}")
        
        # Team lead sends back with reason
        tl_headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        send_back_response = requests.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            headers=tl_headers,
            json={
                "new_status": "sent_back_to_specialist",
                "reason": "Missing photos and commercial details",
                "notes": "Please add at least 3 photos"
            }
        )
        
        print(f"Send back response: {send_back_response.status_code} - {send_back_response.text}")
        assert send_back_response.status_code == 200, f"Send back failed: {send_back_response.text}"
        
        # Verify history
        get_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers=tl_headers
        )
        
        acq_data = get_response.json()
        history = acq_data.get("history", [])
        
        # Find the send_back entry
        send_back_entry = None
        for h in history:
            if "sent_back_to_specialist" in str(h.get("action", "")) or h.get("status") == "sent_back_to_specialist":
                send_back_entry = h
                break
        
        assert send_back_entry is not None, "Send back history entry not found"
        print(f"History entry: {send_back_entry}")
        
        # Verify fields
        assert send_back_entry.get("by_user_id"), "Missing by_user_id"
        assert send_back_entry.get("by_role") == "vam", f"Expected role 'vam', got {send_back_entry.get('by_role')}"
        assert send_back_entry.get("timestamp"), "Missing timestamp"
        assert send_back_entry.get("reason") == "Missing photos and commercial details", "Reason not logged"
        assert send_back_entry.get("notes") == "Please add at least 3 photos", "Notes not logged"
    
    def test_11_team_lead_can_reject_with_reason(self):
        """Team Lead can reject with reason"""
        # Create and submit a new acquisition
        spec_headers = {"Authorization": f"Bearer {self.specialist_token}"}
        
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=spec_headers,
            json={
                "venue_name": "TEST_Reject_Venue_Phase2",
                "owner_name": "Test Owner",
                "owner_phone": "9876543211",
                "city": "Mumbai",
                "locality": "Bandra",
                "venue_type": "banquet_hall",
                "capacity_min": 50,
                "capacity_max": 200,
                "capture_mode": "full"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create: {create_response.text}")
        
        acq_id = create_response.json().get("acquisition_id")
        
        # Submit
        requests.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            headers=spec_headers,
            json={"new_status": "submitted_for_review"}
        )
        
        # Reject with reason
        tl_headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        reject_response = requests.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            headers=tl_headers,
            json={
                "new_status": "rejected",
                "reason": "Venue permanently closed"
            }
        )
        
        print(f"Reject response: {reject_response.status_code} - {reject_response.text}")
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        
        # Verify status
        get_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers=tl_headers
        )
        assert get_response.json().get("status") == "rejected"
    
    def test_12_completeness_posture_in_response(self):
        """Acquisition response includes completeness posture data"""
        if not self.test_acquisition_id:
            pytest.skip("No test acquisition available")
        
        headers = {"Authorization": f"Bearer {self.team_lead_token}"}
        response = requests.get(
            f"{BASE_URL}/api/acquisitions/{self.test_acquisition_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        completeness = data.get("completeness", {})
        print(f"Completeness: {completeness}")
        
        # Verify posture fields exist
        assert "mandatory" in completeness, "Missing mandatory posture"
        assert "media" in completeness, "Missing media posture"
        assert "commercial" in completeness, "Missing commercial posture"
        assert "followup" in completeness, "Missing followup posture"
        
        # Verify structure
        assert "filled" in completeness["mandatory"], "Missing filled count"
        assert "total" in completeness["mandatory"], "Missing total count"
        assert "complete" in completeness["mandatory"], "Missing complete flag"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
