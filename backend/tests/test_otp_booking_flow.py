"""
Test OTP-gated booking request flow for BookMyVenue.
Tests: OTP send/verify, booking-requests creation with BMV-format IDs.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOTPFlow:
    """OTP send and verify endpoint tests"""
    
    def test_otp_send_success(self):
        """Test OTP send returns success and debug_otp"""
        test_phone = f"99999{uuid.uuid4().hex[:5]}"
        response = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": test_phone})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["message"] == "OTP sent successfully"
        assert "debug_otp" in data
        assert len(data["debug_otp"]) == 6  # OTP is 6 digits
        print(f"OTP send success: {data}")
    
    def test_otp_send_invalid_phone(self):
        """Test OTP send with invalid phone returns 400"""
        response = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": "123"})
        
        assert response.status_code == 400, f"Expected 400 for short phone, got {response.status_code}"
        print(f"OTP invalid phone correctly rejected: {response.json()}")
    
    def test_otp_verify_success(self):
        """Test OTP verify with correct OTP returns verified=true"""
        # First send OTP
        test_phone = f"88888{uuid.uuid4().hex[:5]}"
        send_res = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": test_phone})
        assert send_res.status_code == 200
        debug_otp = send_res.json()["debug_otp"]
        
        # Verify OTP
        verify_res = requests.post(f"{BASE_URL}/api/otp/verify", json={"phone": test_phone, "otp": debug_otp})
        
        assert verify_res.status_code == 200, f"Expected 200, got {verify_res.status_code}: {verify_res.text}"
        data = verify_res.json()
        assert data["verified"] == True
        assert "message" in data
        print(f"OTP verify success: {data}")
    
    def test_otp_verify_invalid_otp(self):
        """Test OTP verify with wrong OTP returns 400"""
        # First send OTP
        test_phone = f"77777{uuid.uuid4().hex[:5]}"
        send_res = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": test_phone})
        assert send_res.status_code == 200
        
        # Verify with wrong OTP
        verify_res = requests.post(f"{BASE_URL}/api/otp/verify", json={"phone": test_phone, "otp": "000000"})
        
        assert verify_res.status_code == 400, f"Expected 400 for wrong OTP, got {verify_res.status_code}"
        print(f"Wrong OTP correctly rejected: {verify_res.json()}")
    
    def test_otp_verify_no_otp_sent(self):
        """Test OTP verify without sending OTP first returns 400"""
        # Try to verify for a phone that never sent OTP
        test_phone = f"66666{uuid.uuid4().hex[:5]}"
        verify_res = requests.post(f"{BASE_URL}/api/otp/verify", json={"phone": test_phone, "otp": "123456"})
        
        assert verify_res.status_code == 400, f"Expected 400, got {verify_res.status_code}"
        print(f"No OTP sent correctly rejected: {verify_res.json()}")


class TestBookingRequests:
    """Booking request creation tests"""
    
    def test_booking_request_with_verified_phone(self):
        """Test booking request creates lead with BMV-format ID when phone is verified"""
        # First complete OTP flow
        test_phone = f"55555{uuid.uuid4().hex[:5]}"
        send_res = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": test_phone})
        assert send_res.status_code == 200
        debug_otp = send_res.json()["debug_otp"]
        
        verify_res = requests.post(f"{BASE_URL}/api/otp/verify", json={"phone": test_phone, "otp": debug_otp})
        assert verify_res.status_code == 200
        
        # Create booking request
        booking_payload = {
            "customer_name": "Test Booking User",
            "customer_phone": test_phone,
            "customer_email": "testbooking@example.com",
            "city": "Delhi NCR",
            "event_type": "wedding",
            "guest_count": 200,
            "notes": "Test booking from pytest"
        }
        
        booking_res = requests.post(f"{BASE_URL}/api/booking-requests", json=booking_payload)
        
        assert booking_res.status_code == 200, f"Expected 200, got {booking_res.status_code}: {booking_res.text}"
        data = booking_res.json()
        
        # Verify response structure
        assert "booking_id" in data
        assert data["booking_id"].startswith("BMV-DEL-"), f"Expected BMV-DEL-xxx format, got {data['booking_id']}"
        assert "lead_id" in data
        assert "rm_name" in data
        assert data["status"] == "new"
        print(f"Booking created: {data}")
    
    def test_booking_request_without_verified_phone(self):
        """Test booking request fails when phone is not verified"""
        test_phone = f"44444{uuid.uuid4().hex[:5]}"
        
        booking_payload = {
            "customer_name": "Test Unverified User",
            "customer_phone": test_phone,
            "customer_email": "unverified@example.com",
            "city": "Mumbai",
            "event_type": "birthday",
            "guest_count": 50,
        }
        
        booking_res = requests.post(f"{BASE_URL}/api/booking-requests", json=booking_payload)
        
        assert booking_res.status_code == 403, f"Expected 403, got {booking_res.status_code}: {booking_res.text}"
        data = booking_res.json()
        assert "Phone not verified" in data.get("detail", "")
        print(f"Unverified phone correctly rejected: {data}")
    
    def test_booking_request_city_codes(self):
        """Test booking IDs use correct city codes"""
        city_codes = {
            "Mumbai": "MUM",
            "Bangalore": "BLR",
            "Hyderabad": "HYD",
        }
        
        for city, expected_code in city_codes.items():
            test_phone = f"33333{uuid.uuid4().hex[:5]}"
            
            # Send and verify OTP
            send_res = requests.post(f"{BASE_URL}/api/otp/send", json={"phone": test_phone})
            assert send_res.status_code == 200
            debug_otp = send_res.json()["debug_otp"]
            verify_res = requests.post(f"{BASE_URL}/api/otp/verify", json={"phone": test_phone, "otp": debug_otp})
            assert verify_res.status_code == 200
            
            # Create booking
            booking_res = requests.post(f"{BASE_URL}/api/booking-requests", json={
                "customer_name": f"Test {city} User",
                "customer_phone": test_phone,
                "customer_email": f"test{city.lower()}@example.com",
                "city": city,
                "event_type": "corporate",
            })
            
            assert booking_res.status_code == 200, f"Booking failed for {city}: {booking_res.text}"
            booking_id = booking_res.json()["booking_id"]
            assert booking_id.startswith(f"BMV-{expected_code}-"), f"Expected BMV-{expected_code}- prefix for {city}, got {booking_id}"
            print(f"{city} booking: {booking_id}")


class TestVenuesAPI:
    """Venues API tests"""
    
    def test_venues_cities_returns_list(self):
        """Test GET /api/venues/cities returns list of cities with venue counts"""
        response = requests.get(f"{BASE_URL}/api/venues/cities")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one city"
        
        # Check structure of first city
        city = data[0]
        assert "city" in city
        assert "venue_count" in city
        print(f"Cities returned: {[c['city'] for c in data]}")
    
    def test_venues_by_city(self):
        """Test GET /api/venues?city=Mumbai returns venues"""
        response = requests.get(f"{BASE_URL}/api/venues", params={"city": "Mumbai"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            venue = data[0]
            assert "venue_id" in venue
            assert "name" in venue
            assert venue["city"] == "Mumbai"
        print(f"Mumbai venues: {len(data)}")


class TestAdminLeadsVerification:
    """Verify admin can see booking requests in leads list"""
    
    def test_admin_sees_booking_requests(self):
        """Test admin login and verify leads list shows booking requests"""
        # Admin login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bookmyvenue.in",
            "password": "admin123"
        })
        
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json()["token"]
        
        # Get leads
        headers = {"Authorization": f"Bearer {token}"}
        leads_res = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        
        assert leads_res.status_code == 200, f"Get leads failed: {leads_res.text}"
        data = leads_res.json()
        
        assert "leads" in data
        leads = data["leads"]
        
        # Find leads with BMV booking IDs
        bmv_leads = [l for l in leads if l.get("booking_id") and l["booking_id"].startswith("BMV-")]
        assert len(bmv_leads) > 0, "No BMV booking requests found in leads"
        
        print(f"Found {len(bmv_leads)} BMV booking requests in admin dashboard")
        for lead in bmv_leads[:3]:
            print(f"  - {lead['booking_id']}: {lead['customer_name']} ({lead['event_type']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
