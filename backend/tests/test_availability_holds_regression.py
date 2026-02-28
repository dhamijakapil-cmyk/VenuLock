"""
Regression test for Backend Refactor Phase 2 - Strangler Pattern.
Tests availability and hold routes migrated from server.py to routes/availability.py
with shared business logic in services/availability_service.py.

Routes tested:
- GET /api/venues/{venue_id}/availability - get venue availability
- PUT /api/venues/{venue_id}/availability - update availability (venue_owner)
- POST /api/venues/{venue_id}/availability/bulk - bulk update dates
- POST /api/venues/{venue_id}/hold-date - create date hold (RM)
- DELETE /api/venues/{venue_id}/hold-date/{hold_id} - release hold
- POST /api/venues/{venue_id}/hold-date/{hold_id}/extend - extend hold
- GET /api/venues/{venue_id}/holds - get venue holds
- GET /api/leads/{lead_id}/holds - get lead holds with time remaining

Also verifies Phase 1 migrations (auth, venues) still work.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RM_CREDENTIALS = {"email": "rm1@bookmyvenue.in", "password": "rm123"}
ADMIN_CREDENTIALS = {"email": "admin@bookmyvenue.in", "password": "admin123"}
VENUE_OWNER_CREDENTIALS = {"email": "venue@bookmyvenue.in", "password": "venue123"}
TEST_LEAD_ID = "lead_e5969bb2cc83"
TEST_VENUE_ID = "venue_5e7ae8c57b9b"


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


@pytest.fixture(scope="module")
def test_venue_id(api_client):
    """Get a valid venue ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/venues?limit=1")
    if response.status_code == 200 and response.json():
        return response.json()[0]["venue_id"]
    return TEST_VENUE_ID


# ============== HEALTH CHECK ==============
class TestHealthCheck:
    """Basic health check to ensure the server is running"""

    def test_api_health(self, api_client):
        """Test basic API health"""
        response = api_client.get(f"{BASE_URL}/api/venues?limit=1")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✓ API is healthy and responding")


# ============== PHASE 1: AUTH ROUTES (routes/auth.py) ==============
class TestAuthRoutes:
    """Verify Phase 1 migrated auth routes still work"""

    def test_login_rm_success(self, api_client):
        """Test POST /api/auth/login - RM login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
        
        assert response.status_code == 200, f"RM Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "rm"
        print(f"✓ RM Login successful - role: {data['user']['role']}")

    def test_login_admin_success(self, api_client):
        """Test POST /api/auth/login - Admin login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        
        assert response.status_code == 200, f"Admin Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin Login successful - role: {data['user']['role']}")

    def test_login_venue_owner_success(self, api_client):
        """Test POST /api/auth/login - Venue Owner login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDENTIALS)
        
        assert response.status_code == 200, f"Venue Owner Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data["user"]["role"] == "venue_owner"
        print(f"✓ Venue Owner Login successful - role: {data['user']['role']}")

    def test_get_me_authenticated(self, api_client, rm_token):
        """Test GET /api/auth/me - get current user info"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get me failed: {response.status_code}"
        data = response.json()
        assert data["email"] == RM_CREDENTIALS["email"]
        print(f"✓ GET /api/auth/me successful - user: {data['email']}")


# ============== PHASE 1: VENUE ROUTES (routes/venues.py) ==============
class TestVenueRoutes:
    """Verify Phase 1 migrated venue routes still work"""

    def test_search_venues(self, api_client):
        """Test GET /api/venues - search venues"""
        response = api_client.get(f"{BASE_URL}/api/venues?limit=5")
        
        assert response.status_code == 200, f"Search venues failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        print(f"✓ Search venues returned {len(data)} venues")

    def test_get_venue_details(self, api_client, test_venue_id):
        """Test GET /api/venues/{venue_id} - get venue details"""
        response = api_client.get(f"{BASE_URL}/api/venues/{test_venue_id}")
        
        if response.status_code == 404:
            pytest.skip(f"Test venue {test_venue_id} not found")
        
        assert response.status_code == 200, f"Get venue failed: {response.status_code}"
        data = response.json()
        assert "venue_id" in data
        assert "name" in data
        print(f"✓ Get venue details successful - {data['name']}")


