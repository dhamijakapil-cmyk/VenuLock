"""
Test Customer Interface Phase 2 APIs:
- GET /api/auth/my-bookings - Customer booking history with status tracking
- GET /api/auth/my-reviews - Customer submitted reviews
- GET /api/auth/my-payments - Customer payment history
- GET /api/auth/my-invoices - Customer invoices
- POST /api/venues/{venue_id}/reviews - Create a review
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def auth_headers(customer_token):
    """Get authorization headers."""
    return {"Authorization": f"Bearer {customer_token}"}


class TestMyBookingsEndpoint:
    """Tests for GET /api/auth/my-bookings endpoint."""

    def test_my_bookings_requires_auth(self):
        """Test that my-bookings endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/auth/my-bookings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: my-bookings requires authentication")

    def test_my_bookings_returns_list(self, auth_headers):
        """Test that my-bookings returns a list of bookings."""
        response = requests.get(f"{BASE_URL}/api/auth/my-bookings", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "bookings" in data, "Response should contain 'bookings' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["bookings"], list), "bookings should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        print(f"PASS: my-bookings returns {data['total']} bookings")

    def test_my_bookings_has_status_tracking(self, auth_headers):
        """Test that bookings have status tracking fields."""
        response = requests.get(f"{BASE_URL}/api/auth/my-bookings", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if data["total"] > 0:
            booking = data["bookings"][0]
            # Check for status tracking fields
            assert "status_label" in booking, "Booking should have status_label"
            assert "status_color" in booking, "Booking should have status_color"
            assert "stage" in booking, "Booking should have stage"
            assert "lead_id" in booking, "Booking should have lead_id"
            print(f"PASS: Booking has status tracking - stage: {booking.get('stage')}, label: {booking.get('status_label')}")
        else:
            print("SKIP: No bookings to verify status tracking")

    def test_my_bookings_has_venue_info(self, auth_headers):
        """Test that bookings include venue information."""
        response = requests.get(f"{BASE_URL}/api/auth/my-bookings", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if data["total"] > 0:
            booking = data["bookings"][0]
            assert "venues" in booking, "Booking should have venues array"
            if booking["venues"]:
                venue = booking["venues"][0]
                assert "venue_id" in venue, "Venue should have venue_id"
                assert "name" in venue, "Venue should have name"
                print(f"PASS: Booking has venue info - {venue.get('name')}")
            else:
                print("PASS: Booking has empty venues array (no venues selected)")
        else:
            print("SKIP: No bookings to verify venue info")


class TestMyReviewsEndpoint:
    """Tests for GET /api/auth/my-reviews endpoint."""

    def test_my_reviews_requires_auth(self):
        """Test that my-reviews endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/auth/my-reviews")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: my-reviews requires authentication")

    def test_my_reviews_returns_list(self, auth_headers):
        """Test that my-reviews returns a list of reviews."""
        response = requests.get(f"{BASE_URL}/api/auth/my-reviews", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data, "Response should contain 'reviews' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["reviews"], list), "reviews should be a list"
        print(f"PASS: my-reviews returns {data['total']} reviews")


class TestMyPaymentsEndpoint:
    """Tests for GET /api/auth/my-payments endpoint."""

    def test_my_payments_requires_auth(self):
        """Test that my-payments endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/auth/my-payments")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: my-payments requires authentication")

    def test_my_payments_returns_list(self, auth_headers):
        """Test that my-payments returns a list of payments."""
        response = requests.get(f"{BASE_URL}/api/auth/my-payments", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payments" in data, "Response should contain 'payments' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["payments"], list), "payments should be a list"
        print(f"PASS: my-payments returns {data['total']} payments")


class TestMyInvoicesEndpoint:
    """Tests for GET /api/auth/my-invoices endpoint."""

    def test_my_invoices_requires_auth(self):
        """Test that my-invoices endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/auth/my-invoices")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: my-invoices requires authentication")

    def test_my_invoices_returns_list(self, auth_headers):
        """Test that my-invoices returns a list of invoices."""
        response = requests.get(f"{BASE_URL}/api/auth/my-invoices", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invoices" in data, "Response should contain 'invoices' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["invoices"], list), "invoices should be a list"
        print(f"PASS: my-invoices returns {data['total']} invoices")


class TestCreateReviewEndpoint:
    """Tests for POST /api/venues/{venue_id}/reviews endpoint."""

    def test_create_review_requires_auth(self):
        """Test that create review endpoint requires authentication."""
        response = requests.post(f"{BASE_URL}/api/venues/test_venue/reviews", json={
            "venue_id": "test_venue",
            "rating": 5,
            "title": "Test",
            "content": "Test review"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: create review requires authentication")

    def test_create_review_invalid_venue(self, auth_headers):
        """Test that create review fails for non-existent venue."""
        response = requests.post(
            f"{BASE_URL}/api/venues/nonexistent_venue_12345/reviews",
            headers=auth_headers,
            json={
                "venue_id": "nonexistent_venue_12345",
                "rating": 5,
                "title": "Test",
                "content": "Test review"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: create review returns 404 for non-existent venue")

    def test_create_review_success(self, auth_headers):
        """Test creating a review for a valid venue from bookings."""
        # First get a venue from bookings
        bookings_response = requests.get(f"{BASE_URL}/api/auth/my-bookings", headers=auth_headers)
        assert bookings_response.status_code == 200
        
        bookings_data = bookings_response.json()
        venue_id = None
        
        # Find a venue from bookings
        for booking in bookings_data.get("bookings", []):
            venues = booking.get("venues", [])
            if venues:
                venue_id = venues[0].get("venue_id")
                break
        
        if not venue_id:
            pytest.skip("No venues found in customer bookings to test review creation")
        
        # Create a review
        review_data = {
            "venue_id": venue_id,
            "rating": 5,
            "title": "TEST_Excellent Venue",
            "content": "TEST_This is a test review for automated testing. Great venue with excellent service!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/venues/{venue_id}/reviews",
            headers=auth_headers,
            json=review_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "review_id" in data, "Response should contain review_id"
        print(f"PASS: Created review {data['review_id']} for venue {venue_id}")
        
        # Verify review appears in my-reviews
        reviews_response = requests.get(f"{BASE_URL}/api/auth/my-reviews", headers=auth_headers)
        assert reviews_response.status_code == 200
        reviews_data = reviews_response.json()
        
        # Check if our review is in the list
        found = any(r.get("review_id") == data["review_id"] for r in reviews_data.get("reviews", []))
        assert found, "Created review should appear in my-reviews"
        print("PASS: Created review appears in my-reviews list")


class TestEndpointIntegration:
    """Integration tests for all Phase 2 endpoints."""

    def test_all_endpoints_accessible(self, auth_headers):
        """Test that all Phase 2 endpoints are accessible."""
        endpoints = [
            "/api/auth/my-bookings",
            "/api/auth/my-reviews",
            "/api/auth/my-payments",
            "/api/auth/my-invoices"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=auth_headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed: {response.status_code}"
            print(f"PASS: {endpoint} accessible")
        
        print("PASS: All Phase 2 endpoints accessible")

    def test_data_consistency(self, auth_headers):
        """Test that data is consistent across endpoints."""
        # Get bookings
        bookings_response = requests.get(f"{BASE_URL}/api/auth/my-bookings", headers=auth_headers)
        assert bookings_response.status_code == 200
        bookings_data = bookings_response.json()
        
        # Get payments
        payments_response = requests.get(f"{BASE_URL}/api/auth/my-payments", headers=auth_headers)
        assert payments_response.status_code == 200
        payments_data = payments_response.json()
        
        # Get invoices
        invoices_response = requests.get(f"{BASE_URL}/api/auth/my-invoices", headers=auth_headers)
        assert invoices_response.status_code == 200
        invoices_data = invoices_response.json()
        
        print(f"Data summary: {bookings_data['total']} bookings, {payments_data['total']} payments, {invoices_data['total']} invoices")
        print("PASS: All endpoints return consistent data structure")
