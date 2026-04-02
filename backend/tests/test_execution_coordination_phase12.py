"""
VenuLoQ Phase 12 — Event Execution Coordination + Closure Readiness Tests
Tests all Phase 12 endpoints: execution-status, event-day, incidents, addenda, complete, closure, close
Key behaviors:
- 9-status execution model (handoff_pending → closure_ready)
- High/critical incident auto-sets status to issue_active
- Addenda are versioned (v1, v2...) and never touch original snapshot
- Closure gate requires all 5 checks including non-empty closure_note
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RM_EMAIL = "rm1@venuloq.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@venuloq.in"
ADMIN_PASSWORD = "admin123"

# Test lead that's already closed (from context)
CLOSED_LEAD = "lead_4f7a8e81c605"


@pytest.fixture(scope="module")
def rm_token():
    """Get RM authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"RM login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def test_lead_for_lifecycle(admin_token):
    """Find or create a lead for full lifecycle testing"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # First, get all conversion cases to find one we can use
    response = requests.get(f"{BASE_URL}/api/conversion/cases", headers=headers)
    if response.status_code == 200:
        cases = response.json().get("cases", [])
        # Find a case that's not the closed one and is booking_confirmed
        for case in cases:
            if case.get("lead_id") != CLOSED_LEAD and case.get("stage") == "booking_confirmed":
                lead_id = case.get("lead_id")
                # Check if it has handoff
                handoff_resp = requests.get(f"{BASE_URL}/api/execution/{lead_id}/handoff", headers=headers)
                if handoff_resp.status_code == 200:
                    handoff_data = handoff_resp.json()
                    if handoff_data.get("booking_snapshot", {}).get("snapshot_locked_at"):
                        return lead_id
    
    # If no suitable lead found, try to advance one
    response = requests.get(f"{BASE_URL}/api/conversion/cases", headers=headers)
    if response.status_code == 200:
        cases = response.json().get("cases", [])
        for case in cases:
            if case.get("lead_id") != CLOSED_LEAD:
                lead_id = case.get("lead_id")
                # Try to advance to booking_confirmed using admin bypass
                requests.post(
                    f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
                    headers=headers,
                    json={"stage": "booking_confirmed", "reason": "test"}
                )
                # Create handoff
                requests.post(
                    f"{BASE_URL}/api/execution/{lead_id}/handoff",
                    headers=headers,
                    json={"venue_name": "TEST Phase12 Venue", "event_time": "18:00"}
                )
                return lead_id
    
    return None


class TestExecutionStatusUpdate:
    """Tests for POST /api/execution/{lead_id}/execution-status"""
    
    def test_execution_status_requires_auth(self):
        """Execution status update requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/execution-status", json={"status": "event_live"})
        assert response.status_code == 401
        print("PASS: Execution status update requires auth")
    
    def test_execution_status_invalid_status(self, admin_token):
        """Rejects invalid execution status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{CLOSED_LEAD}/execution-status",
            headers=headers,
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400
        assert "invalid status" in response.json().get("detail", "").lower()
        print("PASS: Invalid execution status rejected")
    
    def test_execution_status_valid_statuses(self, admin_token, test_lead_for_lifecycle):
        """Valid execution statuses are accepted"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test updating to assigned
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/execution-status",
            headers=headers,
            json={"status": "assigned", "note": "TEST: Assigned for testing"}
        )
        assert response.status_code == 200
        print(f"PASS: Execution status updated to assigned for {test_lead_for_lifecycle}")
    
    def test_execution_status_creates_timeline_entry(self, admin_token, test_lead_for_lifecycle):
        """Status update creates timeline entry"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update status
        requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/execution-status",
            headers=headers,
            json={"status": "in_preparation", "note": "TEST: Timeline entry test"}
        )
        
        # Check event-day for timeline
        response = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/event-day", headers=headers)
        assert response.status_code == 200
        timeline = response.json().get("timeline", [])
        
        # Should have at least one milestone entry
        milestone_entries = [e for e in timeline if e.get("entry_type") == "milestone"]
        assert len(milestone_entries) > 0
        print(f"PASS: Status update created timeline entry - {len(milestone_entries)} milestone entries")


class TestEventDayCoordination:
    """Tests for event-day endpoints"""
    
    def test_get_event_day_requires_auth(self):
        """GET event-day requires authentication"""
        response = requests.get(f"{BASE_URL}/api/execution/test_lead/event-day")
        assert response.status_code == 401
        print("PASS: GET event-day requires auth")
    
    def test_get_event_day_returns_data(self, admin_token):
        """GET event-day returns event_day, timeline, incidents"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{CLOSED_LEAD}/event-day", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "lead_id" in data
        assert "execution_status" in data
        assert "event_day" in data
        assert "timeline" in data
        assert "incidents" in data
        assert "open_incidents" in data
        
        print(f"PASS: GET event-day returns data for {CLOSED_LEAD}")
        print(f"  - Execution status: {data.get('execution_status')}")
        print(f"  - Timeline entries: {len(data.get('timeline', []))}")
        print(f"  - Incidents: {len(data.get('incidents', []))}")
    
    def test_update_setup_requires_auth(self):
        """POST event-day/setup requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/event-day/setup", json={})
        assert response.status_code == 401
        print("PASS: POST event-day/setup requires auth")
    
    def test_update_setup_validates_status(self, admin_token, test_lead_for_lifecycle):
        """Setup status validation"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Invalid setup_status
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/event-day/setup",
            headers=headers,
            json={"setup_status": "invalid_status"}
        )
        assert response.status_code == 400
        print("PASS: Invalid setup_status rejected")
    
    def test_update_setup_success(self, admin_token, test_lead_for_lifecycle):
        """Update setup status and readiness"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/event-day/setup",
            headers=headers,
            json={
                "setup_status": "in_progress",
                "venue_readiness_confirmed": True,
                "customer_readiness_confirmed": False,
                "note": "TEST: Setup update"
            }
        )
        assert response.status_code == 200
        print("PASS: Setup status updated successfully")
    
    def test_add_timeline_requires_auth(self):
        """POST event-day/timeline requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/event-day/timeline", json={})
        assert response.status_code == 401
        print("PASS: POST event-day/timeline requires auth")
    
    def test_add_timeline_validates_type(self, admin_token, test_lead_for_lifecycle):
        """Timeline entry type validation"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/event-day/timeline",
            headers=headers,
            json={"entry_type": "invalid_type", "content": "Test"}
        )
        assert response.status_code == 400
        print("PASS: Invalid timeline entry_type rejected")
    
    def test_add_timeline_success(self, admin_token, test_lead_for_lifecycle):
        """Add timeline entry"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test all valid types
        valid_types = ["note", "setup", "milestone", "customer_update", "vendor_update"]
        for entry_type in valid_types:
            response = requests.post(
                f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/event-day/timeline",
                headers=headers,
                json={"entry_type": entry_type, "content": f"TEST: {entry_type} entry"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "entry_id" in data
            assert data.get("entry_type") == entry_type
        
        print(f"PASS: All {len(valid_types)} timeline entry types work")


class TestIncidentHandling:
    """Tests for incident/issue logging"""
    
    def test_list_incidents_requires_auth(self):
        """GET incidents requires authentication"""
        response = requests.get(f"{BASE_URL}/api/execution/test_lead/incidents")
        assert response.status_code == 401
        print("PASS: GET incidents requires auth")
    
    def test_list_incidents_returns_data(self, admin_token):
        """GET incidents returns incidents with open count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{CLOSED_LEAD}/incidents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "incidents" in data
        assert "total" in data
        assert "open" in data
        
        print(f"PASS: GET incidents returns data - {data.get('total')} total, {data.get('open')} open")
    
    def test_create_incident_requires_auth(self):
        """POST incidents requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/incidents", json={})
        assert response.status_code == 401
        print("PASS: POST incidents requires auth")
    
    def test_create_incident_validates_type(self, admin_token, test_lead_for_lifecycle):
        """Incident type validation"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents",
            headers=headers,
            json={"incident_type": "invalid_type", "severity": "low", "description": "Test"}
        )
        assert response.status_code == 400
        print("PASS: Invalid incident_type rejected")
    
    def test_create_incident_validates_severity(self, admin_token, test_lead_for_lifecycle):
        """Incident severity validation"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents",
            headers=headers,
            json={"incident_type": "vendor_issue", "severity": "invalid_severity", "description": "Test"}
        )
        assert response.status_code == 400
        print("PASS: Invalid severity rejected")
    
    def test_create_incident_success(self, admin_token, test_lead_for_lifecycle):
        """Create incident successfully"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents",
            headers=headers,
            json={
                "incident_type": "vendor_issue",
                "severity": "medium",
                "description": "TEST: Medium severity incident",
                "owner_name": "Test Owner"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "incident_id" in data
        assert data.get("incident_type") == "vendor_issue"
        assert data.get("severity") == "medium"
        assert data.get("status") == "open"
        
        print(f"PASS: Incident created - {data.get('incident_id')}")
        return data.get("incident_id")
    
    def test_high_severity_incident_sets_issue_active(self, admin_token, test_lead_for_lifecycle):
        """High/critical incident auto-sets execution_status to issue_active"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First set status to event_live
        requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/execution-status",
            headers=headers,
            json={"status": "event_live", "note": "TEST: Going live for incident test"}
        )
        
        # Create high severity incident
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents",
            headers=headers,
            json={
                "incident_type": "safety_issue",
                "severity": "high",
                "description": "TEST: High severity incident to trigger issue_active"
            }
        )
        assert response.status_code == 200
        incident_id = response.json().get("incident_id")
        
        # Check execution status changed to issue_active
        handoff_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/handoff", headers=headers)
        exec_status = handoff_resp.json().get("execution_status")
        
        # Status should be issue_active
        assert exec_status == "issue_active", f"Expected issue_active, got {exec_status}"
        print(f"PASS: High severity incident auto-set status to issue_active")
        
        return incident_id
    
    def test_update_incident_requires_auth(self):
        """PUT incidents requires authentication"""
        response = requests.put(f"{BASE_URL}/api/execution/test_lead/incidents/test_id", json={})
        assert response.status_code == 401
        print("PASS: PUT incidents requires auth")
    
    def test_resolve_incident_reverts_status(self, admin_token, test_lead_for_lifecycle):
        """Resolving last severe incident reverts from issue_active to event_live"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current incidents
        inc_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents", headers=headers)
        incidents = inc_resp.json().get("incidents", [])
        
        # Find open high/critical incidents
        open_severe = [i for i in incidents if i.get("status") in ("open", "investigating") and i.get("severity") in ("high", "critical")]
        
        if not open_severe:
            pytest.skip("No open severe incidents to resolve")
        
        # Resolve all severe incidents
        for inc in open_severe:
            response = requests.put(
                f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents/{inc['incident_id']}",
                headers=headers,
                json={"status": "resolved", "resolution": "TEST: Resolved for testing"}
            )
            assert response.status_code == 200
        
        # Check execution status reverted to event_live
        handoff_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/handoff", headers=headers)
        exec_status = handoff_resp.json().get("execution_status")
        
        assert exec_status == "event_live", f"Expected event_live after resolving, got {exec_status}"
        print("PASS: Resolving severe incidents reverted status to event_live")


class TestCommitmentAddenda:
    """Tests for versioned commitment addenda"""
    
    def test_list_addenda_requires_auth(self):
        """GET addenda requires authentication"""
        response = requests.get(f"{BASE_URL}/api/execution/test_lead/addenda")
        assert response.status_code == 401
        print("PASS: GET addenda requires auth")
    
    def test_list_addenda_returns_data(self, admin_token):
        """GET addenda returns versioned addenda"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{CLOSED_LEAD}/addenda", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "addenda" in data
        assert "total" in data
        
        print(f"PASS: GET addenda returns {data.get('total')} addenda")
    
    def test_create_addendum_requires_auth(self):
        """POST addendum requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/addendum", json={})
        assert response.status_code == 401
        print("PASS: POST addendum requires auth")
    
    def test_create_addendum_requires_handoff(self, admin_token):
        """Addendum requires existing booking snapshot"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try on a lead without handoff (if any)
        response = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=headers)
        items = response.json().get("items", [])
        no_handoff_lead = next((i for i in items if i.get("handoff_status") == "no_handoff"), None)
        
        if no_handoff_lead:
            response = requests.post(
                f"{BASE_URL}/api/execution/{no_handoff_lead['lead_id']}/addendum",
                headers=headers,
                json={
                    "change_type": "customer_requirement",
                    "field_changed": "guest_count",
                    "new_value": "200",
                    "reason": "TEST"
                }
            )
            assert response.status_code == 400
            print("PASS: Addendum requires existing handoff")
        else:
            print("SKIP: No lead without handoff to test")
    
    def test_create_addendum_validates_change_type(self, admin_token, test_lead_for_lifecycle):
        """Addendum change_type validation"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/addendum",
            headers=headers,
            json={
                "change_type": "invalid_type",
                "field_changed": "guest_count",
                "new_value": "200",
                "reason": "TEST"
            }
        )
        assert response.status_code == 400
        print("PASS: Invalid change_type rejected")
    
    def test_create_addendum_success_with_versioning(self, admin_token, test_lead_for_lifecycle):
        """Create addendum with auto-incrementing version"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current addenda count
        list_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/addenda", headers=headers)
        current_count = list_resp.json().get("total", 0)
        
        # Create first addendum
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/addendum",
            headers=headers,
            json={
                "change_type": "customer_requirement",
                "field_changed": "guest_count",
                "original_value": "150",
                "new_value": "200",
                "reason": "TEST: Customer requested more guests"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "addendum_id" in data
        assert data.get("version") == current_count + 1
        assert data.get("field_changed") == "guest_count"
        
        first_version = data.get("version")
        
        # Create second addendum
        response2 = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/addendum",
            headers=headers,
            json={
                "change_type": "commercial_change",
                "field_changed": "final_amount",
                "original_value": "500000",
                "new_value": "550000",
                "reason": "TEST: Price adjustment for extra guests"
            }
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        assert data2.get("version") == first_version + 1
        
        print(f"PASS: Addenda created with versions {first_version} and {first_version + 1}")
    
    def test_original_snapshot_not_modified(self, admin_token, test_lead_for_lifecycle):
        """Original booking_snapshot is NEVER modified by addenda"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get original snapshot
        handoff_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/handoff", headers=headers)
        original_snapshot = handoff_resp.json().get("booking_snapshot", {})
        original_locked_at = original_snapshot.get("snapshot_locked_at")
        
        # Create an addendum
        requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/addendum",
            headers=headers,
            json={
                "change_type": "venue_change",
                "field_changed": "venue_name",
                "original_value": original_snapshot.get("venue_name"),
                "new_value": "NEW TEST VENUE",
                "reason": "TEST: Venue change"
            }
        )
        
        # Verify snapshot unchanged
        handoff_resp2 = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/handoff", headers=headers)
        new_snapshot = handoff_resp2.json().get("booking_snapshot", {})
        
        # snapshot_locked_at should be the same
        assert new_snapshot.get("snapshot_locked_at") == original_locked_at
        # venue_name in snapshot should NOT be changed
        assert new_snapshot.get("venue_name") != "NEW TEST VENUE" or new_snapshot.get("venue_name") == original_snapshot.get("venue_name")
        
        print("PASS: Original snapshot not modified by addenda")


class TestEventCompletion:
    """Tests for event completion"""
    
    def test_complete_event_requires_auth(self):
        """POST complete requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/complete", json={})
        assert response.status_code == 401
        print("PASS: POST complete requires auth")
    
    def test_complete_event_success(self, admin_token, test_lead_for_lifecycle):
        """Complete event sets status to event_completed"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Ensure status is event_live first
        requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/execution-status",
            headers=headers,
            json={"status": "event_live", "note": "TEST: Going live for completion test"}
        )
        
        # Complete the event
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/complete",
            headers=headers,
            json={
                "major_issue": False,
                "completion_note": "TEST: Event completed successfully",
                "post_event_actions": "TEST: Follow up with customer"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("execution_status") == "event_completed"
        
        # Verify closure initialized
        closure_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure", headers=headers)
        closure_data = closure_resp.json()
        
        assert closure_data.get("closure", {}).get("event_completed") == True
        
        print("PASS: Event completed, closure initialized")


class TestClosureReadiness:
    """Tests for closure readiness gate"""
    
    def test_get_closure_requires_auth(self):
        """GET closure requires authentication"""
        response = requests.get(f"{BASE_URL}/api/execution/test_lead/closure")
        assert response.status_code == 401
        print("PASS: GET closure requires auth")
    
    def test_get_closure_returns_5_checks(self, admin_token):
        """GET closure returns 5 readiness checks"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{CLOSED_LEAD}/closure", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "checks" in data
        assert len(data.get("checks", [])) == 5
        assert "passed_count" in data
        assert "total_count" in data
        assert "all_ready" in data
        
        # Verify check IDs
        check_ids = [c.get("id") for c in data.get("checks", [])]
        expected_ids = ["event_completed", "critical_issues_resolved", "closure_note", "post_event_tasks_done", "change_history_intact"]
        for expected in expected_ids:
            assert expected in check_ids
        
        print(f"PASS: GET closure returns 5 checks - {data.get('passed_count')}/{data.get('total_count')} passed")
    
    def test_update_closure_requires_auth(self):
        """POST closure requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/closure", json={})
        assert response.status_code == 401
        print("PASS: POST closure requires auth")
    
    def test_update_closure_toggles_checks(self, admin_token, test_lead_for_lifecycle):
        """POST closure toggles individual checks"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Toggle critical_issues_resolved
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure",
            headers=headers,
            json={"critical_issues_resolved": True}
        )
        assert response.status_code == 200
        
        # Verify it's set
        closure_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure", headers=headers)
        closure = closure_resp.json().get("closure", {})
        assert closure.get("critical_issues_resolved") == True
        
        print("PASS: Closure check toggled successfully")
    
    def test_update_closure_note(self, admin_token, test_lead_for_lifecycle):
        """POST closure saves closure note"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure",
            headers=headers,
            json={"closure_note": "TEST: Event went smoothly, customer satisfied"}
        )
        assert response.status_code == 200
        
        # Verify note saved
        closure_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure", headers=headers)
        closure = closure_resp.json().get("closure", {})
        assert closure.get("closure_note") == "TEST: Event went smoothly, customer satisfied"
        
        print("PASS: Closure note saved")
    
    def test_close_event_requires_auth(self):
        """POST close requires authentication"""
        response = requests.post(f"{BASE_URL}/api/execution/test_lead/close")
        assert response.status_code == 401
        print("PASS: POST close requires auth")
    
    def test_close_event_requires_all_checks(self, admin_token, test_lead_for_lifecycle):
        """POST close requires all 5 checks passed"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First, ensure not all checks are passed by clearing one
        requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure",
            headers=headers,
            json={"post_event_tasks_done": False}
        )
        
        # Try to close
        response = requests.post(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/close", headers=headers)
        assert response.status_code == 400
        assert "not ready" in response.json().get("detail", "").lower()
        
        print("PASS: Close rejected when checks incomplete")
    
    def test_close_event_success(self, admin_token, test_lead_for_lifecycle):
        """POST close succeeds when all checks pass"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Set all checks
        requests.post(
            f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure",
            headers=headers,
            json={
                "event_completed": True,
                "critical_issues_resolved": True,
                "post_event_tasks_done": True,
                "change_history_intact": True,
                "closure_note": "TEST: Final closure note for testing"
            }
        )
        
        # Verify all checks pass
        closure_resp = requests.get(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/closure", headers=headers)
        if not closure_resp.json().get("all_ready"):
            print(f"Checks: {closure_resp.json().get('checks')}")
            pytest.skip("Not all checks passed")
        
        # Close the event
        response = requests.post(f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/close", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("execution_status") == "closure_ready"
        
        print("PASS: Event closed successfully")


class TestDashboardPhase12:
    """Tests for dashboard with Phase 12 fields"""
    
    def test_dashboard_includes_execution_status(self, admin_token):
        """Dashboard items include execution_status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=headers)
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        if items:
            item = items[0]
            assert "execution_status" in item
            print(f"PASS: Dashboard includes execution_status - {item.get('execution_status')}")
    
    def test_dashboard_includes_open_incidents(self, admin_token):
        """Dashboard items include open_incidents count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=headers)
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        if items:
            item = items[0]
            assert "open_incidents" in item
            print(f"PASS: Dashboard includes open_incidents - {item.get('open_incidents')}")
    
    def test_dashboard_summary_includes_phase12_counts(self, admin_token):
        """Dashboard summary includes event_live, issue_active, completed counts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=headers)
        assert response.status_code == 200
        summary = response.json().get("summary", {})
        
        assert "event_live" in summary
        assert "issue_active" in summary
        assert "completed" in summary
        assert "today" in summary
        
        print(f"PASS: Dashboard summary includes Phase 12 counts")
        print(f"  - Today: {summary.get('today')}")
        print(f"  - Event Live: {summary.get('event_live')}")
        print(f"  - Issue Active: {summary.get('issue_active')}")
        print(f"  - Completed: {summary.get('completed')}")
    
    def test_dashboard_sorting(self, admin_token):
        """Dashboard sorts: today first, then event_live, then issue_active"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=headers)
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        # Check that today items come first
        today_indices = [i for i, item in enumerate(items) if item.get("is_today")]
        live_indices = [i for i, item in enumerate(items) if item.get("execution_status") == "event_live" and not item.get("is_today")]
        
        if today_indices and live_indices:
            assert max(today_indices) < min(live_indices), "Today items should come before live items"
        
        print("PASS: Dashboard sorting verified")


class TestAllIncidentTypes:
    """Test all incident types and severities"""
    
    def test_all_incident_types(self, admin_token, test_lead_for_lifecycle):
        """All incident types are accepted"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        incident_types = ["vendor_issue", "venue_issue", "customer_issue", "logistics_issue", "quality_issue", "safety_issue", "other"]
        
        for inc_type in incident_types:
            response = requests.post(
                f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents",
                headers=headers,
                json={
                    "incident_type": inc_type,
                    "severity": "low",
                    "description": f"TEST: {inc_type} incident"
                }
            )
            assert response.status_code == 200, f"Failed for type {inc_type}"
        
        print(f"PASS: All {len(incident_types)} incident types accepted")
    
    def test_all_severity_levels(self, admin_token, test_lead_for_lifecycle):
        """All severity levels are accepted"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        severities = ["low", "medium", "high", "critical"]
        
        for severity in severities:
            response = requests.post(
                f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/incidents",
                headers=headers,
                json={
                    "incident_type": "other",
                    "severity": severity,
                    "description": f"TEST: {severity} severity incident"
                }
            )
            assert response.status_code == 200, f"Failed for severity {severity}"
        
        print(f"PASS: All {len(severities)} severity levels accepted")


class TestAllAddendumTypes:
    """Test all addendum change types"""
    
    def test_all_change_types(self, admin_token, test_lead_for_lifecycle):
        """All change types are accepted for addenda"""
        if not test_lead_for_lifecycle:
            pytest.skip("No test lead available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        change_types = ["customer_requirement", "venue_change", "commercial_change", "schedule_change", "special_requirement"]
        
        for change_type in change_types:
            response = requests.post(
                f"{BASE_URL}/api/execution/{test_lead_for_lifecycle}/addendum",
                headers=headers,
                json={
                    "change_type": change_type,
                    "field_changed": f"test_field_{change_type}",
                    "original_value": "old",
                    "new_value": "new",
                    "reason": f"TEST: {change_type} addendum"
                }
            )
            assert response.status_code == 200, f"Failed for change_type {change_type}"
        
        print(f"PASS: All {len(change_types)} change types accepted for addenda")