# ============== PHASE 2: AVAILABILITY ROUTES (routes/availability.py) ==============
class TestAvailabilityRoutes:
    """
    Test availability routes migrated to routes/availability.py
    - GET /api/venues/{venue_id}/availability
    - PUT /api/venues/{venue_id}/availability
    - POST /api/venues/{venue_id}/availability/bulk
    """

    def test_get_venue_availability(self, api_client, test_venue_id):
        """Test GET /api/venues/{venue_id}/availability - get availability slots"""
        response = api_client.get(f"{BASE_URL}/api/venues/{test_venue_id}/availability")
        
        assert response.status_code == 200, f"Get availability failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "venue_id" in data, "No venue_id in response"
        assert "slots" in data, "No slots in response"
        assert isinstance(data["slots"], list), "Slots should be a list"
        print(f"✓ Get venue availability successful - {len(data['slots'])} slots")

    def test_get_venue_availability_with_month_filter(self, api_client, test_venue_id):
        """Test GET /api/venues/{venue_id}/availability - with month filter"""
        current_month = datetime.now().strftime("%Y-%m")
        response = api_client.get(f"{BASE_URL}/api/venues/{test_venue_id}/availability?month={current_month}")
        
        assert response.status_code == 200, f"Get availability failed: {response.status_code}"
        data = response.json()
        assert "slots" in data
        # Verify month filter is applied if slots exist
        for slot in data["slots"]:
            assert slot.get("date", "").startswith(current_month), f"Slot date {slot.get('date')} doesn't match month {current_month}"
        print(f"✓ Get venue availability with month filter successful - {len(data['slots'])} slots")

    def test_get_availability_venue_not_found(self, api_client):
        """Test GET /api/venues/{venue_id}/availability - non-existent venue"""
        response = api_client.get(f"{BASE_URL}/api/venues/venue_nonexistent123/availability")
        
        # Should return 200 with empty slots (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["slots"] == []
        print("✓ Non-existent venue returns empty slots")

    def test_update_availability_as_venue_owner(self, api_client, venue_owner_token, test_venue_id):
        """Test PUT /api/venues/{venue_id}/availability - update availability"""
        test_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        availability_data = {
            "slots": [
                {
                    "date": test_date,
                    "status": "available",
                    "notes": "Test availability update"
                }
            ]
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/venues/{test_venue_id}/availability",
            json=availability_data,
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        # Could be 200 or 403 (if venue belongs to different owner)
        if response.status_code == 403:
            print(f"⚠ Venue {test_venue_id} belongs to different owner - testing with venue list")
            # Try with a different venue
            search_resp = api_client.get(f"{BASE_URL}/api/venues?limit=10")
            if search_resp.status_code == 200:
                venues = search_resp.json()
                for venue in venues:
                    retry_resp = api_client.put(
                        f"{BASE_URL}/api/venues/{venue['venue_id']}/availability",
                        json=availability_data,
                        headers={"Authorization": f"Bearer {venue_owner_token}"}
                    )
                    if retry_resp.status_code == 200:
                        print(f"✓ Update availability successful on venue {venue['venue_id']}")
                        return
                # If all fail with 403, it's expected - venue owner doesn't own any venues
                print("⚠ Venue owner doesn't own any test venues - update availability test skipped")
                return
        
        if response.status_code == 404:
            pytest.skip(f"Venue {test_venue_id} not found")
        
        assert response.status_code == 200, f"Update availability failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Update availability successful")

    def test_update_availability_unauthorized(self, api_client, rm_token, test_venue_id):
        """Test PUT /api/venues/{venue_id}/availability - RM cannot update"""
        test_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        response = api_client.put(
            f"{BASE_URL}/api/venues/{test_venue_id}/availability",
            json={"slots": [{"date": test_date, "status": "available"}]},
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ RM correctly blocked from updating availability")

    def test_bulk_update_availability_as_venue_owner(self, api_client, venue_owner_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/availability/bulk - bulk update"""
        # Generate multiple test dates
        test_dates = [
            (datetime.now() + timedelta(days=70 + i)).strftime("%Y-%m-%d")
            for i in range(3)
        ]
        
        bulk_data = {
            "dates": test_dates,
            "status": "available",
            "time_slot": "full_day",
            "notes": "Bulk test update"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/availability/bulk",
            json=bulk_data,
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        # Could be 200 or 403 (different owner) or 404 (venue not found)
        if response.status_code == 403:
            print(f"⚠ Not authorized to bulk update {test_venue_id} - expected for different owner")
            return
        if response.status_code == 404:
            pytest.skip(f"Venue {test_venue_id} not found")
        
        assert response.status_code == 200, f"Bulk update failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data
        assert "dates" in data
        assert len(data["dates"]) == len(test_dates)
        print(f"✓ Bulk update availability successful - updated {len(data['dates'])} dates")

    def test_bulk_update_availability_unauthorized(self, api_client, rm_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/availability/bulk - RM cannot bulk update"""
        test_dates = [(datetime.now() + timedelta(days=80)).strftime("%Y-%m-%d")]
        
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/availability/bulk",
            json={"dates": test_dates, "status": "blocked"},
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ RM correctly blocked from bulk updating availability")

    def test_bulk_update_admin_can_access(self, api_client, admin_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/availability/bulk - Admin can update any venue"""
        test_dates = [(datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")]
        
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/availability/bulk",
            json={"dates": test_dates, "status": "available", "notes": "Admin test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Venue {test_venue_id} not found")
        
        assert response.status_code == 200, f"Admin bulk update failed: {response.status_code} - {response.text}"
        print("✓ Admin can bulk update any venue availability")


# ============== PHASE 2: HOLD ROUTES (routes/availability.py) ==============
class TestHoldRoutes:
    """
    Test date hold routes migrated to routes/availability.py
    - POST /api/venues/{venue_id}/hold-date - create hold
    - DELETE /api/venues/{venue_id}/hold-date/{hold_id} - release hold
    - POST /api/venues/{venue_id}/hold-date/{hold_id}/extend - extend hold
    - GET /api/venues/{venue_id}/holds - get venue holds
    - GET /api/leads/{lead_id}/holds - get lead holds
    """

    def test_create_date_hold_as_rm(self, api_client, rm_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/hold-date - create hold (RM)"""
        # Use a future date to avoid conflicts
        test_date = (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d")
        
        # Note: venue_id is required in body even though it's in URL path (model issue)
        hold_request = {
            "venue_id": test_venue_id,
            "lead_id": TEST_LEAD_ID,
            "date": test_date,
            "time_slot": "full_day",
            "expiry_hours": 24
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date",
            json=hold_request,
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        if response.status_code == 404:
            # Check if it's venue or lead not found
            error_detail = response.json().get("detail", "")
            if "Lead" in error_detail:
                print(f"⚠ Lead {TEST_LEAD_ID} not found - creating test will be skipped")
                pytest.skip(f"Lead {TEST_LEAD_ID} not found")
            elif "Venue" in error_detail:
                pytest.skip(f"Venue {test_venue_id} not found")
        
        if response.status_code == 400:
            # Date may already be held/blocked
            error_detail = response.json().get("detail", "")
            print(f"⚠ Cannot create hold: {error_detail}")
            return
        
        assert response.status_code == 200, f"Create hold failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "hold" in data, "No hold in response"
        assert "message" in data
        hold = data["hold"]
        assert hold["venue_id"] == test_venue_id
        assert hold["date"] == test_date
        assert hold["lead_id"] == TEST_LEAD_ID
        assert hold["status"] == "active"
        assert "hold_id" in hold
        assert "expires_at" in hold
        print(f"✓ Create date hold successful - hold_id: {hold['hold_id']}")
        
        # Return hold_id for other tests
        return hold["hold_id"]

    def test_create_hold_admin_can_also_create(self, api_client, admin_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/hold-date - Admin can create hold"""
        test_date = (datetime.now() + timedelta(days=101)).strftime("%Y-%m-%d")
        
        # Note: venue_id is required in body even though it's in URL path (model issue)
        hold_request = {
            "venue_id": test_venue_id,
            "lead_id": TEST_LEAD_ID,
            "date": test_date,
            "time_slot": "evening",
            "expiry_hours": 48
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date",
            json=hold_request,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            error_detail = response.json().get("detail", "")
            if "Lead" in error_detail:
                pytest.skip(f"Lead {TEST_LEAD_ID} not found")
        
        if response.status_code == 400:
            print(f"⚠ Cannot create hold (may be blocked): {response.json().get('detail')}")
            return
        
        assert response.status_code == 200, f"Admin create hold failed: {response.status_code} - {response.text}"
        print("✓ Admin can create date hold")

    def test_create_hold_unauthorized_venue_owner(self, api_client, venue_owner_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/hold-date - Venue owner cannot create hold"""
        test_date = (datetime.now() + timedelta(days=102)).strftime("%Y-%m-%d")
        
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date",
            json={"venue_id": test_venue_id, "lead_id": TEST_LEAD_ID, "date": test_date},
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Venue owner correctly blocked from creating holds")

    def test_get_venue_holds_as_rm(self, api_client, rm_token, test_venue_id):
        """Test GET /api/venues/{venue_id}/holds - get venue holds"""
        response = api_client.get(
            f"{BASE_URL}/api/venues/{test_venue_id}/holds",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get venue holds failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "venue_id" in data
        assert "holds" in data
        assert isinstance(data["holds"], list)
        print(f"✓ Get venue holds successful - {len(data['holds'])} active holds")

    def test_get_venue_holds_with_status_filter(self, api_client, rm_token, test_venue_id):
        """Test GET /api/venues/{venue_id}/holds?status=all - get all holds"""
        response = api_client.get(
            f"{BASE_URL}/api/venues/{test_venue_id}/holds?status=released",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get holds failed: {response.status_code}"
        data = response.json()
        assert "holds" in data
        # Verify filter applied
        for hold in data["holds"]:
            assert hold.get("status") == "released"
        print(f"✓ Get venue holds with status filter successful")

    def test_get_venue_holds_venue_owner_can_access(self, api_client, venue_owner_token, test_venue_id):
        """Test GET /api/venues/{venue_id}/holds - Venue owner can view holds on their venue"""
        response = api_client.get(
            f"{BASE_URL}/api/venues/{test_venue_id}/holds",
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        # Venue owner should be able to see holds (for their venues)
        assert response.status_code == 200, f"Venue owner get holds failed: {response.status_code}"
        print("✓ Venue owner can view holds on venue")

    def test_get_lead_holds_as_rm(self, api_client, rm_token):
        """Test GET /api/leads/{lead_id}/holds - get lead holds"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/holds",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get lead holds failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "lead_id" in data
        assert "holds" in data
        assert isinstance(data["holds"], list)
        
        # Verify time remaining info for active holds
        for hold in data["holds"]:
            if hold.get("status") == "active":
                assert "hours_remaining" in hold, "Active hold should have hours_remaining"
                assert "is_expiring_soon" in hold, "Active hold should have is_expiring_soon"
        
        print(f"✓ Get lead holds successful - {len(data['holds'])} holds with time remaining info")

    def test_get_lead_holds_unauthorized(self, api_client, venue_owner_token):
        """Test GET /api/leads/{lead_id}/holds - Venue owner cannot access"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/holds",
            headers={"Authorization": f"Bearer {venue_owner_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Venue owner correctly blocked from viewing lead holds")


class TestHoldLifecycle:
    """Test complete hold lifecycle: create -> extend -> release"""

    def test_full_hold_lifecycle(self, api_client, rm_token, test_venue_id):
        """Test complete hold lifecycle"""
        unique_date = (datetime.now() + timedelta(days=110 + int(datetime.now().timestamp() % 100))).strftime("%Y-%m-%d")
        
        # 1. CREATE HOLD
        # Note: venue_id is required in body even though it's in URL path (model issue)
        create_response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date",
            json={
                "venue_id": test_venue_id,
                "lead_id": TEST_LEAD_ID,
                "date": unique_date,
                "time_slot": "full_day",
                "expiry_hours": 24
            },
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        if create_response.status_code == 404:
            error = create_response.json().get("detail", "")
            if "Lead" in error:
                pytest.skip(f"Lead {TEST_LEAD_ID} not found for lifecycle test")
            pytest.skip(f"Resource not found: {error}")
        
        if create_response.status_code == 400:
            print(f"⚠ Cannot create hold on {unique_date}: {create_response.json().get('detail')}")
            pytest.skip("Date unavailable for hold")
        
        assert create_response.status_code == 200, f"Create hold failed: {create_response.status_code} - {create_response.text}"
        
        hold = create_response.json()["hold"]
        hold_id = hold["hold_id"]
        print(f"  Step 1: Hold created - {hold_id}")
        
        # 2. EXTEND HOLD
        extend_response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}/extend",
            json={"extension_hours": 12},
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert extend_response.status_code == 200, f"Extend hold failed: {extend_response.status_code} - {extend_response.text}"
        extend_data = extend_response.json()
        assert "new_expires_at" in extend_data
        assert extend_data["extension_count"] == 1
        print(f"  Step 2: Hold extended - extension_count: {extend_data['extension_count']}")
        
        # 3. EXTEND AGAIN (second extension)
        extend_response2 = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}/extend",
            json={"extension_hours": 6},
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert extend_response2.status_code == 200, f"Second extend failed: {extend_response2.status_code}"
        extend_data2 = extend_response2.json()
        assert extend_data2["extension_count"] == 2
        print(f"  Step 3: Hold extended again - extension_count: {extend_data2['extension_count']}")
        
        # 4. THIRD EXTENSION (should fail for non-admin)
        extend_response3 = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}/extend",
            json={"extension_hours": 6},
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert extend_response3.status_code == 403, f"Expected 403 for 3rd extension, got {extend_response3.status_code}"
        print("  Step 4: Third extension correctly blocked (requires admin)")
        
        # 5. RELEASE HOLD
        release_response = api_client.delete(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert release_response.status_code == 200, f"Release hold failed: {release_response.status_code}"
        print(f"  Step 5: Hold released successfully")
        
        print("✓ Full hold lifecycle test passed")

    def test_extend_hold_admin_bypass_limit(self, api_client, admin_token, rm_token, test_venue_id):
        """Test that admin can extend beyond 2 extensions"""
        unique_date = (datetime.now() + timedelta(days=120 + int(datetime.now().timestamp() % 100))).strftime("%Y-%m-%d")
        
        # Create hold - venue_id required in body
        create_response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date",
            json={
                "venue_id": test_venue_id,
                "lead_id": TEST_LEAD_ID,
                "date": unique_date,
                "expiry_hours": 24
            },
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        if create_response.status_code in [400, 404]:
            pytest.skip(f"Cannot create hold: {create_response.json().get('detail')}")
        
        assert create_response.status_code == 200
        hold_id = create_response.json()["hold"]["hold_id"]
        
        # Extend twice with RM
        for i in range(2):
            api_client.post(
                f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}/extend",
                json={"extension_hours": 6},
                headers={"Authorization": f"Bearer {rm_token}"}
            )
        
        # Third extension with admin (should succeed)
        admin_extend = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}/extend",
            json={"extension_hours": 24},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert admin_extend.status_code == 200, f"Admin extend failed: {admin_extend.status_code}"
        data = admin_extend.json()
        assert data["extension_count"] == 3
        assert data["extensions_remaining"] == "unlimited"
        print("✓ Admin can extend beyond 2 extension limit")
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/{hold_id}",
            headers={"Authorization": f"Bearer {rm_token}"}
        )

    def test_release_hold_not_found(self, api_client, rm_token, test_venue_id):
        """Test DELETE /api/venues/{venue_id}/hold-date/{hold_id} - non-existent hold"""
        response = api_client.delete(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/hold_nonexistent123",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent hold correctly returns 404")

    def test_extend_hold_not_found(self, api_client, rm_token, test_venue_id):
        """Test POST /api/venues/{venue_id}/hold-date/{hold_id}/extend - non-existent hold"""
        response = api_client.post(
            f"{BASE_URL}/api/venues/{test_venue_id}/hold-date/hold_nonexistent123/extend",
            json={"extension_hours": 12},
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Extend non-existent hold correctly returns 404")


# ============== LEGACY ROUTES (still in server.py) ==============
class TestLegacyRoutes:
    """Test legacy routes in server.py are unaffected"""

    def test_get_leads_as_rm(self, api_client, rm_token):
        """Test GET /api/leads - legacy route"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        assert response.status_code == 200, f"Get leads failed: {response.status_code}"
        data = response.json()
        assert "leads" in data
        assert "total" in data
        print(f"✓ Legacy leads route working - {len(data['leads'])} leads")

    def test_get_control_room_as_admin(self, api_client, admin_token):
        """Test GET /api/admin/control-room - legacy route"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/control-room",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get control room failed: {response.status_code}"
        print("✓ Legacy admin control room route working")

    def test_get_payments(self, api_client, rm_token):
        """Test GET /api/payments/{lead_id} - legacy route"""
        response = api_client.get(
            f"{BASE_URL}/api/payments/{TEST_LEAD_ID}",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        
        # Could be 200 or 404 if no payment exists
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("✓ Legacy payments route working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
