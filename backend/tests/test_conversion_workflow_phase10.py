"""
VenuLoQ Phase 10 — Commercial Conversion Workflow Tests
Tests: Case intake, listing, detail, stage transitions, shortlist governance,
       quote workflow, site visit workflow, negotiation workflow, booking readiness gate
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


class TestConversionWorkflowPhase10:
    """Phase 10 Commercial Conversion Workflow Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.rm_token = None
        self.admin_token = None
        self.test_lead_id = None
        self.test_shortlist_id = None
        self.test_quote_id = None
        self.test_visit_id = None
        self.test_neg_id = None
    
    def get_rm_token(self):
        """Get RM authentication token"""
        if self.rm_token:
            return self.rm_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        if response.status_code == 200:
            self.rm_token = response.json().get("token")
            return self.rm_token
        pytest.skip(f"RM login failed: {response.status_code}")
    
    def get_admin_token(self):
        """Get Admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    # ═══════════════════════════════════════════════════════════════
    # CASE INTAKE TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_intake_requires_auth(self):
        """POST /api/conversion/intake requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/conversion/intake", json={
            "source_type": "manual",
            "customer_name": "Test Customer"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Intake requires auth")
    
    def test_intake_create_new_case(self):
        """POST /api/conversion/intake creates new case"""
        token = self.get_rm_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_Conv_{timestamp}",
                "customer_email": f"test_conv_{timestamp}@test.com",
                "customer_phone": f"9999{timestamp[-6:]}",
                "city": "Delhi",
                "area": "South Delhi",
                "event_type": "Wedding",
                "event_date": "2026-06-15",
                "guest_count": 300,
                "budget_per_plate": 2500,
                "travel_flexibility": "moderately_flexible",
                "venue_type_pref": "Banquet Hall",
                "notes": "Test conversion case"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("action") == "created", f"Expected action=created, got {data.get('action')}"
        assert "lead_id" in data, "Response should contain lead_id"
        assert data.get("stage") == "enquiry_received", f"Expected stage=enquiry_received, got {data.get('stage')}"
        self.test_lead_id = data["lead_id"]
        print(f"PASS: Intake creates new case - lead_id={self.test_lead_id}")
        return self.test_lead_id
    
    def test_intake_enriches_existing_case(self):
        """POST /api/conversion/intake enriches existing case for same customer"""
        token = self.get_rm_token()
        # First create a case
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        email = f"test_enrich_{timestamp}@test.com"
        
        # Create first case
        response1 = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_Enrich_{timestamp}",
                "customer_email": email,
                "city": "Mumbai"
            }
        )
        assert response1.status_code == 200
        first_lead_id = response1.json().get("lead_id")
        
        # Try to create another case with same email (enquiry source)
        response2 = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "enquiry",
                "customer_name": f"TEST_Enrich_{timestamp}",
                "customer_email": email,
                "notes": "Additional enquiry"
            }
        )
        assert response2.status_code == 200
        data = response2.json()
        # Should enrich existing case, not create new
        assert data.get("action") == "enriched", f"Expected action=enriched, got {data.get('action')}"
        assert data.get("lead_id") == first_lead_id, "Should return same lead_id"
        print("PASS: Intake enriches existing case for same customer")
    
    # ═══════════════════════════════════════════════════════════════
    # CASE LISTING TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_list_cases_requires_auth(self):
        """GET /api/conversion/cases requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/conversion/cases")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: List cases requires auth")
    
    def test_list_cases_returns_cases(self):
        """GET /api/conversion/cases returns cases with action-first data"""
        token = self.get_rm_token()
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "cases" in data, "Response should contain 'cases'"
        assert "total" in data, "Response should contain 'total'"
        
        if data["cases"]:
            case = data["cases"][0]
            # Check action-first fields
            assert "lead_id" in case
            assert "customer_name" in case
            assert "stage" in case
            assert "stage_label" in case
            assert "urgency" in case
            assert "is_overdue" in case
            assert "is_blocked" in case
            print(f"PASS: List cases returns {data['total']} cases with action-first data")
        else:
            print("PASS: List cases returns empty list (no cases for this RM)")
    
    def test_list_cases_stage_filter(self):
        """GET /api/conversion/cases supports stage filtering"""
        token = self.get_rm_token()
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases?stage=enquiry_received",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # All returned cases should be at enquiry_received stage
        for case in data.get("cases", []):
            assert case["stage"] in ["enquiry_received", "new"], f"Unexpected stage: {case['stage']}"
        print("PASS: List cases supports stage filtering")
    
    # ═══════════════════════════════════════════════════════════════
    # CASE DETAIL TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_case_detail_requires_auth(self):
        """GET /api/conversion/cases/{lead_id} requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/conversion/cases/lead_test123")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Case detail requires auth")
    
    def test_case_detail_not_found(self):
        """GET /api/conversion/cases/{lead_id} returns 404 for non-existent case"""
        token = self.get_rm_token()
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/lead_nonexistent_xyz",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Case detail returns 404 for non-existent case")
    
    def test_case_detail_returns_full_data(self):
        """GET /api/conversion/cases/{lead_id} returns full case detail"""
        token = self.get_rm_token()
        # First get a case from the list
        list_response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        if list_response.status_code != 200 or not list_response.json().get("cases"):
            # Create a case first
            lead_id = self.test_intake_create_new_case()
        else:
            lead_id = list_response.json()["cases"][0]["lead_id"]
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check full detail fields
        assert "lead_id" in data
        assert "customer_name" in data
        assert "stage" in data
        assert "stage_label" in data
        assert "shortlist" in data, "Should include shortlist array"
        assert "quotes" in data, "Should include quotes array"
        assert "site_visits" in data, "Should include site_visits array"
        assert "negotiations" in data, "Should include negotiations array"
        assert "follow_ups" in data, "Should include follow_ups array"
        assert "booking_readiness" in data, "Should include booking_readiness"
        print(f"PASS: Case detail returns full data for {lead_id}")
        return lead_id
    
    # ═══════════════════════════════════════════════════════════════
    # STAGE TRANSITION TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_stage_transition_requires_auth(self):
        """POST /api/conversion/cases/{lead_id}/stage requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/lead_test123/stage",
            json={"stage": "requirement_qualified"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Stage transition requires auth")
    
    def test_stage_transition_valid(self):
        """POST /api/conversion/cases/{lead_id}/stage allows valid transitions"""
        token = self.get_rm_token()
        # Create a new case at enquiry_received
        lead_id = self.test_intake_create_new_case()
        
        # Valid transition: enquiry_received -> requirement_qualified
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "requirement_qualified",
                "reason": "Customer requirements confirmed",
                "next_action": "Shortlist venues"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("stage") == "requirement_qualified"
        print("PASS: Valid stage transition works")
    
    def test_stage_transition_invalid(self):
        """POST /api/conversion/cases/{lead_id}/stage rejects invalid transitions"""
        token = self.get_rm_token()
        # Create a new case at enquiry_received
        lead_id = self.test_intake_create_new_case()
        
        # Invalid transition: enquiry_received -> booking_confirmed (skipping stages)
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={"stage": "booking_confirmed"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Invalid stage transition rejected")
    
    def test_stage_transition_admin_bypass(self):
        """Admin can bypass stage transition validation"""
        admin_token = self.get_admin_token()
        rm_token = self.get_rm_token()
        
        # Create a case as RM
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_AdminBypass_{timestamp}",
                "customer_email": f"admin_bypass_{timestamp}@test.com",
                "city": "Delhi"
            }
        )
        lead_id = response.json().get("lead_id")
        
        # Admin can skip stages
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"stage": "commercial_accepted", "reason": "Admin override"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Admin can bypass stage transition validation")
    
    # ═══════════════════════════════════════════════════════════════
    # SHORTLIST GOVERNANCE TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_shortlist_status_update_requires_auth(self):
        """POST /api/conversion/cases/{lead_id}/shortlist/{shortlist_id}/status requires auth"""
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/lead_test/shortlist/shortlist_test/status",
            json={"status": "liked"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Shortlist status update requires auth")
    
    def test_shortlist_status_update_not_found(self):
        """POST /api/conversion/cases/{lead_id}/shortlist/{shortlist_id}/status returns 404"""
        token = self.get_rm_token()
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/lead_test/shortlist/shortlist_nonexistent/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "liked"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Shortlist status update returns 404 for non-existent item")
    
    def test_shortlist_status_invalid_status(self):
        """POST /api/conversion/cases/{lead_id}/shortlist/{shortlist_id}/status rejects invalid status"""
        token = self.get_rm_token()
        # First need to get a real shortlist item
        list_response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        cases = list_response.json().get("cases", [])
        
        # Find a case with shortlist
        for case in cases:
            detail_response = self.session.get(
                f"{BASE_URL}/api/conversion/cases/{case['lead_id']}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if detail_response.status_code == 200:
                shortlist = detail_response.json().get("shortlist", [])
                if shortlist:
                    shortlist_id = shortlist[0]["shortlist_id"]
                    lead_id = case["lead_id"]
                    
                    # Try invalid status
                    response = self.session.post(
                        f"{BASE_URL}/api/conversion/cases/{lead_id}/shortlist/{shortlist_id}/status",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"status": "invalid_status_xyz"}
                    )
                    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
                    print("PASS: Shortlist status update rejects invalid status")
                    return
        
        print("SKIP: No shortlist items found to test invalid status")
    
    # ═══════════════════════════════════════════════════════════════
    # QUOTE WORKFLOW TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_quote_create_requires_auth(self):
        """POST /api/conversion/cases/{lead_id}/quotes requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/lead_test/quotes",
            json={"venue_id": "venue_test", "status": "requested"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Quote create requires auth")
    
    def test_quote_create_new(self):
        """POST /api/conversion/cases/{lead_id}/quotes creates new quote"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/quotes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_test_001",
                "venue_name": "Test Venue",
                "status": "requested",
                "amount_per_plate": 2500,
                "total_amount": 750000,
                "inclusions": "Food, Decor, DJ",
                "note": "Initial quote request"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("action") == "created"
        assert "quote_id" in data
        assert data.get("status") == "requested"
        self.test_quote_id = data["quote_id"]
        print(f"PASS: Quote created - quote_id={self.test_quote_id}")
        return lead_id, self.test_quote_id
    
    def test_quote_update_existing(self):
        """POST /api/conversion/cases/{lead_id}/quotes updates existing quote"""
        token = self.get_rm_token()
        lead_id, quote_id = self.test_quote_create_new()
        
        # Update the quote (same venue_id)
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/quotes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_test_001",
                "status": "received",
                "amount_per_plate": 2200,
                "total_amount": 660000,
                "note": "Quote received with discount"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("action") == "updated"
        assert data.get("status") == "received"
        print("PASS: Quote updated with revision history")
    
    def test_quote_invalid_status(self):
        """POST /api/conversion/cases/{lead_id}/quotes rejects invalid status"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/quotes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_test_002",
                "status": "invalid_status"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Quote rejects invalid status")
    
    # ═══════════════════════════════════════════════════════════════
    # SITE VISIT WORKFLOW TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_visit_create_requires_auth(self):
        """POST /api/conversion/cases/{lead_id}/visits requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/lead_test/visits",
            json={"venue_id": "venue_test", "status": "requested"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Visit create requires auth")
    
    def test_visit_create_new(self):
        """POST /api/conversion/cases/{lead_id}/visits creates new site visit"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/visits",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_visit_001",
                "venue_name": "Visit Test Venue",
                "status": "requested",
                "proposed_date": "2026-02-15",
                "rm_notes": "Customer prefers morning slot"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "visit_id" in data
        assert data.get("status") == "requested"
        self.test_visit_id = data["visit_id"]
        print(f"PASS: Visit created - visit_id={self.test_visit_id}")
        return lead_id, self.test_visit_id
    
    def test_visit_update(self):
        """POST /api/conversion/cases/{lead_id}/visits/{visit_id} updates visit"""
        token = self.get_rm_token()
        lead_id, visit_id = self.test_visit_create_new()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/visits/{visit_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_visit_001",
                "status": "scheduled",
                "scheduled_date": "2026-02-16",
                "rm_notes": "Confirmed for 10 AM"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Visit updated")
    
    def test_visit_complete(self):
        """POST /api/conversion/cases/{lead_id}/visits/{visit_id} can mark completed"""
        token = self.get_rm_token()
        lead_id, visit_id = self.test_visit_create_new()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/visits/{visit_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_visit_001",
                "status": "completed",
                "outcome": "Customer liked the venue",
                "customer_notes": "Great ambiance, good food"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Visit marked completed with outcome")
    
    def test_visit_invalid_status(self):
        """POST /api/conversion/cases/{lead_id}/visits rejects invalid status"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/visits",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_test",
                "status": "invalid_status"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Visit rejects invalid status")
    
    # ═══════════════════════════════════════════════════════════════
    # NEGOTIATION WORKFLOW TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_negotiation_start_requires_auth(self):
        """POST /api/conversion/cases/{lead_id}/negotiation requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/lead_test/negotiation",
            json={"venue_id": "venue_test", "status": "started"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Negotiation start requires auth")
    
    def test_negotiation_start(self):
        """POST /api/conversion/cases/{lead_id}/negotiation starts negotiation"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/negotiation",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_neg_001",
                "venue_name": "Negotiation Test Venue",
                "status": "started",
                "latest_ask": 800000,
                "latest_offer": 650000,
                "counter_note": "Initial negotiation"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "neg_id" in data
        assert data.get("status") == "started"
        self.test_neg_id = data["neg_id"]
        print(f"PASS: Negotiation started - neg_id={self.test_neg_id}")
        return lead_id, self.test_neg_id
    
    def test_negotiation_update(self):
        """POST /api/conversion/cases/{lead_id}/negotiation/{neg_id} updates negotiation"""
        token = self.get_rm_token()
        lead_id, neg_id = self.test_negotiation_start()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/negotiation/{neg_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_neg_001",
                "status": "counter_sent",
                "latest_ask": 750000,
                "latest_offer": 700000,
                "counter_note": "Counter offer sent"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Negotiation updated with counter history")
    
    def test_negotiation_agreed(self):
        """POST /api/conversion/cases/{lead_id}/negotiation/{neg_id} can mark agreed"""
        token = self.get_rm_token()
        lead_id, neg_id = self.test_negotiation_start()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/negotiation/{neg_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_neg_001",
                "status": "agreed",
                "latest_ask": 720000,
                "latest_offer": 720000,
                "counter_note": "Final agreement reached"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Negotiation marked as agreed")
    
    def test_negotiation_invalid_status(self):
        """POST /api/conversion/cases/{lead_id}/negotiation rejects invalid status"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/negotiation",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": "venue_test",
                "status": "invalid_status"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Negotiation rejects invalid status")
    
    # ═══════════════════════════════════════════════════════════════
    # BOOKING READINESS GATE TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_booking_readiness_get_requires_auth(self):
        """GET /api/conversion/cases/{lead_id}/booking-readiness requires auth"""
        response = self.session.get(f"{BASE_URL}/api/conversion/cases/lead_test/booking-readiness")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Booking readiness GET requires auth")
    
    def test_booking_readiness_get(self):
        """GET /api/conversion/cases/{lead_id}/booking-readiness returns 6 checks"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "checks" in data
        assert len(data["checks"]) == 6, f"Expected 6 checks, got {len(data['checks'])}"
        assert "passed_count" in data
        assert "total_count" in data
        assert data["total_count"] == 6
        assert "all_ready" in data
        
        # Verify all 6 check IDs
        check_ids = [c["id"] for c in data["checks"]]
        expected_ids = [
            "requirement_confirmed",
            "final_venue_selected",
            "commercial_terms_agreed",
            "customer_contact_confirmed",
            "payment_milestone_recorded",
            "booking_date_locked"
        ]
        for expected in expected_ids:
            assert expected in check_ids, f"Missing check: {expected}"
        
        print("PASS: Booking readiness returns 6 checks")
    
    def test_booking_readiness_update(self):
        """POST /api/conversion/cases/{lead_id}/booking-readiness toggles checks"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        # Toggle a check
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"},
            json={"requirement_confirmed": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify it was updated
        get_response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = get_response.json()
        req_check = next((c for c in data["checks"] if c["id"] == "requirement_confirmed"), None)
        assert req_check and req_check["passed"] == True, "requirement_confirmed should be True"
        print("PASS: Booking readiness check toggled")
    
    def test_confirm_booking_requires_auth(self):
        """POST /api/conversion/cases/{lead_id}/confirm-booking requires auth"""
        response = self.session.post(f"{BASE_URL}/api/conversion/cases/lead_test/confirm-booking")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Confirm booking requires auth")
    
    def test_confirm_booking_fails_without_checks(self):
        """POST /api/conversion/cases/{lead_id}/confirm-booking fails if checks not passed"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/confirm-booking",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "readiness" in response.text.lower() or "stage" in response.text.lower()
        print("PASS: Confirm booking fails without all checks passed")
    
    def test_confirm_booking_fails_wrong_stage(self):
        """POST /api/conversion/cases/{lead_id}/confirm-booking fails at wrong stage"""
        token = self.get_rm_token()
        lead_id = self.test_intake_create_new_case()
        
        # Set all readiness checks
        self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "requirement_confirmed": True,
                "final_venue_selected": True,
                "commercial_terms_agreed": True,
                "customer_contact_confirmed": True,
                "payment_milestone_recorded": True,
                "booking_date_locked": True
            }
        )
        
        # Try to confirm at enquiry_received stage (should fail)
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/confirm-booking",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Confirm booking fails at wrong stage")
    
    def test_confirm_booking_success(self):
        """POST /api/conversion/cases/{lead_id}/confirm-booking succeeds with all checks at correct stage"""
        admin_token = self.get_admin_token()
        rm_token = self.get_rm_token()
        
        # Create case as RM
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_ConfirmBooking_{timestamp}",
                "customer_email": f"confirm_{timestamp}@test.com",
                "city": "Delhi"
            }
        )
        lead_id = response.json().get("lead_id")
        
        # Admin moves to commercial_accepted stage
        self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"stage": "commercial_accepted", "reason": "Test"}
        )
        
        # Set all readiness checks
        self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "requirement_confirmed": True,
                "final_venue_selected": True,
                "commercial_terms_agreed": True,
                "customer_contact_confirmed": True,
                "payment_milestone_recorded": True,
                "booking_date_locked": True
            }
        )
        
        # Confirm booking
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/confirm-booking",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("stage") == "booking_confirmed"
        print("PASS: Booking confirmed successfully with all checks at correct stage")
    
    # ═══════════════════════════════════════════════════════════════
    # ADMIN ACCESS TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_admin_can_access_all_cases(self):
        """Admin can access all cases regardless of RM assignment"""
        admin_token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Admin can access all cases")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
