"""
Backend tests for the new booking flow:
- /api/rms/available - Returns available RMs
- /api/rms/top-performers - Returns top performing RMs
- POST /api/leads - Creates leads with selected_rm_id and guest_count_range
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRMsAvailable:
    """Tests for /api/rms/available endpoint"""
    
    def test_rms_available_returns_list(self):
        """GET /api/rms/available returns a list of RMs"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ /api/rms/available returns list with {len(data)} RMs")
        
    def test_rms_available_with_city_filter(self):
        """GET /api/rms/available with city parameter"""
        response = requests.get(f"{BASE_URL}/api/rms/available?city=Delhi")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ /api/rms/available?city=Delhi returns list with {len(data)} RMs")
        
    def test_rms_available_has_required_fields(self):
        """GET /api/rms/available returns RMs with required fields"""
        response = requests.get(f"{BASE_URL}/api/rms/available")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            rm = data[0]
            required_fields = ['user_id', 'name', 'rating', 'completed_events', 'bio']
            for field in required_fields:
                assert field in rm, f"RM should have '{field}' field"
            print(f"✓ RM has all required fields: {required_fields}")
        else:
            pytest.skip("No RMs available in database")


class TestRMsTopPerformers:
    """Tests for /api/rms/top-performers endpoint"""
    
    def test_top_performers_returns_list(self):
        """GET /api/rms/top-performers returns a list"""
        response = requests.get(f"{BASE_URL}/api/rms/top-performers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ /api/rms/top-performers returns list with {len(data)} performers")


class TestLeadsEndpoint:
    """Tests for POST /api/leads endpoint with new fields"""
    
    def test_create_lead_basic(self):
        """POST /api/leads creates a lead successfully"""
        payload = {
            "customer_name": "TEST_BookingFlow User",
            "customer_email": "test_booking_flow@test.com",
            "customer_phone": "+919876543210",
            "city": "Delhi",
            "area": "South Delhi",
            "event_type": "Wedding",
            "guest_count": 150,
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'lead_id' in data, "Response should have lead_id"
        print(f"✓ Lead created: {data.get('lead_id')}, RM: {data.get('rm_name')}")
        
    def test_create_lead_with_guest_count_range(self):
        """POST /api/leads with guest_count_range field"""
        payload = {
            "customer_name": "TEST_GuestRange User",
            "customer_email": "test_guestrange@test.com",
            "customer_phone": "+919876543211",
            "city": "Delhi",
            "guest_count_range": "100-250",
            "event_type": "Birthday / Anniversary",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'lead_id' in data, "Response should have lead_id"
        print(f"✓ Lead with guest_count_range created: {data.get('lead_id')}")

    def test_create_lead_with_selected_rm_id(self):
        """POST /api/leads with selected_rm_id field assigns that RM"""
        # First get an available RM
        rm_response = requests.get(f"{BASE_URL}/api/rms/available?limit=1")
        if rm_response.status_code != 200:
            pytest.skip("Cannot get available RMs")
            
        rms = rm_response.json()
        if len(rms) == 0:
            pytest.skip("No RMs available")
            
        selected_rm_id = rms[0]['user_id']
        selected_rm_name = rms[0]['name']
        
        payload = {
            "customer_name": "TEST_SelectedRM User",
            "customer_email": "test_selectedrm@test.com",
            "customer_phone": "+919876543212",
            "city": "Delhi",
            "selected_rm_id": selected_rm_id,
            "guest_count_range": "50-100",
            "event_type": "Corporate Event",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'lead_id' in data, "Response should have lead_id"
        # The RM name returned should match the selected RM
        assert data.get('rm_name') == selected_rm_name, f"Expected RM name '{selected_rm_name}', got '{data.get('rm_name')}'"
        print(f"✓ Lead with selected_rm_id created: {data.get('lead_id')}, assigned to: {data.get('rm_name')}")


class TestBookingRequests:
    """Tests for POST /api/booking-requests endpoint"""
    
    def test_booking_request_basic(self):
        """POST /api/booking-requests creates a booking request"""
        payload = {
            "customer_name": "TEST_BookingRequest User",
            "customer_phone": "+919876543213",
            "customer_email": "test_bookingrequest@test.com",
            "city": "Delhi",
            "event_type": "Wedding",
            "guest_count": 200,
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'booking_id' in data, "Response should have booking_id"
        assert 'lead_id' in data, "Response should have lead_id"
        print(f"✓ Booking request created: {data.get('booking_id')}, lead: {data.get('lead_id')}")

    def test_booking_request_with_selected_rm_and_guest_range(self):
        """POST /api/booking-requests with selected_rm_id and guest_count_range"""
        # First get an available RM
        rm_response = requests.get(f"{BASE_URL}/api/rms/available?limit=1")
        if rm_response.status_code != 200 or len(rm_response.json()) == 0:
            pytest.skip("No RMs available")
            
        rms = rm_response.json()
        selected_rm_id = rms[0]['user_id']
        selected_rm_name = rms[0]['name']
        
        payload = {
            "customer_name": "TEST_FullFlow User",
            "customer_phone": "+919876543214",
            "customer_email": "test_fullflow@test.com",
            "city": "Mumbai",
            "event_type": "Corporate Event",
            "guest_count_range": "250-500",
            "selected_rm_id": selected_rm_id,
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/booking-requests", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'booking_id' in data, "Response should have booking_id"
        assert data.get('rm_name') == selected_rm_name, f"Expected RM '{selected_rm_name}', got '{data.get('rm_name')}'"
        print(f"✓ Booking request with selected RM created: {data.get('booking_id')}, RM: {data.get('rm_name')}")


class TestFeaturedVenues:
    """Tests to get venue data for frontend testing"""
    
    def test_featured_venues_returns_data(self):
        """GET /api/venues/featured returns venues with URLs"""
        response = requests.get(f"{BASE_URL}/api/venues/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one featured venue"
        
        venue = data[0]
        assert 'venue_id' in venue, "Venue should have venue_id"
        assert 'city_slug' in venue or 'city' in venue, "Venue should have city_slug or city"
        assert 'slug' in venue or 'name' in venue, "Venue should have slug or name"
        
        # Print first venue URL for frontend testing
        city_slug = venue.get('city_slug', venue.get('city', '').lower().replace(' ', '-'))
        venue_slug = venue.get('slug', venue.get('name', '').lower().replace(' ', '-'))
        print(f"✓ Featured venues returned. First venue URL: /venues/{city_slug}/{venue_slug}")
        print(f"  Venue name: {venue.get('name')}, city: {venue.get('city')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
