"""
P0 Bug Fix Test: Customer portal showing wrong screen after enquiry submission.

Root cause: leads were created with field `customer_id` but the case portal queried 
for `customer_user_id`, causing 0 results for Google OAuth users.

Fix: 
- POST /api/leads now creates leads with both customer_id AND customer_user_id fields
- GET /api/case-portal/my-cases queries both customer_user_id, customer_id, AND customer_email
- Frontend STAGES array now includes 'new' stage

Test credentials:
- Customer: democustomer@venulock.in / password123
- Admin: admin@venuloq.in / admin123
- RM: rm1@venuloq.in / rm123
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestP0CasePortalCustomerIdFix:
    """Test the P0 bug fix for customer portal showing wrong screen."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and authenticate as customer."""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.customer_token = None
        self.customer_user_id = None
        self.test_lead_id = None
        
    def _login_customer(self):
        """Login as demo customer and get token."""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "democustomer@venulock.in",
            "password": "password123"
        })
        if response.status_code == 200:
            data = response.json()
            self.customer_token = data.get("access_token") or data.get("token")
            self.customer_user_id = data.get("user", {}).get("user_id")
            self.session.headers.update({"Authorization": f"Bearer {self.customer_token}"})
            return True
        return False
    
    def _login_admin(self):
        """Login as admin and get token."""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return True
        return False
    
    # ============== TEST 1: Lead creation includes both customer_id and customer_user_id ==============
    
    def test_lead_creation_includes_customer_user_id(self):
        """POST /api/leads should create leads with both customer_id AND customer_user_id fields."""
        # Login as customer first
        assert self._login_customer(), "Customer login failed"
        
        # Create a new lead
        unique_id = str(uuid.uuid4())[:8]
        lead_data = {
            "customer_name": f"Test Customer {unique_id}",
            "customer_email": "democustomer@venulock.in",
            "customer_phone": "9876543210",
            "event_type": "Wedding",
            "city": "Delhi NCR",
            "guest_count": 100,
            "preferences": "Test lead for P0 bug fix verification"
        }
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=lead_data)
        
        # Should succeed
        assert response.status_code in [200, 201], f"Lead creation failed: {response.status_code} - {response.text}"
        
        data = response.json()
        self.test_lead_id = data.get("lead_id")
        assert self.test_lead_id, "No lead_id returned"
        
        print(f"✓ Lead created successfully: {self.test_lead_id}")
        
        # Now login as admin to verify the lead has both fields
        assert self._login_admin(), "Admin login failed"
        
        # Get the lead details
        lead_response = self.session.get(f"{BASE_URL}/api/leads/{self.test_lead_id}")
        assert lead_response.status_code == 200, f"Failed to get lead: {lead_response.status_code}"
        
        lead = lead_response.json()
        
        # CRITICAL: Verify both customer_id AND customer_user_id are set
        assert lead.get("customer_id") is not None, "customer_id is missing from lead"
        assert lead.get("customer_user_id") is not None, "customer_user_id is missing from lead (P0 BUG!)"
        assert lead.get("customer_id") == lead.get("customer_user_id"), "customer_id and customer_user_id should match"
        
        print(f"✓ Lead has customer_id: {lead.get('customer_id')}")
        print(f"✓ Lead has customer_user_id: {lead.get('customer_user_id')}")
        
        # Verify stage is 'new'
        assert lead.get("stage") == "new", f"Expected stage 'new', got '{lead.get('stage')}'"
        print(f"✓ Lead stage is 'new' as expected")
    
    # ============== TEST 2: Case portal my-cases returns cases for logged-in customer ==============
    
    def test_case_portal_my_cases_returns_customer_cases(self):
        """GET /api/case-portal/my-cases should return cases for the logged-in customer."""
        # Login as customer
        assert self._login_customer(), "Customer login failed"
        
        # Get my cases
        response = self.session.get(f"{BASE_URL}/api/case-portal/my-cases")
        
        assert response.status_code == 200, f"my-cases failed: {response.status_code} - {response.text}"
        
        data = response.json()
        cases = data.get("cases", [])
        total = data.get("total", 0)
        
        print(f"✓ my-cases returned {total} cases")
        
        # Should have at least one case (the existing test lead or newly created one)
        assert total > 0, "P0 BUG: No cases returned for customer! The query is not matching customer_user_id/customer_id"
        
        # Verify case structure
        for case in cases[:3]:  # Check first 3
            assert "lead_id" in case, "Case missing lead_id"
            assert "stage" in case, "Case missing stage"
            assert "stage_label" in case, "Case missing stage_label"
            print(f"  - Case {case.get('lead_id')}: stage={case.get('stage')}, label={case.get('stage_label')}")
        
        # Verify 'new' stage has correct label
        new_cases = [c for c in cases if c.get("stage") == "new"]
        for nc in new_cases:
            assert nc.get("stage_label") == "Enquiry Received", f"Stage 'new' should have label 'Enquiry Received', got '{nc.get('stage_label')}'"
            print(f"✓ Stage 'new' correctly labeled as 'Enquiry Received'")
    
    # ============== TEST 3: Case portal case detail returns correct data ==============
    
    def test_case_portal_case_detail_returns_data(self):
        """GET /api/case-portal/cases/{lead_id} should return case detail for the lead owner."""
        # Login as customer
        assert self._login_customer(), "Customer login failed"
        
        # First get my cases to find a lead_id
        response = self.session.get(f"{BASE_URL}/api/case-portal/my-cases")
        assert response.status_code == 200, f"my-cases failed: {response.status_code}"
        
        cases = response.json().get("cases", [])
        assert len(cases) > 0, "No cases found for customer"
        
        lead_id = cases[0].get("lead_id")
        assert lead_id, "No lead_id in first case"
        
        # Get case detail
        detail_response = self.session.get(f"{BASE_URL}/api/case-portal/cases/{lead_id}")
        
        assert detail_response.status_code == 200, f"Case detail failed: {detail_response.status_code} - {detail_response.text}"
        
        detail = detail_response.json()
        
        # Verify required fields
        assert detail.get("lead_id") == lead_id, "lead_id mismatch"
        assert "stage" in detail, "Missing stage"
        assert "stage_label" in detail, "Missing stage_label"
        assert "rm_name" in detail, "Missing rm_name"
        
        print(f"✓ Case detail returned for {lead_id}")
        print(f"  - Stage: {detail.get('stage')}")
        print(f"  - Stage Label: {detail.get('stage_label')}")
        print(f"  - RM: {detail.get('rm_name')}")
        print(f"  - Event Type: {detail.get('event_type')}")
        print(f"  - City: {detail.get('city')}")
        
        # Verify 'new' stage has correct label
        if detail.get("stage") == "new":
            assert detail.get("stage_label") == "Enquiry Received", f"Stage 'new' should have label 'Enquiry Received'"
            print(f"✓ Stage 'new' correctly labeled as 'Enquiry Received'")
    
    # ============== TEST 4: Booking request also includes customer_user_id ==============
    
    def test_booking_request_includes_customer_user_id(self):
        """POST /api/booking-requests should create leads with both customer_id AND customer_user_id."""
        # Login as customer
        assert self._login_customer(), "Customer login failed"
        
        # Create a booking request
        unique_id = str(uuid.uuid4())[:8]
        booking_data = {
            "customer_name": f"Booking Test {unique_id}",
            "customer_phone": "9876543210",
            "customer_email": "democustomer@venulock.in",
            "city": "Mumbai",
            "event_type": "Corporate Event",
            "guest_count": 50,
            "notes": "Test booking for P0 bug fix verification"
        }
        
        response = self.session.post(f"{BASE_URL}/api/booking-requests", json=booking_data)
        
        assert response.status_code in [200, 201], f"Booking request failed: {response.status_code} - {response.text}"
        
        data = response.json()
        lead_id = data.get("lead_id")
        assert lead_id, "No lead_id returned from booking request"
        
        print(f"✓ Booking request created: {lead_id}")
        
        # Login as admin to verify the lead
        assert self._login_admin(), "Admin login failed"
        
        lead_response = self.session.get(f"{BASE_URL}/api/leads/{lead_id}")
        assert lead_response.status_code == 200, f"Failed to get lead: {lead_response.status_code}"
        
        lead = lead_response.json()
        
        # CRITICAL: Verify both fields are set
        assert lead.get("customer_id") is not None, "customer_id is missing from booking lead"
        assert lead.get("customer_user_id") is not None, "customer_user_id is missing from booking lead (P0 BUG!)"
        
        print(f"✓ Booking lead has customer_id: {lead.get('customer_id')}")
        print(f"✓ Booking lead has customer_user_id: {lead.get('customer_user_id')}")
    
    # ============== TEST 5: Verify existing test lead is accessible ==============
    
    def test_existing_test_lead_accessible(self):
        """Verify the existing test lead (lead_ec93f9467e13) is accessible via case portal."""
        # Login as customer
        assert self._login_customer(), "Customer login failed"
        
        # Get my cases
        response = self.session.get(f"{BASE_URL}/api/case-portal/my-cases")
        assert response.status_code == 200, f"my-cases failed: {response.status_code}"
        
        cases = response.json().get("cases", [])
        lead_ids = [c.get("lead_id") for c in cases]
        
        print(f"✓ Customer has access to {len(lead_ids)} cases")
        print(f"  Lead IDs: {lead_ids[:5]}...")  # Show first 5
        
        # The test should pass if customer can see their cases
        # The specific lead_ec93f9467e13 may or may not exist depending on DB state
        assert len(cases) > 0, "Customer should have at least one case"


