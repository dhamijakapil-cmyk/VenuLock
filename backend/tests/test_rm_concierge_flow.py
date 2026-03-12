"""
Tests for RM selection and Concierge Booking Flow (P0 Feature):
- GET /api/rms/available - Returns 3 RM profiles
- POST /api/booking-requests with selected_rm_id
- Landing page venue search navigation (via city param)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRMAvailable:
    """Tests for the GET /api/rms/available endpoint"""

    def test_rms_available_returns_list(self):
        """GET /api/rms/available should return a list"""
        res = requests.get(f"{BASE_URL}/api/rms/available")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"RMs available returned {len(data)} RMs")

    def test_rms_available_returns_up_to_3(self):
        """GET /api/rms/available returns at most 3 RMs by default"""
        res = requests.get(f"{BASE_URL}/api/rms/available")
        assert res.status_code == 200
        data = res.json()
        assert len(data) <= 3, f"Expected at most 3 RMs, got {len(data)}"
        print(f"RMs count: {len(data)}")

    def test_rms_available_fields(self):
        """Each RM in GET /api/rms/available should have required fields"""
        res = requests.get(f"{BASE_URL}/api/rms/available")
        assert res.status_code == 200
        data = res.json()
        if len(data) == 0:
            pytest.skip("No RMs returned - DB may not have RM users seeded")
        
        required_fields = ["user_id", "name", "rating", "specialties"]
        for rm in data:
            for field in required_fields:
                assert field in rm, f"RM missing field '{field}': {rm}"
            assert isinstance(rm["name"], str) and len(rm["name"]) > 0, "RM name should be non-empty string"
            assert isinstance(rm["rating"], (int, float)), f"RM rating should be a number: {rm.get('rating')}"
            print(f"RM: {rm['name']}, rating: {rm['rating']}, specialties: {rm.get('specialties')}")

    def test_rms_available_no_sensitive_data(self):
        """GET /api/rms/available should NOT return password_hash or _id"""
        res = requests.get(f"{BASE_URL}/api/rms/available")
        assert res.status_code == 200
        data = res.json()
        for rm in data:
            assert "password_hash" not in rm, "RM should not expose password_hash"
            assert "_id" not in rm, "RM should not expose MongoDB _id"

    def test_rms_available_with_city_filter(self):
        """GET /api/rms/available?city=Mumbai - city filter should work"""
        res = requests.get(f"{BASE_URL}/api/rms/available?city=Mumbai")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"RMs for Mumbai: {len(data)}")

    def test_rms_available_limit_param(self):
        """GET /api/rms/available?limit=2 should respect limit"""
        res = requests.get(f"{BASE_URL}/api/rms/available?limit=2")
        assert res.status_code == 200
        data = res.json()
        assert len(data) <= 2, f"Expected at most 2 RMs with limit=2, got {len(data)}"


class TestBookingRequestWithRM:
    """Tests for booking request with selected_rm_id"""

    def _get_verified_phone(self):
        """Helper: create & verify a fresh phone number"""
        test_phone = f"98765{uuid.uuid4().hex[:5]}"
        send_res = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": test_phone})
        assert send_res.status_code == 200, f"OTP send failed: {send_res.text}"
        otp = send_res.json()["debug_otp"]
        verify_res = requests.post(f"{BASE_URL}/api/otp/verify", json={"phone": test_phone, "otp": otp})
        assert verify_res.status_code == 200, f"OTP verify failed: {verify_res.text}"
        return test_phone

    def test_booking_with_selected_rm_id(self):
        """POST /api/booking-requests should accept selected_rm_id and use it"""
        # Get an RM first
        rms_res = requests.get(f"{BASE_URL}/api/rms/available")
        assert rms_res.status_code == 200
        rms = rms_res.json()
        
        if not rms:
            pytest.skip("No RMs available to test RM selection")

        rm = rms[0]
        rm_id = rm["user_id"]
        rm_name = rm["name"]

        test_phone = self._get_verified_phone()
        
        payload = {
            "customer_name": "TEST_RM_Selection_User",
            "customer_phone": test_phone,
            "customer_email": "test_rm_select@example.com",
            "city": "Mumbai",
            "event_type": "wedding",
            "guest_count": 100,
            "notes": "Testing RM selection",
            "selected_rm_id": rm_id,
        }
        
        res = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert "booking_id" in data, "Should return booking_id"
        assert "rm_name" in data, "Should return rm_name"
        assert data["rm_name"] == rm_name, f"Expected rm_name={rm_name}, got {data['rm_name']}"
        print(f"Booking with selected RM created: {data['booking_id']}, RM: {data['rm_name']}")

    def test_booking_without_rm_id_auto_assigns(self):
        """POST /api/booking-requests without selected_rm_id should auto-assign RM"""
        test_phone = self._get_verified_phone()
        
        payload = {
            "customer_name": "TEST_AutoAssign_User",
            "customer_phone": test_phone,
            "customer_email": "test_autoassign@example.com",
            "city": "Delhi NCR",
            "event_type": "corporate",
            "guest_count": 50,
            "notes": "Testing auto RM assignment",
        }
        
        res = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        assert "booking_id" in data
        assert data["booking_id"].startswith("BMV-DEL-"), f"Expected DEL code, got: {data['booking_id']}"
        print(f"Auto-assigned booking: {data['booking_id']}, RM: {data.get('rm_name')}")

    def test_booking_with_invalid_rm_id_falls_back(self):
        """POST /api/booking-requests with non-existent selected_rm_id should fall back to auto-assign"""
        test_phone = self._get_verified_phone()
        
        payload = {
            "customer_name": "TEST_InvalidRM_User",
            "customer_phone": test_phone,
            "customer_email": "test_invalid_rm@example.com",
            "city": "Bangalore",
            "event_type": "wedding",
            "guest_count": 150,
            "notes": "Testing invalid RM fallback",
            "selected_rm_id": "non_existent_rm_id_12345",
        }
        
        res = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        # Should succeed with fallback, not 400/500
        assert res.status_code == 200, f"Expected 200 for invalid RM (fallback), got {res.status_code}: {res.text}"
        data = res.json()
        assert "booking_id" in data
        print(f"Invalid RM fallback booking created: {data['booking_id']}, RM: {data.get('rm_name')}")

    def test_booking_unverified_phone_rejected(self):
        """POST /api/booking-requests with unverified phone should return 403"""
        payload = {
            "customer_name": "TEST_Unverified",
            "customer_phone": "50505050505",
            "customer_email": "test_unverified@example.com",
            "city": "Mumbai",
            "event_type": "wedding",
            "guest_count": 100,
        }
        res = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert res.status_code == 403, f"Expected 403 for unverified phone, got {res.status_code}: {res.text}"
        print(f"Unverified phone correctly rejected: {res.json()}")

    def test_booking_appears_in_admin_leads(self):
        """Booking created with RM selection should appear in admin leads"""
        test_phone = self._get_verified_phone()
        
        payload = {
            "customer_name": "TEST_Admin_Visibility",
            "customer_phone": test_phone,
            "customer_email": "test_admin_vis@example.com",
            "city": "Mumbai",
            "event_type": "wedding",
            "notes": "Admin visibility test",
        }
        
        booking_res = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert booking_res.status_code == 200
        booking_id = booking_res.json()["booking_id"]
        
        # Check in admin leads
        admin_creds = {"email": "admin@venuloq.in", "password": "admin123"}
        auth_res = requests.post(f"{BASE_URL}/api/auth/login", json=admin_creds)
        assert auth_res.status_code == 200, f"Admin login failed: {auth_res.text}"
        token = auth_res.json()["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        leads_res = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert leads_res.status_code == 200
        leads = leads_res.json()
        
        # Find our booking in leads
        lead_ids = [l.get("booking_id") for l in leads.get("leads", leads if isinstance(leads, list) else [])]
        assert booking_id in lead_ids, f"Booking {booking_id} not found in admin leads: {lead_ids[:5]}"
        print(f"Booking {booking_id} visible in admin leads: PASS")


class TestVenueSearchNavigation:
    """Tests for city-based venue search navigation"""

    def test_venues_search_by_city(self):
        """GET /api/venues?city=Mumbai should return venues for Mumbai"""
        res = requests.get(f"{BASE_URL}/api/venues?city=Mumbai")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        # Could be list or dict with venues key
        venues = data if isinstance(data, list) else data.get("venues", [])
        assert isinstance(venues, list)
        print(f"Venues for Mumbai: {len(venues)}")

    def test_venues_cities_endpoint(self):
        """GET /api/venues/cities should return list of cities"""
        res = requests.get(f"{BASE_URL}/api/venues/cities")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Cities returned: {[c.get('city') for c in data[:5]]}")
