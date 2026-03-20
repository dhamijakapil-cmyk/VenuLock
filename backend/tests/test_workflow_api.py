"""
VenuLoQ RM Workflow API Tests
=============================
Tests for the RM lead management workflow API endpoints.

Endpoints tested:
- POST /api/auth/login - RM authentication
- GET /api/workflow/my-leads - RM's leads list
- GET /api/workflow/stages - Stage configuration
- GET /api/workflow/{lead_id} - Lead detail
- POST /api/workflow/{lead_id}/message - Send message
- GET /api/workflow/{lead_id}/messages - Message history
- GET /api/workflow/{lead_id}/timeline - Activity timeline
- POST /api/workflow/{lead_id}/note - Add note
- PATCH /api/workflow/{lead_id}/stage - Advance stage
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# RM credentials
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"


@pytest.fixture(scope="module")
def rm_token():
    """Get RM authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    assert response.status_code == 200, f"RM login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture
def rm_client(rm_token):
    """Requests session with RM authentication"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {rm_token}"
    })
    return session


class TestRMAuthentication:
    """Test RM login flow"""
    
    def test_rm_login_success(self):
        """RM can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == RM_EMAIL
        assert data["user"]["role"] == "rm"
    
    def test_rm_login_invalid_credentials(self):
        """RM login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestWorkflowStages:
    """Test workflow stages endpoint"""
    
    def test_get_stages_list(self, rm_client):
        """Get ordered list of workflow stages"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/stages")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stages structure
        assert "stages" in data
        assert "terminal" in data
        
        # Verify required stages exist
        stage_ids = [s["id"] for s in data["stages"]]
        assert "new" in stage_ids
        assert "contacted" in stage_ids
        assert "site_visit" in stage_ids
        assert "negotiation" in stage_ids
        assert "booked" in stage_ids
        
        # Verify terminal stages
        terminal_ids = [s["id"] for s in data["terminal"]]
        assert "lost" in terminal_ids


class TestMyLeads:
    """Test RM's leads list endpoint"""
    
    def test_get_my_leads(self, rm_client):
        """RM can get their assigned leads"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)
        
        # Verify lead structure if there are leads
        if len(data) > 0:
            lead = data[0]
            assert "lead_id" in lead
            assert "customer_name" in lead
            assert "stage" in lead
            assert "stage_label" in lead
    
    def test_my_leads_requires_auth(self):
        """My leads endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 401