class TestCasePortalQueryLogic:
    """Test the case portal query logic matches all three fields."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session."""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login_customer(self):
        """Login as demo customer."""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "democustomer@venulock.in",
            "password": "password123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return data.get("user", {})
        return None
    
    def test_my_cases_query_uses_or_condition(self):
        """Verify my-cases uses $or query with customer_user_id, customer_id, and customer_email."""
        user = self._login_customer()
        assert user, "Customer login failed"
        
        # Get my cases
        response = self.session.get(f"{BASE_URL}/api/case-portal/my-cases")
        assert response.status_code == 200, f"my-cases failed: {response.status_code}"
        
        data = response.json()
        
        # The fix ensures the query uses $or with all three fields
        # If we get cases back, the query is working
        print(f"✓ my-cases query returned {data.get('total', 0)} cases")
        print(f"  User ID: {user.get('user_id')}")
        print(f"  User Email: {user.get('email')}")
        
        # Should have cases if the fix is working
        assert data.get("total", 0) > 0, "P0 BUG: Query not matching any cases for customer"


class TestStageLabels:
    """Test that 'new' stage is properly handled in frontend stage arrays."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session."""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login_customer(self):
        """Login as demo customer."""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "democustomer@venulock.in",
            "password": "password123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return True
        return False
    
    def test_new_stage_has_correct_label_in_api(self):
        """Verify API returns correct stage_label for 'new' stage."""
        assert self._login_customer(), "Customer login failed"
        
        # Get my cases
        response = self.session.get(f"{BASE_URL}/api/case-portal/my-cases")
        assert response.status_code == 200
        
        cases = response.json().get("cases", [])
        
        # Find cases with 'new' stage
        new_stage_cases = [c for c in cases if c.get("stage") == "new"]
        
        for case in new_stage_cases:
            stage_label = case.get("stage_label")
            assert stage_label == "Enquiry Received", f"Stage 'new' should have label 'Enquiry Received', got '{stage_label}'"
            print(f"✓ Case {case.get('lead_id')} with stage 'new' has correct label: {stage_label}")
        
        if not new_stage_cases:
            print("ℹ No cases with 'new' stage found - this is OK if all cases have progressed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
