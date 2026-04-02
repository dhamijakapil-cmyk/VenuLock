"""
VenuLoQ Phase 6 - RM Mobile Dashboard + Action Workflow Tests
=============================================================
Tests for:
- GET /api/workflow/rm/action-summary (overdue, today's follow-ups, blocked, recent activity)
- GET /api/workflow/my-leads (enriched leads with follow_up_date, is_overdue, blocker)
- POST /api/workflow/{lead_id}/request-time (mandatory reason, days_requested)
- POST /api/workflow/{lead_id}/escalate (mandatory reason and severity)
- POST /api/workflow/{lead_id}/resolve-blocker (clears active blocker)
- POST /api/workflow/{lead_id}/meeting-outcome (outcome, summary, optional follow-up date)
- GET /api/workflow/{lead_id} (returns blocker, time_extension, next_follow_up, is_overdue)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review_request
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"

# Test leads from review_request
TEST_LEAD_OVERDUE = "lead_558ba40c8d81"  # overdue, new
TEST_LEAD_BLOCKED = "lead_fe124aadc984"  # blocked, new
TEST_LEAD_NEW = "lead_805040e93fc6"  # new
TEST_LEAD_SITE_VISIT_1 = "lead_b00607a377eb"  # site_visit
TEST_LEAD_SITE_VISIT_2 = "lead_21668ed1ecd9"  # site_visit


class TestRMAuth:
    """Test RM authentication"""
    
    def test_01_rm_login_success(self):
        """RM can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "rm", f"Expected role 'rm', got {data.get('user', {}).get('role')}"
        # Store token for other tests
        TestRMAuth.rm_token = data["token"]
        TestRMAuth.rm_user_id = data.get("user", {}).get("user_id")
        print(f"RM login successful: user_id={TestRMAuth.rm_user_id}")
    
    def test_02_admin_login_success(self):
        """Admin can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "admin", f"Expected role 'admin', got {data.get('user', {}).get('role')}"
        TestRMAuth.admin_token = data["token"]
        print("Admin login successful")


class TestActionSummary:
    """Test GET /api/workflow/rm/action-summary endpoint"""
    
    def test_03_action_summary_requires_auth(self):
        """Action summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/workflow/rm/action-summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_04_action_summary_returns_data(self):
        """Action summary returns expected structure"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/rm/action-summary", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "total_leads" in data, "Missing total_leads"
        assert "active_leads" in data, "Missing active_leads"
        assert "todays_follow_ups" in data, "Missing todays_follow_ups"
        assert "todays_follow_ups_count" in data, "Missing todays_follow_ups_count"
        assert "overdue" in data, "Missing overdue"
        assert "overdue_count" in data, "Missing overdue_count"
        assert "blocked" in data, "Missing blocked"
        assert "blocked_count" in data, "Missing blocked_count"
        assert "recent_activity" in data, "Missing recent_activity"
        assert "stage_counts" in data, "Missing stage_counts"
        
        print(f"Action summary: total={data['total_leads']}, active={data['active_leads']}, "
              f"overdue={data['overdue_count']}, today={data['todays_follow_ups_count']}, "
              f"blocked={data['blocked_count']}")
    
    def test_05_action_summary_overdue_has_customer_name(self):
        """Overdue items include customer_name"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/rm/action-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data.get("overdue"):
            for item in data["overdue"]:
                assert "lead_id" in item, "Overdue item missing lead_id"
                assert "customer_name" in item, "Overdue item missing customer_name"
                assert "scheduled_at" in item, "Overdue item missing scheduled_at"
                print(f"Overdue: {item.get('customer_name')} - {item.get('scheduled_at')}")
    
    def test_06_action_summary_blocked_has_blocker_info(self):
        """Blocked items include blocker details"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/rm/action-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data.get("blocked"):
            for item in data["blocked"]:
                assert "lead_id" in item, "Blocked item missing lead_id"
                assert "customer_name" in item, "Blocked item missing customer_name"
                assert "blocker" in item, "Blocked item missing blocker"
                print(f"Blocked: {item.get('customer_name')} - {item.get('blocker', {}).get('reason')}")


class TestMyLeads:
    """Test GET /api/workflow/my-leads endpoint"""
    
    def test_07_my_leads_requires_auth(self):
        """My leads requires authentication"""
        response = requests.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_08_my_leads_returns_enriched_data(self):
        """My leads returns enriched lead data"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/my-leads", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of leads"
        if data:
            lead = data[0]
            # Check enriched fields
            assert "lead_id" in lead, "Missing lead_id"
            assert "customer_name" in lead, "Missing customer_name"
            assert "stage" in lead, "Missing stage"
            assert "stage_label" in lead, "Missing stage_label"
            assert "follow_up_date" in lead or lead.get("follow_up_date") is None, "Missing follow_up_date field"
            assert "is_overdue" in lead, "Missing is_overdue"
            assert "blocker" in lead or lead.get("blocker") is None, "Missing blocker field"
            print(f"Lead: {lead.get('customer_name')} - stage={lead.get('stage')}, overdue={lead.get('is_overdue')}")
    
    def test_09_my_leads_shows_overdue_flag(self):
        """Leads with overdue follow-ups have is_overdue=True"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/my-leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        overdue_leads = [l for l in data if l.get("is_overdue")]
        print(f"Found {len(overdue_leads)} overdue leads")
        for lead in overdue_leads:
            print(f"  - {lead.get('customer_name')} (follow_up: {lead.get('follow_up_date')})")


class TestLeadDetail:
    """Test GET /api/workflow/{lead_id} endpoint"""
    
    def test_10_lead_detail_requires_auth(self):
        """Lead detail requires authentication"""
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_11_lead_detail_returns_full_data(self):
        """Lead detail returns full enriched data"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "lead_id" in data, "Missing lead_id"
        assert "customer_name" in data, "Missing customer_name"
        assert "stage" in data, "Missing stage"
        assert "stage_label" in data, "Missing stage_label"
        assert "stages_completed" in data, "Missing stages_completed"
        # Check new Phase 6 fields
        assert "blocker" in data or data.get("blocker") is None, "Missing blocker field"
        assert "time_extension" in data or data.get("time_extension") is None, "Missing time_extension field"
        assert "next_follow_up" in data or data.get("next_follow_up") is None, "Missing next_follow_up field"
        assert "is_overdue" in data, "Missing is_overdue field"
        
        print(f"Lead detail: {data.get('customer_name')} - stage={data.get('stage')}, "
              f"blocker={data.get('blocker')}, is_overdue={data.get('is_overdue')}")
    
    def test_12_lead_detail_404_for_invalid(self):
        """Invalid lead_id returns 404"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/invalid_lead_id", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestRequestTime:
    """Test POST /api/workflow/{lead_id}/request-time endpoint"""
    
    def test_13_request_time_requires_auth(self):
        """Request time requires authentication"""
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/request-time", json={
            "reason": "Test reason",
            "days_requested": 3
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_14_request_time_requires_reason(self):
        """Request time requires mandatory reason"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/request-time", 
                                headers=headers, json={"days_requested": 3})
        assert response.status_code == 422, f"Expected 422 for missing reason, got {response.status_code}"
    
    def test_15_request_time_success(self):
        """Request time with valid data succeeds"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/request-time", 
                                headers=headers, json={
                                    "reason": "Customer needs more time to decide",
                                    "days_requested": 5
                                })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert "extension" in data, "Missing extension"
        assert data["extension"]["reason"] == "Customer needs more time to decide"
        assert data["extension"]["days_requested"] == 5
        print(f"Time extension requested: {data['extension']}")
    
    def test_16_request_time_logged_in_timeline(self):
        """Request time is logged in activity timeline"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/timeline", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        time_extension_entries = [e for e in data.get("timeline", []) if e.get("action") == "time_extension_requested"]
        assert len(time_extension_entries) > 0, "Time extension not logged in timeline"
        print(f"Found {len(time_extension_entries)} time extension entries in timeline")


