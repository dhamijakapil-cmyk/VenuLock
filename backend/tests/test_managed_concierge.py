"""
Test suite for BookMyVenue Managed Concierge Platform
Tests: Lead pipeline stages, venue shortlist, communications, notes, follow-ups, 
       commission tracking, audit log, and booking confirmation validation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RM_EMAIL = "rm1@bookmyvenue.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@bookmyvenue.in"
ADMIN_PASSWORD = "admin123"

# Test lead ID from main agent
TEST_LEAD_ID = "lead_b6757d581e34"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def rm_token(api_client):
    """Get RM authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"RM authentication failed: {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get Admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.text}")


@pytest.fixture(scope="module")
def authenticated_rm_client(api_client, rm_token):
    """Session with RM auth header"""
    api_client.headers.update({"Authorization": f"Bearer {rm_token}"})
    return api_client


class TestAuthentication:
    """Test authentication endpoints for RM and Admin"""
    
    def test_rm_login_success(self, api_client):
        """Test RM can login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200, f"RM login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "rm"
        assert data["user"]["email"] == RM_EMAIL
        print(f"✓ RM login successful - user_id: {data['user']['user_id']}")
    
    def test_admin_login_success(self, api_client):
        """Test Admin can login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - user_id: {data['user']['user_id']}")


class TestLeadPipeline:
    """Test 8-stage lead pipeline for managed platform"""
    
    EXPECTED_STAGES = [
        "new", "contacted", "requirement_understood", "shortlisted",
        "site_visit", "negotiation", "booking_confirmed", "lost"
    ]
    
    def test_get_leads_list(self, authenticated_rm_client, rm_token):
        """Test getting leads list"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        data = response.json()
        assert "leads" in data
        assert "total" in data
        print(f"✓ Retrieved {len(data['leads'])} leads, total: {data['total']}")
    
    def test_get_lead_detail(self, authenticated_rm_client, rm_token):
        """Test getting full lead details with all associated data"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        assert response.status_code == 200, f"Failed to get lead: {response.text}"
        
        lead = response.json()
        assert lead["lead_id"] == TEST_LEAD_ID
        
        # Check enhanced lead fields exist
        assert "deal_value" in lead
        assert "venue_commission_type" in lead
        assert "venue_commission_rate" in lead
        assert "venue_commission_calculated" in lead
        assert "contact_released" in lead
        
        # Check related collections are loaded
        assert "shortlist" in lead
        assert "quotes" in lead
        assert "planner_matches" in lead
        assert "communications" in lead
        assert "follow_ups" in lead
        assert "notes" in lead
        assert "activity_timeline" in lead
        
        print(f"✓ Lead detail loaded with all related data")
        print(f"  - Shortlist items: {len(lead.get('shortlist', []))}")
        print(f"  - Communications: {len(lead.get('communications', []))}")
        print(f"  - Notes: {len(lead.get('notes', []))}")
        print(f"  - Follow-ups: {len(lead.get('follow_ups', []))}")
        print(f"  - Activity timeline: {len(lead.get('activity_timeline', []))}")
    
    def test_update_lead_stage(self, authenticated_rm_client, rm_token):
        """Test updating lead stage"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # Update to 'contacted' stage
        response = authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "stage": "contacted"
        })
        assert response.status_code == 200, f"Failed to update stage: {response.text}"
        
        # Verify the update
        get_response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        lead = get_response.json()
        assert lead["stage"] == "contacted"
        print(f"✓ Lead stage updated to 'contacted'")
    
    def test_update_deal_value(self, authenticated_rm_client, rm_token):
        """Test updating deal value"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        new_deal_value = 600000
        response = authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "deal_value": new_deal_value
        })
        assert response.status_code == 200, f"Failed to update deal value: {response.text}"
        
        # Verify update
        get_response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        lead = get_response.json()
        assert lead["deal_value"] == new_deal_value
        print(f"✓ Deal value updated to {new_deal_value}")


