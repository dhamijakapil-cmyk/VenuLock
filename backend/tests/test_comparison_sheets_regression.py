"""
Phase 3 Backend Refactor - Comparison Sheet Routes Regression Tests

Tests the migrated comparison sheet functionality:
- POST /api/leads/{lead_id}/comparison-sheet - generate comparison sheet (3-5 venues)
- GET /api/comparison-sheets/{sheet_id} - get comparison sheet (public)

Also verifies previous migrations still work:
- Phase 1: Auth routes (login, me, logout), Venue routes (search, get)
- Phase 2: Availability routes (get/update availability, holds)
- Legacy: Leads, admin control-room, payments
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
RM_LOGIN = {"email": "rm1@venulock.in", "password": "rm123"}
ADMIN_LOGIN = {"email": "admin@venulock.in", "password": "admin123"}
TEST_LEAD_ID = "lead_e5969bb2cc83"
TEST_VENUE_IDS = ["venue_5e7ae8c57b9b", "venue_f2b3d31ebb05", "venue_fd4c50a17cb7"]


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def rm_token(session):
    """Get RM auth token"""
    response = session.post(f"{BASE_URL}/api/auth/login", json=RM_LOGIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("RM Authentication failed")


@pytest.fixture(scope="module")
def admin_token(session):
    """Get Admin auth token"""
    response = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_LOGIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin Authentication failed")


# ============== PHASE 3: COMPARISON SHEET ROUTES ==============

class TestComparisonSheetGeneration:
    """Test POST /api/leads/{lead_id}/comparison-sheet"""
    
    generated_sheet_id = None  # Store for later retrieval test
    
    def test_generate_comparison_sheet_success_3_venues(self, session, rm_token):
        """Generate comparison sheet with 3 venues (minimum)"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=TEST_VENUE_IDS[:3],  # Use exactly 3 venues
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sheet_id" in data, "Response should contain sheet_id"
        assert data["sheet_id"].startswith("comp_"), "Sheet ID should have comp_ prefix"
        assert "lead_id" in data, "Response should contain lead_id"
        assert data["lead_id"] == TEST_LEAD_ID
        assert "venues" in data, "Response should contain venues"
        assert len(data["venues"]) == 3, "Should have 3 venues"
        assert "generated_at" in data
        assert "generated_by" in data
        assert "branding" in data
        
        # Store for later test
        TestComparisonSheetGeneration.generated_sheet_id = data["sheet_id"]
        print(f"Generated sheet ID: {data['sheet_id']}")
    
    def test_generate_comparison_sheet_with_admin(self, session, admin_token):
        """Admin can also generate comparison sheets"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=TEST_VENUE_IDS[:3],
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "sheet_id" in data
    
    def test_generate_comparison_sheet_venue_data_enrichment(self, session, rm_token):
        """Verify venue data is properly enriched in comparison sheet"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=TEST_VENUE_IDS[:3],
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check venue data structure
        for venue in data["venues"]:
            assert "venue_id" in venue, "Venue should have venue_id"
            assert "name" in venue, "Venue should have name"
            assert "location" in venue, "Venue should have location"
            assert "capacity" in venue, "Venue should have capacity"
            assert "pricing" in venue, "Venue should have pricing"
            assert "availability" in venue, "Venue should have availability"
            assert "amenities" in venue, "Venue should have amenities"
            
            # Check location structure
            location = venue["location"]
            assert "area" in location or "city" in location
            
            # Check availability structure
            availability = venue["availability"]
            assert "status" in availability, "Availability should have status"
            assert availability["status"] in ["high", "medium", "low"]
            assert "text" in availability, "Availability should have text"
    
    def test_generate_comparison_sheet_requires_auth(self, session):
        """Unauthenticated requests should fail"""
        response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=TEST_VENUE_IDS[:3]
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_generate_comparison_sheet_less_than_3_venues(self, session, rm_token):
        """Should fail with less than 3 venues"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=TEST_VENUE_IDS[:2],  # Only 2 venues
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "3-5 venues" in data.get("detail", "").lower() or "please select" in data.get("detail", "").lower()
    
    def test_generate_comparison_sheet_more_than_5_venues(self, session, rm_token):
        """Should fail with more than 5 venues"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        # Create 6 fake venue IDs
        six_venues = TEST_VENUE_IDS + ["venue_fake1", "venue_fake2", "venue_fake3"]
        response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=six_venues,
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "3-5 venues" in data.get("detail", "").lower() or "please select" in data.get("detail", "").lower()
    
    def test_generate_comparison_sheet_invalid_lead(self, session, rm_token):
        """Should fail with invalid lead ID"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.post(
            f"{BASE_URL}/api/leads/invalid_lead_xyz/comparison-sheet",
            json=TEST_VENUE_IDS[:3],
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()


class TestComparisonSheetRetrieval:
    """Test GET /api/comparison-sheets/{sheet_id}"""
    
    def test_get_comparison_sheet_success(self, session, rm_token):
        """Retrieve a generated comparison sheet"""
        # First generate a sheet
        headers = {"Authorization": f"Bearer {rm_token}"}
        gen_response = session.post(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/comparison-sheet",
            json=TEST_VENUE_IDS[:3],
            headers=headers
        )
        assert gen_response.status_code == 200
        sheet_id = gen_response.json()["sheet_id"]
        
        # Now retrieve it (public endpoint - no auth needed)
        response = session.get(f"{BASE_URL}/api/comparison-sheets/{sheet_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["sheet_id"] == sheet_id
        assert "venues" in data
        assert "lead_id" in data
        assert "customer_name" in data
        assert "generated_at" in data
        assert "branding" in data
    
    def test_get_comparison_sheet_public_access(self, session):
        """Comparison sheet retrieval should be public (no auth required)"""
        # Use previously generated sheet ID if available
        if TestComparisonSheetGeneration.generated_sheet_id:
            sheet_id = TestComparisonSheetGeneration.generated_sheet_id
            response = session.get(f"{BASE_URL}/api/comparison-sheets/{sheet_id}")
            assert response.status_code == 200, "Public should be able to access comparison sheets"
        else:
            pytest.skip("No generated sheet ID available")
    
    def test_get_comparison_sheet_not_found(self, session):
        """Should return 404 for invalid sheet ID"""
        response = session.get(f"{BASE_URL}/api/comparison-sheets/comp_nonexistent123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()


# ============== PHASE 1: AUTH ROUTES REGRESSION ==============

class TestAuthRoutesRegression:
    """Verify Phase 1 auth routes still work after Phase 3 migration"""
    
    def test_login_rm_success(self, session):
        """RM login should work"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=RM_LOGIN)
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "rm"
    
    def test_login_admin_success(self, session):
        """Admin login should work"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_LOGIN)
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self, session):
        """Invalid login should return 401"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrong"}
        )
        assert response.status_code == 401
    
    def test_get_me_with_token(self, session, rm_token):
        """GET /api/auth/me should return user info"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
    
    def test_logout(self, session, rm_token):
        """Logout should work"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        
        assert response.status_code == 200