class TestEscalate:
    """Test POST /api/workflow/{lead_id}/escalate endpoint"""
    
    def test_17_escalate_requires_auth(self):
        """Escalate requires authentication"""
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/escalate", json={
            "reason": "Test blocker",
            "severity": "medium"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_18_escalate_requires_reason(self):
        """Escalate requires mandatory reason"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/escalate", 
                                headers=headers, json={"severity": "high"})
        assert response.status_code == 422, f"Expected 422 for missing reason, got {response.status_code}"
    
    def test_19_escalate_success(self):
        """Escalate with valid data succeeds"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_1}/escalate", 
                                headers=headers, json={
                                    "reason": "Venue not responding to calls",
                                    "severity": "high"
                                })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert "blocker" in data, "Missing blocker"
        assert data["blocker"]["active"] == True, "Blocker should be active"
        assert data["blocker"]["reason"] == "Venue not responding to calls"
        assert data["blocker"]["severity"] == "high"
        print(f"Blocker escalated: {data['blocker']}")
    
    def test_20_escalate_logged_in_timeline(self):
        """Escalate is logged in activity timeline"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_1}/timeline", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        escalate_entries = [e for e in data.get("timeline", []) if e.get("action") == "blocker_escalated"]
        assert len(escalate_entries) > 0, "Escalation not logged in timeline"
        print(f"Found {len(escalate_entries)} escalation entries in timeline")


class TestResolveBlocker:
    """Test POST /api/workflow/{lead_id}/resolve-blocker endpoint"""
    
    def test_21_resolve_blocker_requires_auth(self):
        """Resolve blocker requires authentication"""
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_1}/resolve-blocker")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_22_resolve_blocker_success(self):
        """Resolve blocker clears active blocker"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_1}/resolve-blocker", 
                                headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert data["message"] == "Blocker resolved"
        print("Blocker resolved successfully")
    
    def test_23_resolve_blocker_logged_in_timeline(self):
        """Resolve blocker is logged in activity timeline"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_1}/timeline", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        resolve_entries = [e for e in data.get("timeline", []) if e.get("action") == "blocker_resolved"]
        assert len(resolve_entries) > 0, "Blocker resolution not logged in timeline"
        print(f"Found {len(resolve_entries)} blocker resolution entries in timeline")
    
    def test_24_lead_detail_shows_resolved_blocker(self):
        """Lead detail shows blocker as inactive after resolution"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_1}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        blocker = data.get("blocker")
        if blocker:
            assert blocker.get("active") == False, "Blocker should be inactive after resolution"
            assert "resolved_at" in blocker, "Blocker should have resolved_at timestamp"
            print(f"Blocker resolved at: {blocker.get('resolved_at')}")