class TestCommissionTracking:
    """Test venue and planner commission calculations"""
    
    def test_venue_commission_percentage(self, authenticated_rm_client, rm_token):
        """Test venue commission calculation with percentage type"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # Set deal value and percentage commission
        response = authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "deal_value": 500000,
            "venue_commission_type": "percentage",
            "venue_commission_rate": 10
        })
        assert response.status_code == 200, f"Failed to update commission: {response.text}"
        
        # Verify auto-calculation
        get_response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        lead = get_response.json()
        
        assert lead["venue_commission_type"] == "percentage"
        assert lead["venue_commission_rate"] == 10
        # 10% of 500000 = 50000
        assert lead["venue_commission_calculated"] == 50000, f"Expected 50000, got {lead['venue_commission_calculated']}"
        print(f"✓ Venue percentage commission calculated correctly: ₹{lead['venue_commission_calculated']}")
    
    def test_venue_commission_flat(self, authenticated_rm_client, rm_token):
        """Test venue commission with flat amount type"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "venue_commission_type": "flat",
            "venue_commission_flat": 75000,
            "venue_commission_rate": None  # Clear percentage rate
        })
        assert response.status_code == 200
        
        get_response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        lead = get_response.json()
        
        assert lead["venue_commission_type"] == "flat"
        assert lead["venue_commission_calculated"] == 75000
        print(f"✓ Venue flat commission calculated correctly: ₹{lead['venue_commission_calculated']}")
    
    def test_reset_to_percentage_commission(self, authenticated_rm_client, rm_token):
        """Reset commission back to percentage for next tests"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "venue_commission_type": "percentage",
            "venue_commission_rate": 10,
            "venue_commission_flat": None
        })
        assert response.status_code == 200
        print(f"✓ Reset venue commission to percentage type")


class TestBookingConfirmationValidation:
    """Test booking confirmation validation rules"""
    
    def test_cannot_confirm_without_deal_value(self, api_client, rm_token):
        """Test that booking cannot be confirmed without deal value"""
        # Create a fresh lead for this validation test
        create_resp = api_client.post(f"{BASE_URL}/api/leads", json={
            "customer_name": "Test Val No Deal",
            "customer_email": "test.val.nodeal@example.com",
            "customer_phone": "9999999001",
            "event_type": "wedding",
            "city": "Mumbai"
        })
        new_lead_id = create_resp.json().get("lead_id")
        
        api_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # Try to confirm booking without deal value
        response = api_client.put(f"{BASE_URL}/api/leads/{new_lead_id}", json={
            "stage": "booking_confirmed"
        })
        
        # Should fail with 400 error
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "Deal value is required" in response.json().get("detail", "")
        print(f"✓ Correctly rejected booking confirmation without deal value")
    
    def test_cannot_confirm_without_commission(self, api_client, rm_token):
        """Test that booking cannot be confirmed without commission configured"""
        # Create a fresh lead for this validation test
        create_resp = api_client.post(f"{BASE_URL}/api/leads", json={
            "customer_name": "Test Val No Comm",
            "customer_email": "test.val.nocomm@example.com",
            "customer_phone": "9999999002",
            "event_type": "wedding",
            "city": "Delhi"
        })
        new_lead_id = create_resp.json().get("lead_id")
        
        api_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # Set deal value but no commission
        api_client.put(f"{BASE_URL}/api/leads/{new_lead_id}", json={
            "deal_value": 500000
        })
        
        # Try to confirm
        response = api_client.put(f"{BASE_URL}/api/leads/{new_lead_id}", json={
            "stage": "booking_confirmed"
        })
        
        # Should fail
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "commission" in response.json().get("detail", "").lower()
        print(f"✓ Correctly rejected booking confirmation without commission")
    
    def test_can_confirm_with_valid_data(self, authenticated_rm_client, rm_token):
        """Test successful booking confirmation with deal value and commission"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # Set valid deal value and commission first
        authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "deal_value": 500000,
            "venue_commission_type": "percentage",
            "venue_commission_rate": 10
        })
        
        # Now confirm booking
        response = authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "stage": "booking_confirmed"
        })
        
        assert response.status_code == 200, f"Booking confirmation failed: {response.text}"
        
        # Verify confirmation
        get_response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        lead = get_response.json()
        assert lead["stage"] == "booking_confirmed"
        assert lead["confirmed_at"] is not None
        print(f"✓ Booking confirmed successfully with valid data")
        
        # Reset stage for subsequent tests
        authenticated_rm_client.put(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}", json={
            "stage": "negotiation"
        })


class TestVenueShortlist:
    """Test venue shortlist functionality"""
    
    def test_add_venue_to_shortlist(self, authenticated_rm_client, rm_token):
        """Test adding a venue to lead's shortlist"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # First get available venues
        venues_response = authenticated_rm_client.get(f"{BASE_URL}/api/venues?limit=5")
        venues = venues_response.json()
        
        if not venues:
            pytest.skip("No venues available for shortlist test")
        
        venue = venues[0]
        
        # Check if already in shortlist
        lead_response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        lead = lead_response.json()
        existing_venue_ids = [item["venue_id"] for item in lead.get("shortlist", [])]
        
        if venue["venue_id"] in existing_venue_ids:
            print(f"✓ Venue already in shortlist - skipping add test")
            return
        
        # Add to shortlist
        response = authenticated_rm_client.post(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/shortlist", json={
            "venue_id": venue["venue_id"],
            "notes": "Test venue - good match for customer requirements",
            "proposed_price": 450000,
            "status": "proposed"
        })
        
        assert response.status_code == 200, f"Failed to add to shortlist: {response.text}"
        data = response.json()
        assert "shortlist_id" in data
        assert data["venue_id"] == venue["venue_id"]
        print(f"✓ Added venue '{venue['name']}' to shortlist")
    
    def test_get_shortlist(self, authenticated_rm_client, rm_token):
        """Test getting venue shortlist for a lead"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/shortlist")
        assert response.status_code == 200
        
        shortlist = response.json()
        assert isinstance(shortlist, list)
        print(f"✓ Retrieved shortlist with {len(shortlist)} items")
        
        # Verify enriched venue data
        for item in shortlist[:1]:  # Check first item
            assert "venue" in item
            if item["venue"]:
                print(f"  - Shortlist includes venue details: {item['venue'].get('name')}")


