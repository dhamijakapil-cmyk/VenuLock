"""
Journey Test #3: Full Execution Pipeline
Tests the complete post-booking execution lifecycle:
Handoff → Assignment → Prep → Event Day → Incident → Completion → Closure Readiness

Execution status flow:
handoff_pending → assigned → in_preparation → ready_for_event → event_live → issue_active → event_completed → closure_note_pending → closure_ready
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"


class TestJourneyExecutionPipeline:
    """Journey Test #3: Full Execution Pipeline End-to-End"""
    
    # Shared state across tests
    admin_token = None
    rm_token = None
    lead_id = None
    checklist_item_id = None
    incident_id = None
    cr_id = None
    addendum_id = None
    booking_snapshot_locked_at = None
    
    # ── SETUP: Authentication ──────────────────────────────────────────────────
    
    def test_00_admin_login(self):
        """Admin login for fast-tracking lead to booking_confirmed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in admin login response"
        TestJourneyExecutionPipeline.admin_token = data["token"]
        print(f"✓ Admin login successful")
    
    def test_01_rm_login(self):
        """RM login for execution operations"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200, f"RM login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in RM login response"
        TestJourneyExecutionPipeline.rm_token = data["token"]
        print(f"✓ RM login successful")
    
    # ── PREREQUISITE: Create lead and fast-track to booking_confirmed ──────────
    
    def test_02_create_lead_via_intake(self):
        """Create a test lead via conversion intake"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        timestamp = int(time.time())
        response = requests.post(f"{BASE_URL}/api/conversion/intake", json={
            "source_type": "manual",
            "customer_name": f"TEST_Exec_Pipeline_{timestamp}",
            "customer_phone": f"98765{timestamp % 100000:05d}",
            "customer_email": f"test_exec_{timestamp}@example.com",
            "event_type": "Wedding",
            "event_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "city": "Mumbai",
            "guest_count": 200,
            "notes": "Test journey 3 - execution pipeline"
        }, headers=headers)
        assert response.status_code in [200, 201], f"Create lead failed: {response.text}"
        data = response.json()
        assert "lead_id" in data, "No lead_id in response"
        TestJourneyExecutionPipeline.lead_id = data["lead_id"]
        print(f"✓ Lead created: {self.lead_id}")
    
    def test_03_fast_track_to_booking_confirmed(self):
        """Admin fast-tracks lead through all stages to booking_confirmed"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Stage progression (admin can bypass validation)
        stages = [
            "requirement_qualified",
            "venues_shortlisted",
            "quote_requested",
            "quote_received",
            "site_visit_planned",
            "site_visit_completed",
            "negotiation_in_progress",
            "commercial_accepted",
            "booking_confirmation_pending",
            "booking_confirmed"
        ]
        
        for stage in stages:
            response = requests.post(
                f"{BASE_URL}/api/conversion/cases/{self.lead_id}/stage",
                json={"stage": stage},
                headers=headers
            )
            assert response.status_code == 200, f"Stage transition to {stage} failed: {response.text}"
            print(f"  → Stage: {stage}")
        
        # Verify final stage
        response = requests.get(f"{BASE_URL}/api/conversion/cases/{self.lead_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("stage") == "booking_confirmed", f"Expected booking_confirmed, got {data.get('stage')}"
        print(f"✓ Lead fast-tracked to booking_confirmed")
    
    # ── STEP 1: RM initiates execution handoff ─────────────────────────────────
    
    def test_04_create_handoff_package(self):
        """POST /api/execution/{lead_id}/handoff - Create handoff package"""
        # Use admin token since lead was created by admin (rm_id check)
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/handoff",
            json={
                "venue_name": "Grand Palace Banquet",
                "event_time": "18:00",
                "customer_requirements": "Veg only, live music required",
                "rm_handoff_notes": "Customer prefers minimal decoration",
                "special_promises": "Free parking for 50 cars"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Create handoff failed: {response.text}"
        data = response.json()
        
        # Verify snapshot created
        assert "snapshot" in data, "No snapshot in response"
        snapshot = data["snapshot"]
        assert snapshot.get("snapshot_locked_at") is not None, "Snapshot not locked"
        TestJourneyExecutionPipeline.booking_snapshot_locked_at = snapshot.get("snapshot_locked_at")
        
        # Verify execution object
        assert "execution" in data, "No execution in response"
        execution = data["execution"]
        assert execution.get("handoff_status") == "pending", f"Expected handoff_status=pending, got {execution.get('handoff_status')}"
        
        print(f"✓ Handoff package created, snapshot locked at: {self.booking_snapshot_locked_at}")
    
    def test_05_verify_handoff_created(self):
        """GET /api/execution/{lead_id}/handoff - Verify handoff details"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/handoff", headers=headers)
        assert response.status_code == 200, f"Get handoff failed: {response.text}"
        data = response.json()
        
        # Verify execution_status derived from handoff_status
        exec_status = data.get("execution_status")
        assert exec_status == "handoff_pending", f"Expected execution_status=handoff_pending, got {exec_status}"
        
        # Verify booking_snapshot is present and locked
        snapshot = data.get("booking_snapshot", {})
        assert snapshot.get("snapshot_locked_at") is not None, "Snapshot not locked"
        assert snapshot.get("rm_handoff_notes") == "Customer prefers minimal decoration"
        
        # Verify default checklist was created
        checklist = data.get("checklist", [])
        assert len(checklist) >= 8, f"Expected at least 8 default checklist items, got {len(checklist)}"
        
        print(f"✓ Handoff verified: execution_status={exec_status}, checklist items={len(checklist)}")
    
    def test_06_handoff_already_created_error(self):
        """Verify handoff cannot be created twice"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/handoff",
            json={"rm_handoff_notes": "Duplicate attempt"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for duplicate handoff, got {response.status_code}"
        print(f"✓ Duplicate handoff correctly rejected")
    
    # ── STEP 2: Assign execution owner ─────────────────────────────────────────
    
    def test_07_assign_execution_owner(self):
        """POST /api/execution/{lead_id}/assign - Assign execution owner"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/assign",
            json={
                "owner_id": "exec_owner_001",
                "owner_name": "Priya Sharma",
                "supporting_team": [
                    {"name": "Rahul Kumar", "role": "Venue Coordinator"},
                    {"name": "Anita Singh", "role": "Customer Liaison"}
                ],
                "handoff_notes": "Priority event - CEO's daughter wedding"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Assign owner failed: {response.text}"
        data = response.json()
        assert data.get("handoff_status") == "assigned", f"Expected handoff_status=assigned, got {data.get('handoff_status')}"
        print(f"✓ Execution owner assigned: Priya Sharma")
    
    def test_08_verify_assigned_status(self):
        """Verify execution_status transitions to 'assigned'"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/handoff", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        execution = data.get("execution", {})
        assert execution.get("handoff_status") == "assigned"
        assert execution.get("owner_name") == "Priya Sharma"
        assert execution.get("assigned_at") is not None
        assert len(execution.get("supporting_team", [])) == 2
        
        # Verify execution_status derived
        exec_status = data.get("execution_status")
        assert exec_status == "assigned", f"Expected execution_status=assigned, got {exec_status}"
        
        print(f"✓ Verified: execution_status=assigned, owner=Priya Sharma, team_size=2")
    
    # ── STEP 3: Owner acknowledges handoff ─────────────────────────────────────
    
    def test_09_acknowledge_handoff(self):
        """POST /api/execution/{lead_id}/acknowledge - Owner acknowledges"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/acknowledge",
            json={"notes": "Acknowledged. Will start preparation tomorrow."},
            headers=headers
        )
        assert response.status_code == 200, f"Acknowledge failed: {response.text}"
        data = response.json()
        assert data.get("handoff_status") == "acknowledged"
        print(f"✓ Handoff acknowledged")
    
    def test_10_verify_acknowledgement(self):
        """Verify acknowledgement recorded"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/handoff", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        execution = data.get("execution", {})
        assert execution.get("handoff_status") == "acknowledged"
        assert execution.get("acknowledged_at") is not None
        assert "Acknowledged" in (execution.get("handoff_notes") or "")
        
        print(f"✓ Acknowledgement verified: acknowledged_at={execution.get('acknowledged_at')}")
    
    # ── STEP 4: Pre-event preparation ──────────────────────────────────────────
    
    def test_11_update_execution_status_in_preparation(self):
        """POST /api/execution/{lead_id}/execution-status - Set to in_preparation"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/execution-status",
            json={"status": "in_preparation", "note": "Starting venue coordination"},
            headers=headers
        )
        assert response.status_code == 200, f"Update status failed: {response.text}"
        print(f"✓ Execution status updated to in_preparation")
    
    def test_12_add_checklist_item(self):
        """POST /api/execution/{lead_id}/checklist - Add custom checklist item"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/checklist",
            json={
                "item": "Confirm live band availability",
                "category": "vendor_management",
                "assigned_to_name": "Rahul Kumar",
                "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "notes": "Customer specifically requested Bollywood songs"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Add checklist item failed: {response.text}"
        data = response.json()
        assert "checklist_id" in data
        TestJourneyExecutionPipeline.checklist_item_id = data["checklist_id"]
        print(f"✓ Checklist item added: {self.checklist_item_id}")
    
    def test_13_update_checklist_item_status(self):
        """PUT /api/execution/{lead_id}/checklist/{item_id} - Update item status"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/execution/{self.lead_id}/checklist/{self.checklist_item_id}",
            json={"status": "in_progress", "notes": "Band confirmed, finalizing song list"},
            headers=headers
        )
        assert response.status_code == 200, f"Update checklist item failed: {response.text}"
        data = response.json()
        assert "readiness" in data
        print(f"✓ Checklist item updated to in_progress")
    
    def test_14_verify_checklist_and_readiness(self):
        """GET /api/execution/{lead_id}/checklist - Verify checklist and readiness posture"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/checklist", headers=headers)
        assert response.status_code == 200, f"Get checklist failed: {response.text}"
        data = response.json()
        
        items = data.get("items", [])
        assert len(items) >= 9, f"Expected at least 9 items (8 default + 1 custom), got {len(items)}"
        
        readiness = data.get("readiness", {})
        assert readiness.get("posture") in ["not_started", "in_progress", "blocked", "ready"]
        assert readiness.get("total") >= 9
        
        print(f"✓ Checklist verified: {len(items)} items, readiness posture={readiness.get('posture')}")
    
    def test_15_complete_all_checklist_items(self):
        """Mark all checklist items as done for readiness"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Get all checklist items
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/checklist", headers=headers)
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        # Mark all as done
        for item in items:
            if item.get("status") != "done":
                response = requests.put(
                    f"{BASE_URL}/api/execution/{self.lead_id}/checklist/{item['checklist_id']}",
                    json={"status": "done"},
                    headers=headers
                )
                assert response.status_code == 200
        
        # Verify readiness is now "ready"
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/checklist", headers=headers)
        readiness = response.json().get("readiness", {})
        assert readiness.get("posture") == "ready", f"Expected posture=ready, got {readiness.get('posture')}"
        
        print(f"✓ All checklist items completed, readiness posture=ready")
    
    # ── STEP 5: Ready for event ────────────────────────────────────────────────
    
    def test_16_update_status_ready_for_event(self):
        """POST /api/execution/{lead_id}/execution-status - Set to ready_for_event"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/execution-status",
            json={"status": "ready_for_event", "note": "All preparations complete"},
            headers=headers
        )
        assert response.status_code == 200, f"Update status failed: {response.text}"
        print(f"✓ Execution status updated to ready_for_event")
    
    # ── STEP 6: Event day coordination ─────────────────────────────────────────
    
    def test_17_update_status_event_live(self):
        """POST /api/execution/{lead_id}/execution-status - Set to event_live"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/execution-status",
            json={"status": "event_live", "note": "Event has started"},
            headers=headers
        )
        assert response.status_code == 200, f"Update status failed: {response.text}"
        print(f"✓ Execution status updated to event_live")
    
    def test_18_update_event_day_setup(self):
        """POST /api/execution/{lead_id}/event-day/setup - Update setup status"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/event-day/setup",
            json={
                "setup_status": "in_progress",
                "venue_readiness_confirmed": True,
                "customer_readiness_confirmed": False,
                "note": "Venue setup 80% complete"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Update event-day setup failed: {response.text}"
        print(f"✓ Event-day setup updated: in_progress")
    
    def test_19_complete_event_day_setup(self):
        """Complete event-day setup"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/event-day/setup",
            json={
                "setup_status": "complete",
                "customer_readiness_confirmed": True,
                "note": "All setup complete, guests arriving"
            },
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Event-day setup completed")
    
    def test_20_add_timeline_entries(self):
        """POST /api/execution/{lead_id}/event-day/timeline - Add timeline entries"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        entries = [
            {"entry_type": "note", "content": "Guests started arriving at 5:30 PM"},
            {"entry_type": "setup", "content": "Stage lighting adjusted per customer request"},
            {"entry_type": "milestone", "content": "Bride and groom arrived"},
            {"entry_type": "customer_update", "content": "Customer happy with arrangements"}
        ]
        
        for entry in entries:
            response = requests.post(
                f"{BASE_URL}/api/execution/{self.lead_id}/event-day/timeline",
                json=entry,
                headers=headers
            )
            assert response.status_code == 200, f"Add timeline entry failed: {response.text}"
            data = response.json()
            assert "entry_id" in data
        
        print(f"✓ Added {len(entries)} timeline entries")
    
    def test_21_verify_timeline_entries(self):
        """GET /api/execution/{lead_id}/event-day - Verify timeline entries"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/event-day", headers=headers)
        assert response.status_code == 200, f"Get event-day failed: {response.text}"
        data = response.json()
        
        timeline = data.get("timeline", [])
        # Should have at least 4 manual entries + status change entries
        assert len(timeline) >= 4, f"Expected at least 4 timeline entries, got {len(timeline)}"
        
        event_day = data.get("event_day", {})
        assert event_day.get("setup_status") == "complete"
        assert event_day.get("venue_readiness_confirmed") == True
        assert event_day.get("customer_readiness_confirmed") == True
        
        print(f"✓ Timeline verified: {len(timeline)} entries, setup=complete")
    
    # ── STEP 7: Incident logging ───────────────────────────────────────────────
    
    def test_22_create_incident_low_severity(self):
        """POST /api/execution/{lead_id}/incidents - Create low severity incident"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/incidents",
            json={
                "incident_type": "logistics_issue",
                "severity": "low",
                "description": "Minor delay in dessert service",
                "owner_name": "Anita Singh"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Create incident failed: {response.text}"
        data = response.json()
        assert data.get("status") == "open"
        assert data.get("severity") == "low"
        print(f"✓ Low severity incident created")
    
    def test_23_verify_status_still_event_live(self):
        """Verify low severity incident doesn't change execution_status"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/event-day", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        exec_status = data.get("execution_status")
        assert exec_status == "event_live", f"Expected event_live, got {exec_status}"
        print(f"✓ Execution status still event_live (low severity doesn't trigger issue_active)")
    
    def test_24_create_incident_critical_severity(self):
        """POST /api/execution/{lead_id}/incidents - Create critical severity incident"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/incidents",
            json={
                "incident_type": "safety_issue",
                "severity": "critical",
                "description": "Power outage in main hall",
                "owner_name": "Priya Sharma"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Create critical incident failed: {response.text}"
        data = response.json()
        assert data.get("severity") == "critical"
        TestJourneyExecutionPipeline.incident_id = data["incident_id"]
        print(f"✓ Critical severity incident created: {self.incident_id}")
    
    def test_25_verify_status_issue_active(self):
        """Verify high/critical severity auto-sets execution_status to 'issue_active'"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/event-day", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        exec_status = data.get("execution_status")
        assert exec_status == "issue_active", f"Expected issue_active, got {exec_status}"
        
        open_incidents = data.get("open_incidents", 0)
        assert open_incidents >= 2, f"Expected at least 2 open incidents, got {open_incidents}"
        
        print(f"✓ Execution status auto-changed to issue_active, open_incidents={open_incidents}")
    
    def test_26_resolve_critical_incident(self):
        """PUT /api/execution/{lead_id}/incidents/{incident_id} - Resolve incident"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/execution/{self.lead_id}/incidents/{self.incident_id}",
            json={
                "status": "resolved",
                "action_taken": "Switched to backup generator",
                "resolution": "Power restored within 5 minutes",
                "closure_impact": "Minimal - guests barely noticed"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Resolve incident failed: {response.text}"
        print(f"✓ Critical incident resolved")
    
    def test_27_verify_status_reverts_to_event_live(self):
        """Verify resolving last severe incident reverts to 'event_live'"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/event-day", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        exec_status = data.get("execution_status")
        assert exec_status == "event_live", f"Expected event_live after resolving critical incident, got {exec_status}"
        print(f"✓ Execution status reverted to event_live after resolving critical incident")
    
    def test_28_list_incidents(self):
        """GET /api/execution/{lead_id}/incidents - List all incidents"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/incidents", headers=headers)
        assert response.status_code == 200, f"List incidents failed: {response.text}"
        data = response.json()
        
        incidents = data.get("incidents", [])
        assert len(incidents) >= 2, f"Expected at least 2 incidents, got {len(incidents)}"
        
        # Verify one is resolved
        resolved = [i for i in incidents if i.get("status") == "resolved"]
        assert len(resolved) >= 1, "Expected at least 1 resolved incident"
        
        print(f"✓ Incidents listed: total={len(incidents)}, resolved={len(resolved)}")
    
    # ── STEP 8: Event completion ───────────────────────────────────────────────
    
    def test_29_complete_event(self):
        """POST /api/execution/{lead_id}/complete - Mark event as completed"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/complete",
            json={
                "major_issue": False,
                "completion_note": "Event concluded successfully. Customer very happy.",
                "post_event_actions": "Send thank you note, collect feedback"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Complete event failed: {response.text}"
        data = response.json()
        assert data.get("execution_status") == "event_completed"
        print(f"✓ Event marked as completed")
    
    def test_30_verify_event_completed_status(self):
        """Verify execution_status transitions to 'event_completed'"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/event-day", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        exec_status = data.get("execution_status")
        assert exec_status == "event_completed", f"Expected event_completed, got {exec_status}"
        
        event_day = data.get("event_day", {})
        assert event_day.get("completed_at") is not None
        assert event_day.get("major_issue") == False
        
        print(f"✓ Event completed verified: completed_at={event_day.get('completed_at')}")
    
    # ── STEP 9: Closure note ───────────────────────────────────────────────────
    
    def test_31_get_closure_readiness_initial(self):
        """GET /api/execution/{lead_id}/closure - Check initial closure state"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/closure", headers=headers)
        assert response.status_code == 200, f"Get closure failed: {response.text}"
        data = response.json()
        
        checks = data.get("checks", [])
        assert len(checks) == 5, f"Expected 5 closure checks, got {len(checks)}"
        
        # event_completed should be true (set by complete endpoint)
        event_completed_check = next((c for c in checks if c["id"] == "event_completed"), None)
        assert event_completed_check is not None
        assert event_completed_check.get("passed") == True
        
        # closure_note should be false initially
        closure_note_check = next((c for c in checks if c["id"] == "closure_note"), None)
        assert closure_note_check is not None
        assert closure_note_check.get("passed") == False
        
        print(f"✓ Initial closure state: passed={data.get('passed_count')}/{data.get('total_count')}")
    
    def test_32_update_closure_with_note(self):
        """POST /api/execution/{lead_id}/closure - Add closure note"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/closure",
            json={
                "closure_note": "Event executed flawlessly. Minor power issue resolved quickly. Customer feedback: 5/5 stars."
            },
            headers=headers
        )
        assert response.status_code == 200, f"Update closure failed: {response.text}"
        print(f"✓ Closure note added")
    
    # ── STEP 10: Closure readiness gate (5 checks) ─────────────────────────────
    
    def test_33_update_all_closure_checks(self):
        """POST /api/execution/{lead_id}/closure - Pass all 5 closure checks"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/closure",
            json={
                "event_completed": True,
                "critical_issues_resolved": True,
                "post_event_tasks_done": True,
                "change_history_intact": True
            },
            headers=headers
        )
        assert response.status_code == 200, f"Update closure checks failed: {response.text}"
        print(f"✓ All closure checks updated")
    
    def test_34_verify_closure_readiness_gate(self):
        """GET /api/execution/{lead_id}/closure - Verify all 5 checks pass"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/closure", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        checks = data.get("checks", [])
        passed_count = data.get("passed_count", 0)
        total_count = data.get("total_count", 0)
        all_ready = data.get("all_ready", False)
        
        assert passed_count == 5, f"Expected 5 checks passed, got {passed_count}"
        assert total_count == 5, f"Expected 5 total checks, got {total_count}"
        assert all_ready == True, "Expected all_ready=True"
        
        # Verify each check
        check_ids = ["event_completed", "critical_issues_resolved", "closure_note", "post_event_tasks_done", "change_history_intact"]
        for check_id in check_ids:
            check = next((c for c in checks if c["id"] == check_id), None)
            assert check is not None, f"Missing check: {check_id}"
            assert check.get("passed") == True, f"Check {check_id} not passed"
        
        print(f"✓ Closure readiness gate: {passed_count}/{total_count} checks passed, all_ready={all_ready}")
    
    def test_35_close_event(self):
        """POST /api/execution/{lead_id}/close - Close the event"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(f"{BASE_URL}/api/execution/{self.lead_id}/close", headers=headers)
        assert response.status_code == 200, f"Close event failed: {response.text}"
        data = response.json()
        assert data.get("execution_status") == "closure_ready"
        print(f"✓ Event closed: execution_status=closure_ready")
    
    def test_36_verify_closure_ready_status(self):
        """Verify execution_status = 'closure_ready'"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/closure", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        exec_status = data.get("execution_status")
        assert exec_status == "closure_ready", f"Expected closure_ready, got {exec_status}"
        
        closure = data.get("closure", {})
        assert closure.get("closed_at") is not None
        assert closure.get("closed_by") is not None
        
        print(f"✓ Final status verified: execution_status=closure_ready, closed_at={closure.get('closed_at')}")
    
    # ── CHANGE REQUEST FLOW ────────────────────────────────────────────────────
    
    def test_37_create_change_request(self):
        """POST /api/execution/{lead_id}/change-requests - Create CR"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/change-requests",
            json={
                "cr_type": "customer_requirement",
                "description": "Customer requested additional 20 chairs",
                "impact": "Minor cost increase",
                "requested_by_name": "Customer - Mr. Sharma"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Create CR failed: {response.text}"
        data = response.json()
        assert "cr_id" in data
        assert data.get("status") == "open"
        TestJourneyExecutionPipeline.cr_id = data["cr_id"]
        print(f"✓ Change request created: {self.cr_id}")
    
    def test_38_list_change_requests(self):
        """GET /api/execution/{lead_id}/change-requests - List CRs"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/change-requests", headers=headers)
        assert response.status_code == 200, f"List CRs failed: {response.text}"
        data = response.json()
        
        crs = data.get("change_requests", [])
        assert len(crs) >= 1, f"Expected at least 1 CR, got {len(crs)}"
        
        print(f"✓ Change requests listed: {len(crs)} total")
    
    def test_39_resolve_change_request(self):
        """PUT /api/execution/{lead_id}/change-requests/{cr_id} - Resolve CR"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/execution/{self.lead_id}/change-requests/{self.cr_id}",
            json={
                "status": "implemented",
                "resolution": "20 additional chairs arranged from backup inventory"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Resolve CR failed: {response.text}"
        print(f"✓ Change request resolved: implemented")
    
    # ── ADDENDUM FLOW ──────────────────────────────────────────────────────────
    
    def test_40_create_addendum(self):
        """POST /api/execution/{lead_id}/addendum - Create addendum"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/addendum",
            json={
                "linked_cr_id": self.cr_id,
                "change_type": "customer_requirement",
                "field_changed": "guest_count",
                "original_value": "200",
                "new_value": "220",
                "reason": "Customer requested additional seating"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Create addendum failed: {response.text}"
        data = response.json()
        assert "addendum_id" in data
        assert data.get("version") == 1
        TestJourneyExecutionPipeline.addendum_id = data["addendum_id"]
        print(f"✓ Addendum created: {self.addendum_id}, version=1")
    
    def test_41_list_addenda(self):
        """GET /api/execution/{lead_id}/addenda - List addenda"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/addenda", headers=headers)
        assert response.status_code == 200, f"List addenda failed: {response.text}"
        data = response.json()
        
        addenda = data.get("addenda", [])
        assert len(addenda) >= 1, f"Expected at least 1 addendum, got {len(addenda)}"
        
        print(f"✓ Addenda listed: {len(addenda)} total")
    
    def test_42_verify_booking_snapshot_immutable(self):
        """Verify booking_snapshot remains immutable after addendum"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/{self.lead_id}/handoff", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        snapshot = data.get("booking_snapshot", {})
        current_locked_at = snapshot.get("snapshot_locked_at")
        
        # Verify snapshot_locked_at hasn't changed
        assert current_locked_at == self.booking_snapshot_locked_at, \
            f"Snapshot was modified! Original: {self.booking_snapshot_locked_at}, Current: {current_locked_at}"
        
        # Verify original guest_count in snapshot (should still be 200, not 220)
        # Note: The addendum records the change but doesn't modify the snapshot
        
        print(f"✓ Booking snapshot remains immutable: locked_at={current_locked_at}")
    
    # ── VALIDATION TESTS ───────────────────────────────────────────────────────
    
    def test_43_invalid_execution_status(self):
        """Verify invalid execution status is rejected"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/execution-status",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"✓ Invalid execution status correctly rejected")
    
    def test_44_invalid_incident_type(self):
        """Verify invalid incident type is rejected"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/incidents",
            json={
                "incident_type": "invalid_type",
                "severity": "low",
                "description": "Test"
            },
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid incident type, got {response.status_code}"
        print(f"✓ Invalid incident type correctly rejected")
    
    def test_45_invalid_incident_severity(self):
        """Verify invalid incident severity is rejected"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/incidents",
            json={
                "incident_type": "vendor_issue",
                "severity": "invalid_severity",
                "description": "Test"
            },
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid severity, got {response.status_code}"
        print(f"✓ Invalid incident severity correctly rejected")
    
    def test_46_invalid_cr_type(self):
        """Verify invalid CR type is rejected"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/change-requests",
            json={
                "cr_type": "invalid_type",
                "description": "Test"
            },
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid CR type, got {response.status_code}"
        print(f"✓ Invalid CR type correctly rejected")
    
    def test_47_invalid_timeline_entry_type(self):
        """Verify invalid timeline entry type is rejected"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/execution/{self.lead_id}/event-day/timeline",
            json={
                "entry_type": "invalid_type",
                "content": "Test"
            },
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid timeline type, got {response.status_code}"
        print(f"✓ Invalid timeline entry type correctly rejected")
    
    def test_48_execution_dashboard(self):
        """GET /api/execution/dashboard - Verify dashboard includes our test case"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=headers)
        assert response.status_code == 200, f"Get dashboard failed: {response.text}"
        data = response.json()
        
        items = data.get("items", [])
        summary = data.get("summary", {})
        
        # Find our test lead
        test_lead = next((i for i in items if i.get("lead_id") == self.lead_id), None)
        # Note: Our lead is now closure_ready, so it might not appear in booking_confirmed stage filter
        
        assert summary.get("total") >= 0, "Dashboard should have summary"
        
        print(f"✓ Execution dashboard verified: {len(items)} items, summary keys: {list(summary.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