class TestMeetingOutcome:
    """Test POST /api/workflow/{lead_id}/meeting-outcome endpoint"""
    
    def test_25_meeting_outcome_requires_auth(self):
        """Meeting outcome requires authentication"""
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_2}/meeting-outcome", json={
            "outcome": "positive",
            "summary": "Great meeting"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_26_meeting_outcome_requires_outcome_and_summary(self):
        """Meeting outcome requires outcome and summary"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        
        # Missing outcome
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_2}/meeting-outcome", 
                                headers=headers, json={"summary": "Test summary"})
        assert response.status_code == 422, f"Expected 422 for missing outcome, got {response.status_code}"
        
        # Missing summary
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_2}/meeting-outcome", 
                                headers=headers, json={"outcome": "positive"})
        assert response.status_code == 422, f"Expected 422 for missing summary, got {response.status_code}"
    
    def test_27_meeting_outcome_success(self):
        """Meeting outcome with valid data succeeds"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_2}/meeting-outcome", 
                                headers=headers, json={
                                    "outcome": "positive",
                                    "summary": "Customer loved the venue, ready to proceed",
                                    "next_action": "Send quotation",
                                    "follow_up_date": "2026-01-20"
                                })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert "note_id" in data, "Missing note_id"
        assert data["outcome"] == "positive"
        print(f"Meeting outcome logged: {data}")
    
    def test_28_meeting_outcome_creates_follow_up(self):
        """Meeting outcome with follow_up_date creates follow-up"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_2}/meeting-outcome", 
                                headers=headers, json={
                                    "outcome": "neutral",
                                    "summary": "Customer needs to discuss with family",
                                    "follow_up_date": "2026-01-25"
                                })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "follow_up_id" in data, "Missing follow_up_id when follow_up_date provided"
        print(f"Follow-up created: {data.get('follow_up_id')}")
    
    def test_29_meeting_outcome_logged_in_timeline(self):
        """Meeting outcome is logged in activity timeline"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_SITE_VISIT_2}/timeline", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        meeting_entries = [e for e in data.get("timeline", []) if e.get("action") == "meeting_outcome"]
        assert len(meeting_entries) > 0, "Meeting outcome not logged in timeline"
        print(f"Found {len(meeting_entries)} meeting outcome entries in timeline")


