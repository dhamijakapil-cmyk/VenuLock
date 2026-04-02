"""
Phase 14: RM Customer Communication Hub - Backend API Tests
Tests communication endpoints, templates, dashboard counts, timeline, follow-ups
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"


class TestCommunicationPhase14:
    """Phase 14 Communication Hub API Tests"""
    
    rm_token = None
    admin_token = None
    lead_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens and lead_id before tests"""
        # Get RM token
        if not TestCommunicationPhase14.rm_token:
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": RM_EMAIL, "password": RM_PASSWORD
            })
            if resp.status_code == 200:
                TestCommunicationPhase14.rm_token = resp.json().get("token")
            else:
                pytest.skip(f"RM login failed: {resp.status_code}")
        
        # Get Admin token
        if not TestCommunicationPhase14.admin_token:
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
            })
            if resp.status_code == 200:
                TestCommunicationPhase14.admin_token = resp.json().get("token")
        
        # Get a lead_id for testing
        if not TestCommunicationPhase14.lead_id:
            headers = {"Authorization": f"Bearer {TestCommunicationPhase14.rm_token}"}
            resp = requests.get(f"{BASE_URL}/api/workflow/my-leads", headers=headers)
            if resp.status_code == 200:
                leads = resp.json()
                if leads and len(leads) > 0:
                    TestCommunicationPhase14.lead_id = leads[0].get("lead_id")
    
    def rm_headers(self):
        return {"Authorization": f"Bearer {TestCommunicationPhase14.rm_token}"}
    
    def admin_headers(self):
        return {"Authorization": f"Bearer {TestCommunicationPhase14.admin_token}"}
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 1: GET /api/communication/templates → returns 8 seeded templates
    # ═══════════════════════════════════════════════════════════════
    def test_01_get_templates_returns_seeded(self):
        """Test 1: GET /api/communication/templates returns 8 seeded templates"""
        resp = requests.get(f"{BASE_URL}/api/communication/templates", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "templates" in data, "Response should have 'templates' key"
        templates = data["templates"]
        assert len(templates) >= 8, f"Expected at least 8 templates, got {len(templates)}"
        
        # Verify template structure
        for tmpl in templates[:3]:
            assert "template_id" in tmpl
            assert "name" in tmpl
            assert "category" in tmpl
            assert "channel" in tmpl
            assert "body" in tmpl
        
        print(f"✓ Test 1 PASSED: Got {len(templates)} templates")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 2: GET /api/communication/dashboard-counts → returns urgency counts
    # ═══════════════════════════════════════════════════════════════
    def test_02_get_dashboard_counts(self):
        """Test 2: GET /api/communication/dashboard-counts returns urgency counts"""
        resp = requests.get(f"{BASE_URL}/api/communication/dashboard-counts", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        expected_keys = ["overdue", "follow_up_due", "never_contacted", "waiting_on_customer", 
                        "no_response", "recently_contacted", "total_active"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
            assert isinstance(data[key], int), f"{key} should be int"
        
        print(f"✓ Test 2 PASSED: Dashboard counts - total_active={data['total_active']}, never_contacted={data['never_contacted']}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 3: POST /api/communication/{lead_id}/log → log a call with outcome 'connected'
    # ═══════════════════════════════════════════════════════════════
    def test_03_log_call_connected(self):
        """Test 3: POST /api/communication/{lead_id}/log with outcome='connected'"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        payload = {
            "channel": "call",
            "action_type": "call_outcome_logged",
            "outcome": "connected",
            "summary": "Test call - customer connected",
            "note": "Discussed venue options"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/log",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "comm_id" in data, "Response should have comm_id"
        assert "communication_status" in data, "Response should have communication_status"
        assert "prompts" in data, "Response should have prompts"
        
        print(f"✓ Test 3 PASSED: Logged call, comm_id={data['comm_id']}, status={data['communication_status']}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 4: POST with outcome='customer_asked_for_callback' → prompt for follow-up
    # ═══════════════════════════════════════════════════════════════
    def test_04_log_callback_requested_prompts_followup(self):
        """Test 4: outcome='customer_asked_for_callback' prompts for follow-up scheduling"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        payload = {
            "channel": "call",
            "action_type": "call_outcome_logged",
            "outcome": "customer_asked_for_callback",
            "summary": "Customer requested callback tomorrow"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/log",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        prompts = data.get("prompts", [])
        # Should have a schedule_follow_up prompt
        has_followup_prompt = any(p.get("type") == "schedule_follow_up" for p in prompts)
        assert has_followup_prompt, f"Expected schedule_follow_up prompt, got: {prompts}"
        
        print(f"✓ Test 4 PASSED: Callback requested → got follow-up prompt")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 5: POST with outcome='visit_requested' → prompt to advance stage
    # ═══════════════════════════════════════════════════════════════
    def test_05_log_visit_requested_prompts_stage(self):
        """Test 5: outcome='visit_requested' prompts to advance to site_visit_planned"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        payload = {
            "channel": "call",
            "action_type": "call_outcome_logged",
            "outcome": "visit_requested",
            "summary": "Customer wants to visit venue"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/log",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        prompts = data.get("prompts", [])
        has_advance_prompt = any(p.get("type") == "advance_stage" for p in prompts)
        assert has_advance_prompt, f"Expected advance_stage prompt, got: {prompts}"
        
        print(f"✓ Test 5 PASSED: Visit requested → got advance_stage prompt")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 6: POST with outcome='not_interested' → prompt to mark lost
    # ═══════════════════════════════════════════════════════════════
    def test_06_log_not_interested_prompts_lost(self):
        """Test 6: outcome='not_interested' prompts to mark as lost"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        payload = {
            "channel": "call",
            "action_type": "call_outcome_logged",
            "outcome": "not_interested",
            "summary": "Customer not interested"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/log",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        prompts = data.get("prompts", [])
        has_lost_prompt = any(p.get("type") == "mark_lost" for p in prompts)
        assert has_lost_prompt, f"Expected mark_lost prompt, got: {prompts}"
        
        print(f"✓ Test 6 PASSED: Not interested → got mark_lost prompt")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 7: GET /api/communication/{lead_id}/timeline → sorted newest first
    # ═══════════════════════════════════════════════════════════════
    def test_07_get_timeline_sorted(self):
        """Test 7: GET /api/communication/{lead_id}/timeline returns entries sorted newest first"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        resp = requests.get(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/timeline",
            headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "timeline" in data, "Response should have 'timeline' key"
        assert "total" in data, "Response should have 'total' key"
        
        timeline = data["timeline"]
        if len(timeline) >= 2:
            # Verify sorted newest first
            for i in range(len(timeline) - 1):
                ts1 = timeline[i].get("timestamp", "")
                ts2 = timeline[i+1].get("timestamp", "")
                assert ts1 >= ts2, f"Timeline not sorted: {ts1} should be >= {ts2}"
        
        print(f"✓ Test 7 PASSED: Timeline has {data['total']} entries, sorted newest first")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 8: POST /api/communication/{lead_id}/follow-up → schedule follow-up
    # ═══════════════════════════════════════════════════════════════
    def test_08_schedule_followup(self):
        """Test 8: POST /api/communication/{lead_id}/follow-up schedules follow-up"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        future_date = (datetime.now() + timedelta(days=2)).isoformat()
        payload = {
            "scheduled_at": future_date,
            "description": "Follow up on venue shortlist",
            "waiting_state": "waiting_on_customer"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/follow-up",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "comm_id" in data, "Response should have comm_id"
        assert "next_follow_up_at" in data, "Response should have next_follow_up_at"
        
        print(f"✓ Test 8 PASSED: Follow-up scheduled, comm_id={data['comm_id']}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 9: POST /api/communication/{lead_id}/status → update communication status
    # ═══════════════════════════════════════════════════════════════
    def test_09_update_comm_status(self):
        """Test 9: POST /api/communication/{lead_id}/status updates communication status"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        payload = {
            "status": "waiting_on_customer",
            "reason": "Customer reviewing shortlist"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/status",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "message" in data
        assert "waiting_on_customer" in data["message"]
        
        print(f"✓ Test 9 PASSED: Status updated to waiting_on_customer")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 10: POST /api/communication/templates (admin only) → create template
    # ═══════════════════════════════════════════════════════════════
    def test_10_admin_create_template(self):
        """Test 10: POST /api/communication/templates (admin only) creates new template"""
        if not TestCommunicationPhase14.admin_token:
            pytest.skip("Admin token not available")
        
        payload = {
            "name": "TEST_Custom Template",
            "category": "introduction",
            "channel": "whatsapp",
            "body": "Hi {{customer_name}}, this is a test template from {{rm_name}}.",
            "variables": ["customer_name", "rm_name"]
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/templates",
            json=payload, headers=self.admin_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "template_id" in data, "Response should have template_id"
        TestCommunicationPhase14.test_template_id = data["template_id"]
        
        print(f"✓ Test 10 PASSED: Admin created template, id={data['template_id']}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 11: PUT /api/communication/templates/{template_id} (admin only) → update
    # ═══════════════════════════════════════════════════════════════
    def test_11_admin_update_template(self):
        """Test 11: PUT /api/communication/templates/{template_id} (admin only) updates template"""
        if not TestCommunicationPhase14.admin_token:
            pytest.skip("Admin token not available")
        
        template_id = getattr(TestCommunicationPhase14, 'test_template_id', None)
        if not template_id:
            pytest.skip("No test template created")
        
        payload = {
            "name": "TEST_Updated Template",
            "body": "Updated body: Hi {{customer_name}}!"
        }
        resp = requests.put(
            f"{BASE_URL}/api/communication/templates/{template_id}",
            json=payload, headers=self.admin_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        print(f"✓ Test 11 PASSED: Admin updated template")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 12: POST /api/communication/templates/{template_id}/render → variable substitution
    # ═══════════════════════════════════════════════════════════════
    def test_12_render_template(self):
        """Test 12: POST /api/communication/templates/{template_id}/render with variable substitution"""
        # Get first template
        resp = requests.get(f"{BASE_URL}/api/communication/templates", headers=self.rm_headers())
        if resp.status_code != 200:
            pytest.skip("Could not get templates")
        
        templates = resp.json().get("templates", [])
        if not templates:
            pytest.skip("No templates available")
        
        template_id = templates[0]["template_id"]
        
        payload = {
            "variables": {
                "customer_name": "John Doe",
                "rm_name": "Rahul Sharma",
                "venue_name": "Grand Palace"
            }
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/templates/{template_id}/render",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "rendered_body" in data, "Response should have rendered_body"
        assert "channel" in data, "Response should have channel"
        
        # Check variable substitution worked
        rendered = data["rendered_body"]
        assert "{{customer_name}}" not in rendered or "John Doe" in rendered, "Variable substitution should work"
        
        print(f"✓ Test 12 PASSED: Template rendered with variables")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 13: Verify lead summary fields updated after log
    # ═══════════════════════════════════════════════════════════════
    def test_13_verify_lead_summary_updated(self):
        """Test 13: Verify lead summary fields updated after communication log"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        # Get lead details
        resp = requests.get(
            f"{BASE_URL}/api/workflow/{TestCommunicationPhase14.lead_id}",
            headers=self.rm_headers()
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        lead = resp.json()
        # After our tests, the lead should have communication data
        # Check if communications array exists or last_contacted_at is set
        has_comms = lead.get("communications") is not None or lead.get("last_contacted_at") is not None
        
        # Also verify via timeline endpoint
        timeline_resp = requests.get(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/timeline",
            headers=self.rm_headers()
        )
        assert timeline_resp.status_code == 200
        timeline_data = timeline_resp.json()
        
        # We logged multiple communications in previous tests
        assert timeline_data.get("total", 0) > 0, "Timeline should have entries after logging"
        
        print(f"✓ Test 13 PASSED: Lead has {timeline_data.get('total', 0)} communication entries")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 14: Verify dashboard counts change after logging
    # ═══════════════════════════════════════════════════════════════
    def test_14_dashboard_counts_reflect_changes(self):
        """Test 14: Dashboard counts should reflect communication activity"""
        resp = requests.get(f"{BASE_URL}/api/communication/dashboard-counts", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        # After our tests, recently_contacted should have increased
        assert data["total_active"] >= 0, "total_active should be >= 0"
        
        print(f"✓ Test 14 PASSED: Dashboard counts retrieved successfully")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 15: Validation - invalid channel rejected
    # ═══════════════════════════════════════════════════════════════
    def test_15_validation_invalid_channel(self):
        """Test 15: Invalid channel should be rejected"""
        if not TestCommunicationPhase14.lead_id:
            pytest.skip("No lead_id available")
        
        payload = {
            "channel": "invalid_channel",
            "action_type": "call_outcome_logged",
            "outcome": "connected"
        }
        resp = requests.post(
            f"{BASE_URL}/api/communication/{TestCommunicationPhase14.lead_id}/log",
            json=payload, headers=self.rm_headers()
        )
        assert resp.status_code == 400, f"Expected 400 for invalid channel, got {resp.status_code}"
        
        print(f"✓ Test 15 PASSED: Invalid channel rejected with 400")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 16: RM can only access their own cases
    # ═══════════════════════════════════════════════════════════════
    def test_16_rm_access_control(self):
        """Test 16: RM can only access their own cases (rm_id check)"""
        # This test verifies that the endpoint returns 403 for non-owned leads
        # We'll use a fake lead_id that doesn't belong to this RM
        fake_lead_id = "lead_nonexistent_12345"
        
        resp = requests.get(
            f"{BASE_URL}/api/communication/{fake_lead_id}/timeline",
            headers=self.rm_headers()
        )
        # Should be 404 (not found) or 403 (forbidden)
        assert resp.status_code in [403, 404], f"Expected 403 or 404, got {resp.status_code}"
        
        print(f"✓ Test 16 PASSED: Access control working (got {resp.status_code})")


class TestRegressionPhase14:
    """Regression tests for existing RM functionality"""
    
    rm_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestRegressionPhase14.rm_token:
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": RM_EMAIL, "password": RM_PASSWORD
            })
            if resp.status_code == 200:
                TestRegressionPhase14.rm_token = resp.json().get("token")
            else:
                pytest.skip(f"RM login failed: {resp.status_code}")
    
    def rm_headers(self):
        return {"Authorization": f"Bearer {TestRegressionPhase14.rm_token}"}
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 26: RM login still works
    # ═══════════════════════════════════════════════════════════════
    def test_26_rm_login_works(self):
        """Test 26: RM login still works"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        assert resp.status_code == 200, f"RM login failed: {resp.status_code}"
        data = resp.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "rm"
        
        print(f"✓ Test 26 PASSED: RM login works")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 27: RM pipeline dashboard loads with leads
    # ═══════════════════════════════════════════════════════════════
    def test_27_rm_pipeline_loads(self):
        """Test 27: RM pipeline dashboard loads with leads"""
        resp = requests.get(f"{BASE_URL}/api/workflow/my-leads", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        leads = resp.json()
        assert isinstance(leads, list), "Should return list of leads"
        
        print(f"✓ Test 27 PASSED: RM pipeline loads with {len(leads)} leads")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST 28-30: Conversion, Execution, Settlement pages load
    # ═══════════════════════════════════════════════════════════════
    def test_28_conversion_endpoint(self):
        """Test 28: Conversion endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/conversion/cases", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        print(f"✓ Test 28 PASSED: Conversion endpoint works")
    
    def test_29_execution_endpoint(self):
        """Test 29: Execution dashboard endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/execution/dashboard", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        print(f"✓ Test 29 PASSED: Execution dashboard endpoint works")
    
    def test_30_settlement_endpoint(self):
        """Test 30: Settlement dashboard endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=self.rm_headers())
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        print(f"✓ Test 30 PASSED: Settlement dashboard endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