# ============== PHASE 1: VENUE ROUTES REGRESSION ==============

class TestVenueRoutesRegression:
    """Verify Phase 1 venue routes still work after Phase 3 migration"""
    
    def test_search_venues(self, session):
        """GET /api/venues should return venue list"""
        response = session.get(f"{BASE_URL}/api/venues")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            venue = data[0]
            assert "venue_id" in venue
            assert "name" in venue
    
    def test_search_venues_with_city_filter(self, session):
        """Venue search with city filter should work"""
        response = session.get(f"{BASE_URL}/api/venues", params={"city": "Mumbai"})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_venue_by_id(self, session):
        """GET /api/venues/{venue_id} should return venue details"""
        venue_id = TEST_VENUE_IDS[0]
        response = session.get(f"{BASE_URL}/api/venues/{venue_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["venue_id"] == venue_id
        assert "name" in data
        assert "pricing" in data


# ============== PHASE 2: AVAILABILITY ROUTES REGRESSION ==============

class TestAvailabilityRoutesRegression:
    """Verify Phase 2 availability routes still work after Phase 3 migration"""
    
    def test_get_venue_availability(self, session):
        """GET /api/venues/{venue_id}/availability should work"""
        venue_id = TEST_VENUE_IDS[0]
        response = session.get(f"{BASE_URL}/api/venues/{venue_id}/availability")
        
        assert response.status_code == 200
        data = response.json()
        assert "venue_id" in data
        assert "slots" in data
    
    def test_get_venue_availability_with_month(self, session):
        """Availability with month filter should work"""
        venue_id = TEST_VENUE_IDS[0]
        response = session.get(
            f"{BASE_URL}/api/venues/{venue_id}/availability",
            params={"month": "2026-03"}
        )
        
        assert response.status_code == 200
    
    def test_get_venue_holds(self, session, rm_token):
        """GET /api/venues/{venue_id}/holds should work"""
        venue_id = TEST_VENUE_IDS[0]
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.get(
            f"{BASE_URL}/api/venues/{venue_id}/holds",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "venue_id" in data
        assert "holds" in data
    
    def test_get_lead_holds(self, session, rm_token):
        """GET /api/leads/{lead_id}/holds should work"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/holds",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "lead_id" in data
        assert "holds" in data


# ============== LEGACY ROUTES (STILL IN SERVER.PY) ==============

class TestLegacyRoutesRegression:
    """Verify legacy routes in server.py still work"""
    
    def test_get_leads(self, session, rm_token):
        """GET /api/leads should work"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.get(f"{BASE_URL}/api/leads", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data or isinstance(data, list)
    
    def test_get_lead_by_id(self, session, rm_token):
        """GET /api/leads/{lead_id} should work"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("lead_id") == TEST_LEAD_ID
    
    def test_admin_control_room(self, session, admin_token):
        """GET /api/admin/control-room should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = session.get(
            f"{BASE_URL}/api/admin/control-room",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Control room should have metrics summary
        assert "metrics" in data or "current_month" in data
    
    def test_get_payments_for_lead(self, session, rm_token):
        """GET /api/payments/{lead_id} should work"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = session.get(
            f"{BASE_URL}/api/payments/{TEST_LEAD_ID}",
            headers=headers
        )
        
        # Payment endpoint may return 200 or 404 if no payments exist
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