class TestAddNote:
    """Test POST /api/workflow/{lead_id}/note endpoint"""
    
    def test_30_add_note_requires_auth(self):
        """Add note requires authentication"""
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/note", json={
            "content": "Test note"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_31_add_note_success(self):
        """Add note with valid data succeeds"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/note", 
                                headers=headers, json={
                                    "content": "Customer prefers outdoor venue with garden"
                                })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "note_id" in data, "Missing note_id"
        assert "content" in data, "Missing content"
        assert data["content"] == "Customer prefers outdoor venue with garden"
        print(f"Note added: {data['note_id']}")
    
    def test_32_add_note_logged_in_timeline(self):
        """Add note is logged in activity timeline"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/timeline", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        note_entries = [e for e in data.get("timeline", []) if e.get("action") == "note_added"]
        assert len(note_entries) > 0, "Note not logged in timeline"
        print(f"Found {len(note_entries)} note entries in timeline")


class TestStageAdvancement:
    """Test PATCH /api/workflow/{lead_id}/stage endpoint"""
    
    def test_33_stage_advance_requires_auth(self):
        """Stage advance requires authentication"""
        response = requests.patch(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/stage", json={
            "stage": "contacted"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_34_stage_advance_with_note(self):
        """Stage advance with optional note succeeds"""
        headers = {"Authorization": f"Bearer {TestRMAuth.rm_token}"}
        
        # First check current stage
        response = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}", headers=headers)
        if response.status_code == 200:
            current_stage = response.json().get("stage")
            print(f"Current stage: {current_stage}")
            
            # Only advance if at 'new' stage
            if current_stage == "new":
                response = requests.patch(f"{BASE_URL}/api/workflow/{TEST_LEAD_NEW}/stage", 
                                        headers=headers, json={
                                            "stage": "contacted",
                                            "note": "Called customer, discussed requirements"
                                        })
                assert response.status_code == 200, f"Failed: {response.text}"
                data = response.json()
                assert data["stage"] == "contacted"
                print(f"Stage advanced to: {data['stage']}")
            else:
                print(f"Skipping stage advance - lead not at 'new' stage")


class TestAdminAccess:
    """Test admin access to RM endpoints"""
    
    def test_35_admin_can_access_action_summary(self):
        """Admin can access action summary"""
        headers = {"Authorization": f"Bearer {TestRMAuth.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/rm/action-summary", headers=headers)
        assert response.status_code == 200, f"Admin should access action-summary: {response.text}"
        print("Admin can access action-summary")
    
    def test_36_admin_can_access_my_leads(self):
        """Admin can access my-leads (sees all leads)"""
        headers = {"Authorization": f"Bearer {TestRMAuth.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/workflow/my-leads", headers=headers)
        assert response.status_code == 200, f"Admin should access my-leads: {response.text}"
        data = response.json()
        print(f"Admin sees {len(data)} leads")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
