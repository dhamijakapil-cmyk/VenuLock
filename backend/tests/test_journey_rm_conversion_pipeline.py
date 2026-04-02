"""
VenuLoQ Journey Test #2 — Full RM Conversion Pipeline
Tests the complete lifecycle: Enquiry/Callback Intake → Qualification → Shortlist → Quote → 
Site Visit → Negotiation → Commercial Accepted → Booking Readiness Gate → Booking Confirmed

Stage Pipeline:
enquiry_received → requirement_qualified → venues_shortlisted → quote_requested → quote_received →
site_visit_planned → site_visit_completed → negotiation_in_progress → commercial_accepted →
booking_confirmation_pending → booking_confirmed | lost
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - RM is the primary operational role for conversion
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"


class TestJourneyRMConversionPipeline:
    """Journey Test #2: Full RM Conversion Pipeline End-to-End"""
    
    # Class-level state to track test data across methods
    lead_id = None
    shortlist_id = None
    quote_id = None
    visit_id = None
    neg_id = None
    rm_token = None
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_rm_token(self):
        """Get RM authentication token"""
        if TestJourneyRMConversionPipeline.rm_token:
            return TestJourneyRMConversionPipeline.rm_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        if response.status_code == 200:
            TestJourneyRMConversionPipeline.rm_token = response.json().get("token")
            return TestJourneyRMConversionPipeline.rm_token
        pytest.skip(f"RM login failed: {response.status_code} - {response.text}")
    
    def get_admin_token(self):
        """Get Admin authentication token"""
        if TestJourneyRMConversionPipeline.admin_token:
            return TestJourneyRMConversionPipeline.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            TestJourneyRMConversionPipeline.admin_token = response.json().get("token")
            return TestJourneyRMConversionPipeline.admin_token
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 1: RM CREATES INTAKE CASE (ENQUIRY)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step1_01_rm_login(self):
        """Step 1.1: RM can login successfully"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200, f"RM login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data.get("user", {}).get("role") in ["rm", "admin"], f"User role should be rm or admin, got {data.get('user', {}).get('role')}"
        print(f"PASS: RM login successful - role={data.get('user', {}).get('role')}")
    
    def test_step1_02_create_intake_enquiry(self):
        """Step 1.2: POST /api/conversion/intake creates lead in 'enquiry_received' stage"""
        token = self.get_rm_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "enquiry",
                "customer_name": f"TEST_Journey2_{timestamp}",
                "customer_email": f"journey2_{timestamp}@test.com",
                "customer_phone": f"9876{timestamp[-6:]}",
                "city": "Delhi",
                "area": "South Delhi",
                "event_type": "Wedding Reception",
                "event_date": "2026-06-20",
                "guest_count": 350,
                "budget_per_plate": 2800,
                "travel_flexibility": "moderately_flexible",
                "venue_type_pref": "Banquet Hall",
                "notes": "Journey Test #2 - Full RM Conversion Pipeline"
            }
        )
        assert response.status_code == 200, f"Intake failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("action") == "created", f"Expected action=created, got {data.get('action')}"
        assert "lead_id" in data, "Response should contain lead_id"
        assert data.get("stage") == "enquiry_received", f"Expected stage=enquiry_received, got {data.get('stage')}"
        
        TestJourneyRMConversionPipeline.lead_id = data["lead_id"]
        print(f"PASS: Intake created lead_id={TestJourneyRMConversionPipeline.lead_id} in stage=enquiry_received")
    
    def test_step1_03_verify_booking_readiness_defaults(self):
        """Step 1.3: Verify booking_readiness defaults all false"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        assert lead_id, "lead_id not set from previous test"
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get booking readiness failed: {response.status_code}"
        data = response.json()
        
        assert data.get("passed_count") == 0, f"Expected 0 passed checks, got {data.get('passed_count')}"
        assert data.get("all_ready") == False, "all_ready should be False initially"
        
        # Verify all 6 checks are false
        for check in data.get("checks", []):
            assert check.get("passed") == False, f"Check {check.get('id')} should be False initially"
        
        print("PASS: Booking readiness defaults all false (0/6 checks)")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 2: RM QUALIFIES THE REQUIREMENT
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step2_01_transition_to_requirement_qualified(self):
        """Step 2.1: POST /api/conversion/cases/{lead_id}/stage → requirement_qualified"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        assert lead_id, "lead_id not set"
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "requirement_qualified",
                "reason": "Customer requirements confirmed via call",
                "next_action": "Shortlist suitable venues"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("stage") == "requirement_qualified", f"Expected stage=requirement_qualified, got {data.get('stage')}"
        print("PASS: Stage transition enquiry_received → requirement_qualified")
    
    def test_step2_02_verify_stage_in_case_detail(self):
        """Step 2.2: GET /api/conversion/cases/{lead_id} verifies stage"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get case detail failed: {response.status_code}"
        data = response.json()
        assert data.get("stage") == "requirement_qualified", f"Stage should be requirement_qualified, got {data.get('stage')}"
        print("PASS: Case detail confirms stage=requirement_qualified")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 3: RM SHORTLISTS VENUES
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step3_01_transition_to_venues_shortlisted(self):
        """Step 3.1: POST /api/conversion/cases/{lead_id}/stage → venues_shortlisted"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "venues_shortlisted",
                "reason": "Initial venue options identified",
                "next_action": "Share shortlist with customer"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("stage") == "venues_shortlisted", f"Expected stage=venues_shortlisted, got {data.get('stage')}"
        print("PASS: Stage transition requirement_qualified → venues_shortlisted")
    
    def test_step3_02_get_available_venue_for_shortlist(self):
        """Step 3.2: Get a venue to add to shortlist"""
        token = self.get_rm_token()
        
        # Get a published venue
        response = self.session.get(
            f"{BASE_URL}/api/venues?city=Delhi&limit=1",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            # API may return list directly or dict with "venues" key
            venues = data if isinstance(data, list) else data.get("venues", [])
            if venues:
                TestJourneyRMConversionPipeline.test_venue_id = venues[0].get("venue_id")
                print(f"PASS: Found venue for shortlist: {TestJourneyRMConversionPipeline.test_venue_id}")
                return
        
        # If no venue found, we'll use a mock venue_id for testing
        TestJourneyRMConversionPipeline.test_venue_id = "venue_test_journey2"
        print("INFO: Using mock venue_id for shortlist test")
    
    def test_step3_03_add_venue_to_shortlist(self):
        """Step 3.3: POST /api/leads/{lead_id}/shortlist adds venue"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        response = self.session.post(
            f"{BASE_URL}/api/leads/{lead_id}/shortlist",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "notes": "Good fit for wedding reception",
                "proposed_price": 2500,
                "status": "suggested"
            }
        )
        
        # May fail if venue doesn't exist - that's acceptable for this test
        if response.status_code == 200:
            data = response.json()
            TestJourneyRMConversionPipeline.shortlist_id = data.get("shortlist_id")
            print(f"PASS: Venue added to shortlist - shortlist_id={TestJourneyRMConversionPipeline.shortlist_id}")
        elif response.status_code == 404 and "Venue not found" in response.text:
            print("INFO: Venue not found in DB - shortlist add skipped (expected if no venues seeded)")
            pytest.skip("No venues in database to shortlist")
        elif response.status_code == 400 and "already in shortlist" in response.text:
            print("INFO: Venue already in shortlist")
        else:
            pytest.fail(f"Unexpected error: {response.status_code} - {response.text}")
    
    def test_step3_04_get_shortlist(self):
        """Step 3.4: GET /api/leads/{lead_id}/shortlist verifies entries"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/leads/{lead_id}/shortlist",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get shortlist failed: {response.status_code}"
        data = response.json()
        
        # Data is a list
        assert isinstance(data, list), "Shortlist should be a list"
        print(f"PASS: Shortlist retrieved - {len(data)} entries")
    
    def test_step3_05_update_shortlist_status(self):
        """Step 3.5: POST /api/conversion/cases/{lead_id}/shortlist/{entry_id}/status updates status"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        shortlist_id = TestJourneyRMConversionPipeline.shortlist_id
        
        if not shortlist_id:
            pytest.skip("No shortlist_id from previous test")
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/shortlist/{shortlist_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "status": "liked",
                "customer_feedback": "Customer liked the venue photos",
                "rm_notes": "Good option, proceed with quote"
            }
        )
        assert response.status_code == 200, f"Update shortlist status failed: {response.status_code} - {response.text}"
        print("PASS: Shortlist status updated to 'liked'")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 4: RM REQUESTS AND RECEIVES QUOTES
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step4_01_transition_to_quote_requested(self):
        """Step 4.1: POST /api/conversion/cases/{lead_id}/stage → quote_requested"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "quote_requested",
                "reason": "Customer interested in shortlisted venues",
                "next_action": "Follow up with venues for quotes"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition venues_shortlisted → quote_requested")
    
    def test_step4_02_create_quote(self):
        """Step 4.2: POST /api/conversion/cases/{lead_id}/quotes creates quote entry"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/quotes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "venue_name": "Test Venue for Journey 2",
                "status": "requested",
                "amount_per_plate": 2800,
                "total_amount": 980000,
                "inclusions": "Food, Decor, DJ, Valet",
                "exclusions": "Alcohol, Photography",
                "special_terms": "50% advance required",
                "valid_until": "2026-03-01",
                "note": "Initial quote request"
            }
        )
        assert response.status_code == 200, f"Create quote failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("action") == "created", f"Expected action=created, got {data.get('action')}"
        assert "quote_id" in data, "Response should contain quote_id"
        
        TestJourneyRMConversionPipeline.quote_id = data["quote_id"]
        print(f"PASS: Quote created - quote_id={TestJourneyRMConversionPipeline.quote_id}")
    
    def test_step4_03_get_quotes(self):
        """Step 4.3: GET /api/conversion/cases/{lead_id} verifies quotes list"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get case detail failed: {response.status_code}"
        data = response.json()
        
        quotes = data.get("quotes", [])
        assert len(quotes) > 0, "Should have at least one quote"
        print(f"PASS: Case has {len(quotes)} quote(s)")
    
    def test_step4_04_update_quote_to_received(self):
        """Step 4.4: Update quote status to 'received'"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/quotes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "status": "received",
                "amount_per_plate": 2600,
                "total_amount": 910000,
                "note": "Quote received with 7% discount"
            }
        )
        assert response.status_code == 200, f"Update quote failed: {response.status_code}"
        data = response.json()
        assert data.get("action") == "updated", f"Expected action=updated, got {data.get('action')}"
        print("PASS: Quote updated to status='received'")
    
    def test_step4_05_transition_to_quote_received(self):
        """Step 4.5: POST /api/conversion/cases/{lead_id}/stage → quote_received"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "quote_received",
                "reason": "Quote received from venue",
                "next_action": "Schedule site visit"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition quote_requested → quote_received")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 5: RM PLANS AND COMPLETES SITE VISIT
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step5_01_transition_to_site_visit_planned(self):
        """Step 5.1: POST /api/conversion/cases/{lead_id}/stage → site_visit_planned"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "site_visit_planned",
                "reason": "Customer wants to visit venue",
                "next_action": "Coordinate visit timing"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition quote_received → site_visit_planned")
    
    def test_step5_02_create_visit(self):
        """Step 5.2: POST /api/conversion/cases/{lead_id}/visits logs visit"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/visits",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "venue_name": "Test Venue for Journey 2",
                "status": "scheduled",
                "proposed_date": "2026-02-20",
                "scheduled_date": "2026-02-20",
                "rm_notes": "Customer prefers 11 AM slot"
            }
        )
        assert response.status_code == 200, f"Create visit failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "visit_id" in data, "Response should contain visit_id"
        
        TestJourneyRMConversionPipeline.visit_id = data["visit_id"]
        print(f"PASS: Visit created - visit_id={TestJourneyRMConversionPipeline.visit_id}")
    
    def test_step5_03_get_visits(self):
        """Step 5.3: GET /api/conversion/cases/{lead_id} verifies visits list"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get case detail failed: {response.status_code}"
        data = response.json()
        
        visits = data.get("site_visits", [])
        assert len(visits) > 0, "Should have at least one visit"
        print(f"PASS: Case has {len(visits)} visit(s)")
    
    def test_step5_04_complete_visit(self):
        """Step 5.4: Update visit to 'completed'"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        visit_id = TestJourneyRMConversionPipeline.visit_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        if not visit_id:
            pytest.skip("No visit_id from previous test")
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/visits/{visit_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "status": "completed",
                "outcome": "Customer loved the venue",
                "customer_notes": "Great ambiance, good food quality"
            }
        )
        assert response.status_code == 200, f"Update visit failed: {response.status_code}"
        print("PASS: Visit marked as completed")
    
    def test_step5_05_transition_to_site_visit_completed(self):
        """Step 5.5: POST /api/conversion/cases/{lead_id}/stage → site_visit_completed"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "site_visit_completed",
                "reason": "Site visit completed successfully",
                "next_action": "Start negotiation"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition site_visit_planned → site_visit_completed")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 6: RM STARTS NEGOTIATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step6_01_transition_to_negotiation_in_progress(self):
        """Step 6.1: POST /api/conversion/cases/{lead_id}/stage → negotiation_in_progress"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "negotiation_in_progress",
                "reason": "Customer wants to negotiate pricing",
                "next_action": "Negotiate with venue"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition site_visit_completed → negotiation_in_progress")
    
    def test_step6_02_start_negotiation(self):
        """Step 6.2: POST /api/conversion/cases/{lead_id}/negotiation logs negotiation round"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/negotiation",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "venue_name": "Test Venue for Journey 2",
                "status": "started",
                "latest_ask": 910000,
                "latest_offer": 800000,
                "counter_note": "Customer's initial offer"
            }
        )
        assert response.status_code == 200, f"Start negotiation failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "neg_id" in data, "Response should contain neg_id"
        
        TestJourneyRMConversionPipeline.neg_id = data["neg_id"]
        print(f"PASS: Negotiation started - neg_id={TestJourneyRMConversionPipeline.neg_id}")
    
    def test_step6_03_get_negotiations(self):
        """Step 6.3: GET /api/conversion/cases/{lead_id} verifies negotiations list"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get case detail failed: {response.status_code}"
        data = response.json()
        
        negotiations = data.get("negotiations", [])
        assert len(negotiations) > 0, "Should have at least one negotiation"
        print(f"PASS: Case has {len(negotiations)} negotiation(s)")
    
    def test_step6_04_update_negotiation_to_agreed(self):
        """Step 6.4: Update negotiation to 'agreed'"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        neg_id = TestJourneyRMConversionPipeline.neg_id
        venue_id = getattr(TestJourneyRMConversionPipeline, 'test_venue_id', 'venue_test_journey2')
        
        if not neg_id:
            pytest.skip("No neg_id from previous test")
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/negotiation/{neg_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "venue_id": venue_id,
                "status": "agreed",
                "latest_ask": 850000,
                "latest_offer": 850000,
                "counter_note": "Final agreement at 850K"
            }
        )
        assert response.status_code == 200, f"Update negotiation failed: {response.status_code}"
        print("PASS: Negotiation marked as agreed")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 7: COMMERCIAL ACCEPTED
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step7_01_transition_to_commercial_accepted(self):
        """Step 7.1: POST /api/conversion/cases/{lead_id}/stage → commercial_accepted"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "commercial_accepted",
                "reason": "Customer accepted commercial terms",
                "next_action": "Complete booking readiness checks"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition negotiation_in_progress → commercial_accepted")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 8: BOOKING READINESS GATE (6 CHECKS)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step8_01_set_all_booking_readiness_checks(self):
        """Step 8.1: POST /api/conversion/cases/{lead_id}/booking-readiness sets all 6 checks true"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "requirement_confirmed": True,
                "final_venue_selected": True,
                "commercial_terms_agreed": True,
                "customer_contact_confirmed": True,
                "payment_milestone_recorded": True,
                "booking_date_locked": True,
                "notes": "All checks completed for Journey Test #2"
            }
        )
        assert response.status_code == 200, f"Update booking readiness failed: {response.status_code} - {response.text}"
        print("PASS: All 6 booking readiness checks set to true")
    
    def test_step8_02_verify_booking_readiness(self):
        """Step 8.2: GET /api/conversion/cases/{lead_id} verifies booking readiness"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/booking-readiness",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get booking readiness failed: {response.status_code}"
        data = response.json()
        
        assert data.get("passed_count") == 6, f"Expected 6 passed checks, got {data.get('passed_count')}"
        assert data.get("all_ready") == True, "all_ready should be True"
        print("PASS: Booking readiness verified - 6/6 checks passed")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 9: BOOKING CONFIRMATION PENDING AND CONFIRMED
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_step9_01_transition_to_booking_confirmation_pending(self):
        """Step 9.1: POST /api/conversion/cases/{lead_id}/stage → booking_confirmation_pending"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "booking_confirmation_pending",
                "reason": "Awaiting final confirmation from customer",
                "next_action": "Get customer sign-off"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition commercial_accepted → booking_confirmation_pending")
    
    def test_step9_02_transition_to_booking_confirmed(self):
        """Step 9.2: POST /api/conversion/cases/{lead_id}/stage → booking_confirmed"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "booking_confirmed",
                "reason": "Customer confirmed booking"
            }
        )
        assert response.status_code == 200, f"Stage transition failed: {response.status_code} - {response.text}"
        print("PASS: Stage transition booking_confirmation_pending → booking_confirmed")
    
    def test_step9_03_verify_final_stage(self):
        """Step 9.3: Verify stage = 'booking_confirmed'"""
        token = self.get_rm_token()
        lead_id = TestJourneyRMConversionPipeline.lead_id
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get case detail failed: {response.status_code}"
        data = response.json()
        
        assert data.get("stage") == "booking_confirmed", f"Expected stage=booking_confirmed, got {data.get('stage')}"
        assert "confirmed_at" in data, "Should have confirmed_at timestamp"
        print(f"PASS: Final stage verified - booking_confirmed at {data.get('confirmed_at')}")


class TestStageTransitionValidation:
    """Stage Transition Validation Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_rm_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("RM login failed")
    
    def test_invalid_transition_enquiry_to_booking_confirmed(self):
        """Test invalid transition: enquiry_received → booking_confirmed (should fail)"""
        token = self.get_rm_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Create new case
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_InvalidTransition_{timestamp}",
                "customer_email": f"invalid_{timestamp}@test.com",
                "city": "Mumbai"
            }
        )
        assert response.status_code == 200
        lead_id = response.json().get("lead_id")
        
        # Try invalid transition
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={"stage": "booking_confirmed"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid transition, got {response.status_code}"
        print("PASS: Invalid transition enquiry_received → booking_confirmed rejected")
    
    def test_invalid_transition_enquiry_to_commercial_accepted(self):
        """Test invalid transition: enquiry_received → commercial_accepted (should fail)"""
        token = self.get_rm_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Create new case
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_InvalidTransition2_{timestamp}",
                "customer_email": f"invalid2_{timestamp}@test.com",
                "city": "Mumbai"
            }
        )
        assert response.status_code == 200
        lead_id = response.json().get("lead_id")
        
        # Try invalid transition
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={"stage": "commercial_accepted"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid transition, got {response.status_code}"
        print("PASS: Invalid transition enquiry_received → commercial_accepted rejected")


class TestLostReopenCycle:
    """Lost/Reopen Cycle Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_rm_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("RM login failed")
    
    def test_mark_lost_and_reopen(self):
        """Test lost/reopen cycle: mark lost, then reopen to enquiry_received"""
        token = self.get_rm_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Create new case
        response = self.session.post(
            f"{BASE_URL}/api/conversion/intake",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_type": "manual",
                "customer_name": f"TEST_LostReopen_{timestamp}",
                "customer_email": f"lostreopen_{timestamp}@test.com",
                "city": "Bangalore"
            }
        )
        assert response.status_code == 200
        lead_id = response.json().get("lead_id")
        
        # Mark as lost
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "lost",
                "reason": "Customer chose competitor"
            }
        )
        assert response.status_code == 200, f"Mark lost failed: {response.status_code} - {response.text}"
        
        # Verify lost
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.json().get("stage") == "lost"
        print("PASS: Case marked as lost")
        
        # Reopen to enquiry_received
        response = self.session.post(
            f"{BASE_URL}/api/conversion/cases/{lead_id}/stage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "stage": "enquiry_received",
                "reason": "Customer came back"
            }
        )
        assert response.status_code == 200, f"Reopen failed: {response.status_code} - {response.text}"
        
        # Verify reopened
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.json().get("stage") == "enquiry_received"
        print("PASS: Case reopened to enquiry_received")


class TestConversionDashboard:
    """Conversion Dashboard Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_rm_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("RM login failed")
    
    def test_get_conversion_cases(self):
        """GET /api/conversion/cases returns conversion cases"""
        token = self.get_rm_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get cases failed: {response.status_code}"
        data = response.json()
        
        assert "cases" in data, "Response should contain 'cases'"
        assert "total" in data, "Response should contain 'total'"
        
        if data["cases"]:
            case = data["cases"][0]
            # Verify action-first fields
            required_fields = ["lead_id", "customer_name", "stage", "stage_label", "urgency"]
            for field in required_fields:
                assert field in case, f"Case should have '{field}' field"
        
        print(f"PASS: GET /api/conversion/cases returns {data['total']} cases")
    
    def test_get_case_detail(self):
        """GET /api/conversion/cases/{lead_id} returns full lead detail"""
        token = self.get_rm_token()
        
        # Get a case first
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        cases = response.json().get("cases", [])
        
        if not cases:
            pytest.skip("No cases to test detail")
        
        lead_id = cases[0]["lead_id"]
        
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases/{lead_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get case detail failed: {response.status_code}"
        data = response.json()
        
        # Verify full detail fields
        required_fields = ["lead_id", "customer_name", "stage", "shortlist", "quotes", "site_visits", "negotiations", "booking_readiness"]
        for field in required_fields:
            assert field in data, f"Case detail should have '{field}' field"
        
        print(f"PASS: GET /api/conversion/cases/{lead_id} returns full detail")


class TestCommunicationNotes:
    """Communication/Notes Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_rm_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("RM login failed")
    
    def test_log_communication(self):
        """POST /api/leads/{lead_id}/communications logs a communication"""
        token = self.get_rm_token()
        
        # Get a lead first
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        cases = response.json().get("cases", [])
        
        if not cases:
            pytest.skip("No cases to test communication")
        
        lead_id = cases[0]["lead_id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/leads/{lead_id}/communications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "channel": "call",
                "direction": "outbound",
                "summary": "Discussed venue options with customer",
                "duration_minutes": 15
            }
        )
        assert response.status_code == 200, f"Log communication failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "comm_id" in data, "Response should contain comm_id"
        print(f"PASS: Communication logged - comm_id={data.get('comm_id')}")
    
    def test_get_communications(self):
        """GET /api/leads/{lead_id}/communications returns communications"""
        token = self.get_rm_token()
        
        # Get a lead first
        response = self.session.get(
            f"{BASE_URL}/api/conversion/cases",
            headers={"Authorization": f"Bearer {token}"}
        )
        cases = response.json().get("cases", [])
        
        if not cases:
            pytest.skip("No cases to test communications")
        
        lead_id = cases[0]["lead_id"]
        
        response = self.session.get(
            f"{BASE_URL}/api/leads/{lead_id}/communications",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get communications failed: {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Communications should be a list"
        print(f"PASS: GET /api/leads/{lead_id}/communications returns {len(data)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
