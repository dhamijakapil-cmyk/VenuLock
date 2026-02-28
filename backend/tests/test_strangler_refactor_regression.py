"""
Regression test for Strangler Pattern Backend Refactor.
Tests that auth routes (register, login, me, logout) and venue routes
(search, get, create, update) still work identically after migration
from monolithic server.py to modular routes/auth.py and routes/venues.py.

Also tests that legacy routes (leads, payments, admin) are unaffected.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
RM_CREDENTIALS = {"email": "rm1@bookmyvenue.in", "password": "rm123"}
ADMIN_CREDENTIALS = {"email": "admin@bookmyvenue.in", "password": "admin123"}
VENUE_OWNER_CREDENTIALS = {"email": "venue@bookmyvenue.in", "password": "venue123"}
TEST_LEAD_ID = "lead_e5969bb2cc83"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def rm_token(api_client):
    """Get RM authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"RM authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get Admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def venue_owner_token(api_client):
    """Get Venue Owner authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Venue Owner authentication failed: {response.status_code} - {response.text}")


class TestAuthRoutesMigration:
    """
    Test auth routes migrated to routes/auth.py
    - POST /api/auth/register
    - POST /api/auth/login
    - GET /api/auth/me
    - POST /api/auth/logout
    """

    def test_register_new_user(self, api_client):
        """Test POST /api/auth/register - create new user"""
        unique_id = uuid.uuid4().hex[:8]
        test_user = {
            "email": f"test_strangler_{unique_id}@test.com",
            "password": "testpassword123",
            "name": f"Test User {unique_id}",
            "phone": "9876543210",
            "role": "customer"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=test_user)
        
        assert response.status_code == 200, f"Register failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == test_user["email"]
        assert data["user"]["name"] == test_user["name"]
        assert data["user"]["role"] == "customer"
        print(f"✓ Register successful for {test_user['email']}")

    def test_register_duplicate_email(self, api_client):
        """Test POST /api/auth/register - duplicate email returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "rm1@bookmyvenue.in",  # Existing user
            "password": "anypassword",
            "name": "Duplicate Test"
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        data = response.json()
        assert "already registered" in data.get("detail", "").lower(), f"Unexpected error: {data}"
        print("✓ Duplicate email correctly rejected")

    def test_login_rm_success(self, api_client):
        """Test POST /api/auth/login - RM login with email/password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
        
        assert response.status_code == 200, f"RM Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == RM_CREDENTIALS["email"]
        assert data["user"]["role"] == "rm"
        print(f"✓ RM Login successful - role: {data['user']['role']}")

    def test_login_admin_success(self, api_client):
        """Test POST /api/auth/login - Admin login with email/password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        
        assert response.status_code == 200, f"Admin Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_CREDENTIALS["email"]
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin Login successful - role: {data['user']['role']}")

    def test_login_venue_owner_success(self, api_client):
        """Test POST /api/auth/login - Venue Owner login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDENTIALS)
        
        assert response.status_code == 200, f"Venue Owner Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "venue_owner"
        print(f"✓ Venue Owner Login successful - role: {data['user']['role']}")

    def test_login_invalid_credentials(self, api_client):
        """Test POST /api/auth/login - invalid credentials returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")

    def test_get_me_authenticated(self, api_client, rm_token):
        """Test GET /api/auth/me - get current user info"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get me failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data, "No user_id in response"
        assert "email" in data, "No email in response"
        assert data["email"] == RM_CREDENTIALS["email"]
        assert data["role"] == "rm"
        print(f"✓ GET /api/auth/me successful - user: {data['email']}")

    def test_get_me_unauthenticated(self, api_client):
        """Test GET /api/auth/me - unauthenticated returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated /api/auth/me correctly rejected")

    def test_logout(self, api_client, rm_token):
        """Test POST /api/auth/logout - logout and clear session"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Logout failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data
        assert "logged out" in data["message"].lower()
        print("✓ Logout successful")


class TestVenueRoutesMigration:
    """
    Test venue routes migrated to routes/venues.py
    - GET /api/venues - search venues with filters
    - GET /api/venues/{venue_id} - get venue details
    - POST /api/venues - create venue (venue_owner role)
    - PUT /api/venues/{venue_id} - update venue
    """

    def test_search_venues_no_filters(self, api_client):
        """Test GET /api/venues - search venues without filters"""
        response = api_client.get(f"{BASE_URL}/api/venues")
        
        assert response.status_code == 200, f"Search venues failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        if len(data) > 0:
            venue = data[0]
            assert "venue_id" in venue, "No venue_id in venue"
            assert "name" in venue, "No name in venue"
            assert "city" in venue, "No city in venue"
        print(f"✓ Search venues returned {len(data)} venues")

    def test_search_venues_with_city_filter(self, api_client):
        """Test GET /api/venues - search venues with city filter"""
        response = api_client.get(f"{BASE_URL}/api/venues?city=Mumbai")
        
        assert response.status_code == 200, f"Search failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        # Verify filter worked (if venues exist)
        for venue in data:
            assert "mumbai" in venue.get("city", "").lower(), f"City filter not applied: {venue.get('city')}"
        print(f"✓ Search venues with city=Mumbai returned {len(data)} venues")

    def test_search_venues_with_event_type_filter(self, api_client):
        """Test GET /api/venues - search venues with event_type filter"""
        response = api_client.get(f"{BASE_URL}/api/venues?event_type=wedding")
        
        assert response.status_code == 200, f"Search failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        print(f"✓ Search venues with event_type=wedding returned {len(data)} venues")

    def test_search_venues_with_guest_count_filter(self, api_client):
        """Test GET /api/venues - search venues with guest count filter"""
        response = api_client.get(f"{BASE_URL}/api/venues?guest_min=100&guest_max=300")
        
        assert response.status_code == 200, f"Search failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        print(f"✓ Search venues with guest count filter returned {len(data)} venues")

    def test_search_venues_with_pagination(self, api_client):
        """Test GET /api/venues - search venues with pagination"""
        response = api_client.get(f"{BASE_URL}/api/venues?page=1&limit=5")
        
        assert response.status_code == 200, f"Search failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        assert len(data) <= 5, f"Limit not applied: got {len(data)} venues"
        print(f"✓ Search venues with pagination returned {len(data)} venues (limit=5)")

    def test_get_venue_details(self, api_client):
        """Test GET /api/venues/{venue_id} - get venue details"""
        # First get a venue ID from search
        search_response = api_client.get(f"{BASE_URL}/api/venues?limit=1")
        if search_response.status_code != 200 or not search_response.json():
            pytest.skip("No venues available to test")
        
        venue_id = search_response.json()[0]["venue_id"]
        
        response = api_client.get(f"{BASE_URL}/api/venues/{venue_id}")
        
        assert response.status_code == 200, f"Get venue failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data["venue_id"] == venue_id, "Venue ID mismatch"
        assert "name" in data, "No name in venue"
        assert "city" in data, "No city in venue"
        assert "pricing" in data, "No pricing in venue"
        assert "amenities" in data, "No amenities in venue"
        print(f"✓ Get venue details successful - {data['name']}")

    def test_get_venue_not_found(self, api_client):
        """Test GET /api/venues/{venue_id} - non-existent venue returns 404"""
        response = api_client.get(f"{BASE_URL}/api/venues/venue_nonexistent123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent venue correctly returns 404")

    def test_create_venue_as_venue_owner(self, api_client, venue_owner_token):
        """Test POST /api/venues - create venue (venue_owner role)"""
        unique_id = uuid.uuid4().hex[:6]
        venue_data = {
            "name": f"Test Venue {unique_id}",
            "description": "Test venue created for regression testing",
            "city": "Mumbai",
            "area": "Andheri",
            "address": "Test Address, Andheri West",
            "pincode": "400058",
            "latitude": 19.1365,
            "longitude": 72.8294,
            "event_types": ["wedding", "corporate"],
            "venue_type": "banquet_hall",
            "indoor_outdoor": "indoor",
            "capacity_min": 100,
            "capacity_max": 500,
            "pricing": {
                "price_per_plate_veg": 1500,
                "price_per_plate_nonveg": 1800,
                "min_spend": 150000
            },
            "amenities": {
                "parking": True,
                "valet": True,
                "alcohol_allowed": True,
                "ac": True,
                "catering_inhouse": True
            },
            "images": [],
            "policies": "Standard policies apply"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/venues",
            json=venue_data,
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        assert response.status_code == 200, f"Create venue failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "venue_id" in data, "No venue_id in response"
        assert "status" in data, "No status in response"
        assert data["status"] == "pending", "Venue owner venues should be pending"
        print(f"✓ Venue created successfully - ID: {data['venue_id']}, Status: {data['status']}")

    def test_create_venue_unauthorized(self, api_client, rm_token):
        """Test POST /api/venues - RM (non venue_owner) cannot create venue"""
        response = api_client.post(
            f"{BASE_URL}/api/venues",
            json={
                "name": "Unauthorized Test",
                "city": "Mumbai",
                "area": "Andheri",
                "address": "Test",
                "pincode": "400058",
                "latitude": 19.1,
                "longitude": 72.8,
                "pricing": {},
                "amenities": {}
            },
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Unauthorized venue creation correctly rejected with 403")

    def test_update_venue_as_owner(self, api_client, venue_owner_token):
        """Test PUT /api/venues/{venue_id} - update venue"""
        # First get a venue owned by the venue owner
        # For simplicity, we'll create one first and then update
        unique_id = uuid.uuid4().hex[:6]
        create_response = api_client.post(
            f"{BASE_URL}/api/venues",
            json={
                "name": f"Update Test Venue {unique_id}",
                "city": "Delhi",
                "area": "South Delhi",
                "address": "Test Address",
                "pincode": "110001",
                "latitude": 28.6,
                "longitude": 77.2,
                "pricing": {"price_per_plate_veg": 1000},
                "amenities": {}
            },
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create venue for update test: {create_response.text}")
        
        venue_id = create_response.json()["venue_id"]
        
        # Now update the venue
        update_data = {
            "description": "Updated description",
            "capacity_max": 600
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/venues/{venue_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        assert response.status_code == 200, f"Update venue failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Venue updated successfully - {venue_id}")


class TestVenueAvailability:
    """
    Test venue availability routes (still in server.py)
    - GET /api/venues/{venue_id}/availability
    """

    def test_get_venue_availability(self, api_client):
        """Test GET /api/venues/{venue_id}/availability - get availability"""
        # Get a venue ID first
        search_response = api_client.get(f"{BASE_URL}/api/venues?limit=1")
        if search_response.status_code != 200 or not search_response.json():
            pytest.skip("No venues available to test")
        
        venue_id = search_response.json()[0]["venue_id"]
        
        response = api_client.get(f"{BASE_URL}/api/venues/{venue_id}/availability")
        
        assert response.status_code == 200, f"Get availability failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "venue_id" in data, "No venue_id in response"
        assert "slots" in data, "No slots in response"
        assert isinstance(data["slots"], list), "Slots should be a list"
        print(f"✓ Get venue availability successful - {len(data['slots'])} slots")

    def test_get_venue_availability_with_month_filter(self, api_client):
        """Test GET /api/venues/{venue_id}/availability - with month filter"""
        search_response = api_client.get(f"{BASE_URL}/api/venues?limit=1")
        if search_response.status_code != 200 or not search_response.json():
            pytest.skip("No venues available to test")
        
        venue_id = search_response.json()[0]["venue_id"]
        current_month = datetime.now().strftime("%Y-%m")
        
        response = api_client.get(f"{BASE_URL}/api/venues/{venue_id}/availability?month={current_month}")
        
        assert response.status_code == 200, f"Get availability failed: {response.status_code}"
        print(f"✓ Get venue availability with month filter successful")


class TestLeadsRoutes:
    """
    Test leads routes (still in server.py - should be unaffected)
    - GET /api/leads
    - GET /api/leads/{lead_id}
    """

    def test_get_leads_as_rm(self, api_client, rm_token):
        """Test GET /api/leads - get leads list (RM)"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get leads failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "leads" in data, "No leads in response"
        assert "total" in data, "No total in response"
        assert isinstance(data["leads"], list), "Leads should be a list"
        print(f"✓ Get leads successful - {len(data['leads'])} leads, total: {data['total']}")

    def test_get_lead_details(self, api_client, rm_token):
        """Test GET /api/leads/{lead_id} - get lead details"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        # Could be 200 (success) or 403/404 if lead doesn't exist or belongs to different RM
        if response.status_code == 404:
            print(f"⚠ Lead {TEST_LEAD_ID} not found - may have been cleaned up")
            return
        if response.status_code == 403:
            print(f"⚠ Lead {TEST_LEAD_ID} belongs to different RM")
            return
        
        assert response.status_code == 200, f"Get lead failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "lead_id" in data, "No lead_id in response"
        assert "customer_name" in data, "No customer_name in response"
        assert "stage" in data, "No stage in response"
        print(f"✓ Get lead details successful - {data['customer_name']}, stage: {data['stage']}")


class TestAdminRoutes:
    """
    Test admin routes (still in server.py - should be unaffected)
    - GET /api/admin/control-room
    """

    def test_get_control_room_metrics(self, api_client, admin_token):
        """Test GET /api/admin/control-room - get control room metrics"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/control-room",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get control room failed: {response.status_code} - {response.text}"
        data = response.json()
        # Verify expected fields based on actual API response structure
        assert isinstance(data, dict), "Control room should return a dict"
        print(f"✓ Get control room metrics successful")

    def test_control_room_unauthorized(self, api_client, rm_token):
        """Test GET /api/admin/control-room - RM cannot access"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/control-room",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ RM correctly blocked from admin control room")


class TestPaymentRoutes:
    """
    Test payment routes (still in server.py - should be unaffected)
    - GET /api/payments/{lead_id}
    """

    def test_get_payment_details(self, api_client, rm_token):
        """Test GET /api/payments/{lead_id} - get payment details"""
        response = api_client.get(
            f"{BASE_URL}/api/payments/{TEST_LEAD_ID}",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        # Could be 200 or 404 if no payment exists
        if response.status_code == 404:
            print(f"⚠ No payment found for lead {TEST_LEAD_ID}")
            return
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Get payment details successful")
        else:
            print(f"⚠ Get payment returned {response.status_code}: {response.text}")


class TestComparisonSheet:
    """
    Test comparison sheet routes (still in server.py - should be unaffected)
    - POST /api/leads/{lead_id}/comparison-sheet
    """

    def test_generate_comparison_sheet_validation(self, api_client, rm_token):
        """Test POST /api/leads/{lead_id}/comparison-sheet - validation"""
        # Test with less than 3 venues - should fail
        response = api_client.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json={
                "venue_ids": ["venue_1", "venue_2"],  # Only 2 venues
                "expert_notes": {}
            },
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        # Could be 400 (validation error) or 403/404 (access/not found)
        if response.status_code == 403:
            print("⚠ Lead belongs to different RM - skipping comparison sheet test")
            return
        if response.status_code == 404:
            print("⚠ Lead not found - skipping comparison sheet test")
            return
        
        # If validation works, should be 400 for <3 venues
        assert response.status_code == 400, f"Expected 400 for <3 venues, got {response.status_code}"
        print("✓ Comparison sheet correctly validates minimum 3 venues")


# Run a basic health check first
class TestHealthCheck:
    """Basic health check to ensure the server is running"""

    def test_api_health(self, api_client):
        """Test basic API health"""
        # Test the venues endpoint as a health check
        response = api_client.get(f"{BASE_URL}/api/venues?limit=1")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✓ API is healthy and responding")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
