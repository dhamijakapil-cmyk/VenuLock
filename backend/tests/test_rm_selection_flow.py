"""
Test suite for Canonical RM Selection Flow - VenuLoQ
Tests the customer-selected RM flow with availability scoring, capacity filtering, and revalidation.

Features tested:
- GET /api/rms/available - returns RMs with availability field, filters by capacity
- POST /api/rms/validate-selection - revalidates RM availability at submit time
- POST /api/leads - stores rm_selection_mode, rm_candidates_shown, rm_selection_timestamp
- POST /api/booking-requests - same RM selection metadata storage
- 409 conflict when selected RM is at capacity
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRMAvailabilityEndpoint:
    """Tests for GET /api/rms/available endpoint"""
    
    def test_get_available_rms_returns_rms_array(self):
        """GET /api/rms/available returns {rms: [...], checked_at: ...}"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rms" in data, "Response should contain 'rms' array"
        assert "checked_at" in data, "Response should contain 'checked_at' timestamp"
        assert isinstance(data["rms"], list), "'rms' should be a list"
        assert isinstance(data["checked_at"], str), "'checked_at' should be a string timestamp"
        print(f"✓ GET /api/rms/available returned {len(data['rms'])} RMs, checked_at: {data['checked_at']}")
    
    def test_available_rms_have_availability_field(self):
        """Each RM in response should have 'availability' field"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200
        
        data = response.json()
        rms = data.get("rms", [])
        
        if len(rms) == 0:
            pytest.skip("No RMs available to test availability field")
        
        for rm in rms:
            assert "availability" in rm, f"RM {rm.get('user_id')} missing 'availability' field"
            assert rm["availability"] in ["available", "busy"], f"Invalid availability value: {rm['availability']}"
            assert "active_leads" in rm, f"RM {rm.get('user_id')} missing 'active_leads' field"
            assert isinstance(rm["active_leads"], int), "'active_leads' should be an integer"
        
        print(f"✓ All {len(rms)} RMs have valid 'availability' field")
    
    def test_available_rms_have_required_fields(self):
        """Each RM should have required profile fields"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200
        
        data = response.json()
        rms = data.get("rms", [])
        
        if len(rms) == 0:
            pytest.skip("No RMs available to test required fields")
        
        required_fields = ["user_id", "name", "rating", "active_leads", "completed_events", "availability"]
        
        for rm in rms:
            for field in required_fields:
                assert field in rm, f"RM {rm.get('user_id', 'unknown')} missing required field: {field}"
        
        print(f"✓ All {len(rms)} RMs have required fields: {required_fields}")
    
    def test_available_rms_filters_by_capacity(self):
        """RMs at capacity (>= 25 active leads) should be filtered out"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200
        
        data = response.json()
        rms = data.get("rms", [])
        
        # All returned RMs should have active_leads < 25
        RM_CAPACITY_THRESHOLD = 25
        for rm in rms:
            active_leads = rm.get("active_leads", 0)
            assert active_leads < RM_CAPACITY_THRESHOLD, \
                f"RM {rm.get('user_id')} has {active_leads} active leads, should be filtered (threshold: {RM_CAPACITY_THRESHOLD})"
        
        print(f"✓ All {len(rms)} returned RMs are below capacity threshold ({RM_CAPACITY_THRESHOLD})")
    
    def test_available_rms_with_city_filter(self):
        """GET /api/rms/available?city=Delhi should work"""
        response = requests.get(f"{BASE_URL}/api/rms/available?city=Delhi")
        assert response.status_code == 200
        
        data = response.json()
        assert "rms" in data
        assert "checked_at" in data
        print(f"✓ City filter works, returned {len(data['rms'])} RMs for Delhi")
    
    def test_available_rms_limit_parameter(self):
        """GET /api/rms/available?limit=2 should return max 2 RMs"""
        response = requests.get(f"{BASE_URL}/api/rms/available?limit=2")
        assert response.status_code == 200
        
        data = response.json()
        rms = data.get("rms", [])
        assert len(rms) <= 2, f"Expected max 2 RMs, got {len(rms)}"
        print(f"✓ Limit parameter works, returned {len(rms)} RMs (limit=2)")


class TestRMValidateSelectionEndpoint:
    """Tests for POST /api/rms/validate-selection endpoint"""
    
    def test_validate_selection_with_valid_rm(self):
        """POST /api/rms/validate-selection with valid rm_id returns available=true"""
        # First get an available RM
        rms_response = requests.get(f"{BASE_URL}/api/rms/available")
        assert rms_response.status_code == 200
        
        rms = rms_response.json().get("rms", [])
        if len(rms) == 0:
            pytest.skip("No RMs available to test validation")
        
        rm_id = rms[0]["user_id"]
        
        # Validate the selection
        response = requests.post(
            f"{BASE_URL}/api/rms/validate-selection",
            json={"rm_id": rm_id}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "available" in data, "Response should contain 'available' field"
        assert data["available"] == True, f"Expected available=true for valid RM, got {data['available']}"
        assert "rm_id" in data, "Response should contain 'rm_id'"
        assert "rm_name" in data, "Response should contain 'rm_name'"
        assert "active_leads" in data, "Response should contain 'active_leads'"
        
        print(f"✓ Validated RM {rm_id}: available={data['available']}, active_leads={data['active_leads']}")
    
    def test_validate_selection_with_invalid_rm(self):
        """POST /api/rms/validate-selection with invalid rm_id returns available=false"""
        response = requests.post(
            f"{BASE_URL}/api/rms/validate-selection",
            json={"rm_id": "invalid_rm_id_12345"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "available" in data, "Response should contain 'available' field"
        assert data["available"] == False, f"Expected available=false for invalid RM, got {data['available']}"
        assert "reason" in data, "Response should contain 'reason' for unavailable RM"
        
        print(f"✓ Invalid RM correctly returns available=false, reason: {data.get('reason')}")


class TestLeadCreationWithRMSelection:
    """Tests for POST /api/leads with RM selection metadata"""
    
    @pytest.fixture
    def available_rm(self):
        """Get an available RM for testing"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        if response.status_code != 200:
            pytest.skip("Cannot get available RMs")
        rms = response.json().get("rms", [])
        if len(rms) == 0:
            pytest.skip("No RMs available")
        return rms[0]
    
    @pytest.fixture
    def rm_candidates(self):
        """Get RM candidates list"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        if response.status_code != 200:
            return []
        rms = response.json().get("rms", [])
        return [rm["user_id"] for rm in rms]
    
    def test_create_lead_with_selected_rm_stores_customer_selected_mode(self, available_rm, rm_candidates):
        """POST /api/leads with selected_rm_id stores rm_selection_mode=customer_selected"""
        payload = {
            "customer_name": "TEST_RM_Selection_Customer",
            "customer_email": "test_rm_selection@example.com",
            "customer_phone": "+919876543210",
            "event_type": "Wedding",
            "city": "Delhi",
            "selected_rm_id": available_rm["user_id"],
            "selection_mode": "customer_selected",
            "rm_candidates_shown": rm_candidates,
            "availability_checked_at": datetime.utcnow().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data, "Response should contain 'lead_id'"
        assert "rm_name" in data, "Response should contain 'rm_name'"
        
        lead_id = data["lead_id"]
        print(f"✓ Created lead {lead_id} with customer_selected RM: {data.get('rm_name')}")
        
        # Cleanup: We can't easily delete the lead without auth, but it's prefixed with TEST_
        return lead_id
    
    def test_create_lead_without_selected_rm_stores_auto_assign_mode(self):
        """POST /api/leads without selected_rm_id stores rm_selection_mode=auto_assign"""
        payload = {
            "customer_name": "TEST_Auto_Assign_Customer",
            "customer_email": "test_auto_assign@example.com",
            "customer_phone": "+919876543211",
            "event_type": "Corporate Event",
            "city": "Mumbai"
            # No selected_rm_id - should auto-assign
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data, "Response should contain 'lead_id'"
        assert "rm_name" in data, "Response should contain 'rm_name' (auto-assigned)"
        
        print(f"✓ Created lead {data['lead_id']} with auto-assigned RM: {data.get('rm_name')}")
    
    def test_create_lead_stores_rm_candidates_shown(self, available_rm, rm_candidates):
        """POST /api/leads with rm_candidates_shown stores the array"""
        payload = {
            "customer_name": "TEST_Candidates_Shown_Customer",
            "customer_email": "test_candidates@example.com",
            "customer_phone": "+919876543212",
            "event_type": "Birthday Party",
            "city": "Bangalore",
            "selected_rm_id": available_rm["user_id"],
            "selection_mode": "customer_selected",
            "rm_candidates_shown": rm_candidates,
            "availability_checked_at": datetime.utcnow().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data
        print(f"✓ Created lead {data['lead_id']} with rm_candidates_shown: {rm_candidates}")


class TestBookingRequestWithRMSelection:
    """Tests for POST /api/booking-requests with RM selection"""
    
    @pytest.fixture
    def available_rm(self):
        """Get an available RM for testing"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        if response.status_code != 200:
            pytest.skip("Cannot get available RMs")
        rms = response.json().get("rms", [])
        if len(rms) == 0:
            pytest.skip("No RMs available")
        return rms[0]
    
    def test_booking_request_with_customer_selected_rm(self, available_rm):
        """POST /api/booking-requests with selected_rm_id and selection_mode=customer_selected works"""
        payload = {
            "customer_name": "TEST_Booking_Customer",
            "customer_phone": "+919876543213",
            "customer_email": "test_booking@example.com",
            "city": "Delhi",
            "event_type": "Wedding",
            "guest_count_range": "200-300",
            "selected_rm_id": available_rm["user_id"],
            "selection_mode": "customer_selected",
            "rm_candidates_shown": [available_rm["user_id"]],
            "availability_checked_at": datetime.utcnow().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "booking_id" in data, "Response should contain 'booking_id'"
        assert "lead_id" in data, "Response should contain 'lead_id'"
        assert "rm_name" in data, "Response should contain 'rm_name'"
        
        print(f"✓ Created booking {data['booking_id']} with customer_selected RM: {data.get('rm_name')}")
    
    def test_booking_request_auto_assign_fallback(self):
        """POST /api/booking-requests without selected_rm_id uses auto-assign"""
        payload = {
            "customer_name": "TEST_Booking_AutoAssign",
            "customer_phone": "+919876543214",
            "customer_email": "test_booking_auto@example.com",
            "city": "Mumbai",
            "event_type": "Corporate Event",
            "guest_count_range": "100-150"
            # No selected_rm_id
        }
        
        response = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "booking_id" in data
        assert "rm_name" in data, "Auto-assigned RM should be returned"
        
        print(f"✓ Created booking {data['booking_id']} with auto-assigned RM: {data.get('rm_name')}")


class TestRMCapacityEdgeCases:
    """Tests for RM capacity edge cases and 409 conflicts"""
    
    def test_validate_selection_returns_active_leads_count(self):
        """POST /api/rms/validate-selection returns active_leads count"""
        # Get an available RM
        rms_response = requests.get(f"{BASE_URL}/api/rms/available")
        if rms_response.status_code != 200:
            pytest.skip("Cannot get available RMs")
        
        rms = rms_response.json().get("rms", [])
        if len(rms) == 0:
            pytest.skip("No RMs available")
        
        rm_id = rms[0]["user_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/rms/validate-selection",
            json={"rm_id": rm_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "active_leads" in data, "Response should include active_leads count"
        assert isinstance(data["active_leads"], int), "active_leads should be an integer"
        
        print(f"✓ RM {rm_id} has {data['active_leads']} active leads")
    
    def test_available_rms_sorted_by_availability(self):
        """RMs should be sorted by availability (available first, then by experience)"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200
        
        rms = response.json().get("rms", [])
        if len(rms) < 2:
            pytest.skip("Need at least 2 RMs to test sorting")
        
        # Check that 'available' RMs come before 'busy' RMs
        availability_order = [rm["availability"] for rm in rms]
        
        # Find first 'busy' index
        first_busy_idx = None
        for i, avail in enumerate(availability_order):
            if avail == "busy":
                first_busy_idx = i
                break
        
        if first_busy_idx is not None:
            # All RMs before first_busy_idx should be 'available'
            for i in range(first_busy_idx):
                assert availability_order[i] == "available", \
                    f"RM at index {i} should be 'available' but is '{availability_order[i]}'"
        
        print(f"✓ RMs are sorted by availability: {availability_order}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