class TestLeadDetail:
    """Test lead detail endpoint"""
    
    @pytest.fixture
    def lead_id(self, rm_client):
        """Get a lead ID from the RM's leads"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 200
        leads = response.json()
        if len(leads) == 0:
            pytest.skip("No leads available for testing")
        return leads[0]["lead_id"]
    
    def test_get_lead_detail(self, rm_client, lead_id):
        """RM can get lead detail"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/{lead_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert data["lead_id"] == lead_id
        assert "customer_name" in data
        assert "customer_phone" in data
        assert "customer_email" in data
        assert "stage" in data
        assert "stage_label" in data
        assert "venue_name" in data
    
    def test_lead_detail_not_found(self, rm_client):
        """404 for non-existent lead"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/nonexistent_lead_123")
        assert response.status_code == 404


class TestLeadMessages:
    """Test lead messaging endpoints"""
    
    @pytest.fixture
    def lead_id(self, rm_client):
        """Get a lead ID from the RM's leads"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 200
        leads = response.json()
        if len(leads) == 0:
            pytest.skip("No leads available for testing")
        return leads[0]["lead_id"]
    
    def test_send_message(self, rm_client, lead_id):
        """RM can send a message to customer"""
        test_message = "TEST_Hello, this is a test message from the RM."
        response = rm_client.post(f"{BASE_URL}/api/workflow/{lead_id}/message", json={
            "content": test_message
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "message_id" in data
        assert data["content"] == test_message
        assert "sender_name" in data
        assert "created_at" in data
        # WhatsApp is mocked
        assert "whatsapp_status" in data
    
    def test_get_messages(self, rm_client, lead_id):
        """RM can get message history for a lead"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/{lead_id}/messages")
        assert response.status_code == 200
        data = response.json()
        
        assert data["lead_id"] == lead_id
        assert "messages" in data
        assert isinstance(data["messages"], list)
        
        # Verify message structure if there are messages
        if len(data["messages"]) > 0:
            msg = data["messages"][0]
            assert "message_id" in msg
            assert "content" in msg
            assert "sender_id" in msg
            assert "created_at" in msg


class TestLeadTimeline:
    """Test lead timeline endpoint"""
    
    @pytest.fixture
    def lead_id(self, rm_client):
        """Get a lead ID from the RM's leads"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 200
        leads = response.json()
        if len(leads) == 0:
            pytest.skip("No leads available for testing")
        return leads[0]["lead_id"]
    
    def test_get_timeline(self, rm_client, lead_id):
        """RM can get activity timeline for a lead"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/{lead_id}/timeline")
        assert response.status_code == 200
        data = response.json()
        
        assert data["lead_id"] == lead_id
        assert "timeline" in data
        assert isinstance(data["timeline"], list)
        
        # Verify timeline entry structure if there are entries
        if len(data["timeline"]) > 0:
            entry = data["timeline"][0]
            assert "activity_id" in entry
            assert "action" in entry
            assert "created_by_name" in entry
            assert "created_at" in entry


class TestLeadNotes:
    """Test lead notes endpoint"""
    
    @pytest.fixture
    def lead_id(self, rm_client):
        """Get a lead ID from the RM's leads"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 200
        leads = response.json()
        if len(leads) == 0:
            pytest.skip("No leads available for testing")
        return leads[0]["lead_id"]
    
    def test_add_note(self, rm_client, lead_id):
        """RM can add a note to a lead"""
        test_note = "TEST_This is a test note from automated testing."
        response = rm_client.post(f"{BASE_URL}/api/workflow/{lead_id}/note", json={
            "content": test_note
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "note_id" in data
        assert data["content"] == test_note
        assert "created_by_name" in data
        assert "created_at" in data
    
    def test_note_appears_in_timeline(self, rm_client, lead_id):
        """Added note appears in timeline"""
        # Add a note
        test_note = "TEST_Timeline verification note"
        rm_client.post(f"{BASE_URL}/api/workflow/{lead_id}/note", json={
            "content": test_note
        })
        
        # Check timeline
        response = rm_client.get(f"{BASE_URL}/api/workflow/{lead_id}/timeline")
        assert response.status_code == 200
        timeline = response.json()["timeline"]
        
        # Note should be in timeline
        note_entries = [e for e in timeline if "TEST_Timeline verification note" in (e.get("detail") or "")]
        assert len(note_entries) > 0, "Note not found in timeline"


class TestStageAdvancement:
    """Test lead stage advancement"""
    
    @pytest.fixture
    def new_stage_lead_id(self, rm_client):
        """Get a lead in 'new' stage for stage advancement testing"""
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 200
        leads = response.json()
        
        # Find a lead in 'new' stage
        new_leads = [l for l in leads if l["stage"] == "new"]
        if len(new_leads) == 0:
            pytest.skip("No leads in 'new' stage available for testing")
        return new_leads[0]["lead_id"]
    
    def test_advance_stage_new_to_contacted(self, rm_client, new_stage_lead_id):
        """RM can advance lead from 'new' to 'contacted'"""
        response = rm_client.patch(f"{BASE_URL}/api/workflow/{new_stage_lead_id}/stage", json={
            "stage": "contacted",
            "note": "TEST_Initial contact made"
        })
        
        # Either success or already at contacted
        if response.status_code == 400:
            # Check if already at this stage
            data = response.json()
            if "Already at this stage" in str(data.get("detail", "")):
                pytest.skip("Lead already at contacted stage")
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "contacted"
        assert "stage_label" in data
    
    def test_cannot_skip_stages(self, rm_client):
        """RM cannot skip stages in pipeline"""
        # Get a lead in 'new' stage
        response = rm_client.get(f"{BASE_URL}/api/workflow/my-leads")
        leads = response.json()
        new_leads = [l for l in leads if l["stage"] == "new"]
        
        if len(new_leads) == 0:
            pytest.skip("No leads in 'new' stage available for testing")
        
        lead_id = new_leads[0]["lead_id"]
        
        # Try to skip directly to 'booked'
        response = rm_client.patch(f"{BASE_URL}/api/workflow/{lead_id}/stage", json={
            "stage": "booked"
        })
        assert response.status_code == 400


class TestUnauthorizedAccess:
    """Test unauthorized access to workflow endpoints"""
    
    def test_my_leads_requires_auth(self):
        """Cannot access my-leads without auth"""
        response = requests.get(f"{BASE_URL}/api/workflow/my-leads")
        assert response.status_code == 401
    
    def test_lead_detail_requires_auth(self):
        """Cannot access lead detail without auth"""
        response = requests.get(f"{BASE_URL}/api/workflow/some_lead_id")
        assert response.status_code == 401
    
    def test_send_message_requires_auth(self):
        """Cannot send message without auth"""
        response = requests.post(f"{BASE_URL}/api/workflow/some_lead_id/message", json={
            "content": "Test"
        })
        assert response.status_code == 401