class TestCommunicationLog:
    """Test communication logging functionality"""
    
    def test_log_communication(self, authenticated_rm_client, rm_token):
        """Test logging a communication"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.post(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/communications", json={
            "channel": "call",
            "direction": "outbound",
            "summary": "Test call - discussed requirements and venue preferences",
            "duration_minutes": 15
        })
        
        assert response.status_code == 200, f"Failed to log communication: {response.text}"
        data = response.json()
        assert "comm_id" in data
        assert data["channel"] == "call"
        assert data["direction"] == "outbound"
        print(f"✓ Communication logged successfully - ID: {data['comm_id']}")
    
    def test_get_communications(self, authenticated_rm_client, rm_token):
        """Test getting communication logs"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/communications")
        assert response.status_code == 200
        
        communications = response.json()
        assert isinstance(communications, list)
        assert len(communications) > 0
        print(f"✓ Retrieved {len(communications)} communication logs")


class TestLeadNotes:
    """Test notes with types functionality"""
    
    def test_add_note_with_type(self, authenticated_rm_client, rm_token):
        """Test adding a note with specific type"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.post(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/notes", json={
            "content": "Test note - customer prefers outdoor venues with catering included",
            "note_type": "requirement"
        })
        
        assert response.status_code == 200, f"Failed to add note: {response.text}"
        data = response.json()
        assert "note_id" in data
        assert data["note_type"] == "requirement"
        print(f"✓ Note added with type 'requirement' - ID: {data['note_id']}")
    
    def test_add_negotiation_note(self, authenticated_rm_client, rm_token):
        """Test adding negotiation type note"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.post(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/notes", json={
            "content": "Venue agreed to 10% discount if booked within this week",
            "note_type": "negotiation"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["note_type"] == "negotiation"
        print(f"✓ Negotiation note added successfully")
    
    def test_get_notes(self, authenticated_rm_client, rm_token):
        """Test getting notes"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/notes")
        assert response.status_code == 200
        
        notes = response.json()
        assert isinstance(notes, list)
        print(f"✓ Retrieved {len(notes)} notes")


class TestFollowUps:
    """Test follow-up scheduling functionality"""
    
    def test_schedule_follow_up(self, authenticated_rm_client, rm_token):
        """Test scheduling a follow-up"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        # Schedule for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT%10:00:00")
        
        response = authenticated_rm_client.post(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/follow-ups", json={
            "scheduled_at": tomorrow,
            "description": "Follow up on venue visit feedback",
            "follow_up_type": "call"
        })
        
        assert response.status_code == 200, f"Failed to schedule follow-up: {response.text}"
        data = response.json()
        assert "follow_up_id" in data
        assert data["follow_up_type"] == "call"
        assert data["status"] == "pending"
        print(f"✓ Follow-up scheduled - ID: {data['follow_up_id']}")
    
    def test_schedule_site_visit_follow_up(self, authenticated_rm_client, rm_token):
        """Test scheduling a site visit follow-up"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%dT%14:00:00")
        
        response = authenticated_rm_client.post(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/follow-ups", json={
            "scheduled_at": future_date,
            "description": "Site visit at Grand Palace Banquet",
            "follow_up_type": "site_visit"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["follow_up_type"] == "site_visit"
        print(f"✓ Site visit follow-up scheduled")
    
    def test_get_follow_ups(self, authenticated_rm_client, rm_token):
        """Test getting follow-ups"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/follow-ups")
        assert response.status_code == 200
        
        follow_ups = response.json()
        assert isinstance(follow_ups, list)
        print(f"✓ Retrieved {len(follow_ups)} follow-ups")


class TestActivityTimeline:
    """Test audit log / activity timeline"""
    
    def test_get_activity_timeline(self, authenticated_rm_client, rm_token):
        """Test getting activity timeline for a lead"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/activity")
        assert response.status_code == 200
        
        activities = response.json()
        assert isinstance(activities, list)
        
        # Should have audit entries from our tests
        if activities:
            activity = activities[0]
            assert "action" in activity
            assert "performed_by" in activity
            assert "performed_at" in activity
        
        print(f"✓ Retrieved {len(activities)} activity entries")
        
        # Print sample actions
        action_types = set(a["action"] for a in activities[:5])
        print(f"  - Sample actions: {action_types}")


class TestContactVisibility:
    """Test contact visibility control"""
    
    def test_contact_protected_badge(self, authenticated_rm_client, rm_token):
        """Test that contact_released field is present"""
        authenticated_rm_client.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = authenticated_rm_client.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        assert response.status_code == 200
        
        lead = response.json()
        assert "contact_released" in lead
        print(f"✓ Contact visibility field present - Released: {lead['contact_released']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
