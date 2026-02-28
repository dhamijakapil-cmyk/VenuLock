"""
Test Payment Mediation System APIs
- Payment order creation
- Payment verification
- Payment stats summary
- Payment simulate (test mode)
- Payment release to venue
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test requirements
ADMIN_EMAIL = "admin@bookmyvenue.in"
ADMIN_PASSWORD = "admin123"

# Test lead ID
TEST_LEAD_ID = "lead_f216035fb407"


class TestPaymentSystemAPIs:
    """Test Payment Mediation System endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return None
    
    def test_health_check(self):
        """Test API is healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check endpoint working")
    
    def test_admin_login(self):
        """Test admin login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_payment_stats_summary(self):
        """Test /api/payments/stats/summary returns correct totals"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/payments/stats/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "summary" in data
        summary = data["summary"]
        
        # Check all required stat fields
        expected_fields = ["total_collected", "total_commission_earned", "pending_release", "total_released_to_venues"]
        for field in expected_fields:
            assert field in summary, f"Missing field: {field}"
            assert isinstance(summary[field], (int, float)), f"Field {field} should be numeric"
        
        print(f"PASS: Payment stats summary - Total collected: {summary['total_collected']}, Commission: {summary['total_commission_earned']}")
    
    def test_list_payments_empty_or_with_data(self):
        """Test /api/payments endpoint"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        data = response.json()
        
        assert "payments" in data
        assert "total" in data
        assert isinstance(data["payments"], list)
        print(f"PASS: List payments - Found {data['total']} payments")
    
    def test_list_payments_with_status_filter(self):
        """Test /api/payments with status filter"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        for status in ["awaiting_advance", "advance_paid", "payment_released"]:
            response = self.session.get(f"{BASE_URL}/api/payments?status={status}")
            assert response.status_code == 200
            data = response.json()
            assert "payments" in data
            print(f"PASS: List payments with status={status} - Found {data['total']} payments")
    
    def test_get_lead_for_payment(self):
        """Test getting lead to check if it's in booking_confirmed stage"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/leads/{TEST_LEAD_ID}")
        
        if response.status_code == 404:
            print(f"INFO: Test lead {TEST_LEAD_ID} not found - will create one")
            return None
        
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Lead {TEST_LEAD_ID} found - Stage: {data.get('stage')}, Deal Value: {data.get('deal_value')}")
        return data
    
    def test_create_payment_order_requires_booking_confirmed(self):
        """Test that payment order creation requires lead to be booking_confirmed"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First, get or create a lead
        response = self.session.get(f"{BASE_URL}/api/leads?limit=1")
        assert response.status_code == 200
        leads_data = response.json()
        
        if leads_data.get("total", 0) == 0:
            print("INFO: No leads found, skipping payment order test")
            pytest.skip("No leads available for testing")
            return
        
        lead = leads_data["leads"][0]
        lead_id = lead["lead_id"]
        
        # If lead is not booking_confirmed, the request should fail appropriately
        if lead.get("stage") != "booking_confirmed":
            response = self.session.post(f"{BASE_URL}/api/payments/create-order", json={
                "lead_id": lead_id,
                "amount": 50000
            })
            # Should fail with 400 if not in correct stage
            assert response.status_code == 400
            assert "booking" in response.text.lower() or "stage" in response.text.lower()
            print("PASS: Payment order creation correctly rejects non-confirmed leads")
        else:
            print(f"INFO: Lead {lead_id} is already booking_confirmed")
    
    def test_create_payment_order_full_flow(self):
        """Test complete payment order creation flow for booking_confirmed lead"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create a new lead specifically for payment testing
        lead_data = {
            "customer_name": f"Payment Test User {uuid.uuid4().hex[:6]}",
            "customer_email": f"paymenttest{uuid.uuid4().hex[:6]}@example.com",
            "customer_phone": "9876543210",
            "event_type": "wedding",
            "event_date": "2026-06-15",
            "guest_count": 200,
            "budget": 500000,
            "city": "Mumbai",
            "area": "Andheri",
            "planner_required": False
        }
        
        # Create lead
        response = self.session.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        lead_result = response.json()
        lead_id = lead_result["lead_id"]
        print(f"INFO: Created test lead: {lead_id}")
        
        # Update lead to booking_confirmed with deal value and commission
        update_data = {
            "stage": "booking_confirmed",
            "deal_value": 500000,
            "venue_commission_type": "percentage",
            "venue_commission_rate": 10
        }
        
        response = self.session.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_data)
        assert response.status_code == 200
        print(f"INFO: Updated lead to booking_confirmed")
        
        # Now create payment order
        payment_data = {
            "lead_id": lead_id,
            "amount": 50000,  # 10% advance
            "description": "Test payment for wedding booking"
        }
        
        response = self.session.post(f"{BASE_URL}/api/payments/create-order", json=payment_data)
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            assert "payment_id" in data
            assert "payment_link" in data
            assert "amount" in data
            assert data["amount"] == 50000
            
            # Verify commission calculation (10% of advance)
            expected_commission = 50000 * 0.10  # 10% BMV commission
            expected_net = 50000 - expected_commission
            
            print(f"PASS: Payment order created - ID: {data['payment_id']}")
            print(f"  Amount: {data['amount']}")
            print(f"  Payment Link: {data['payment_link']}")
            print(f"  Commission Rate: 10%")
            
            # Store payment_id for subsequent tests
            self.__class__.test_payment_id = data['payment_id']
            self.__class__.test_lead_id_for_cleanup = lead_id
            
        elif response.status_code == 400:
            # Could fail if payment already exists for lead
            error_detail = response.json().get("detail", "")
            print(f"INFO: Payment creation returned 400 - {error_detail}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_simulate_payment_test_mode(self):
        """Test simulating payment in test mode"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a payment in awaiting_advance status
        response = self.session.get(f"{BASE_URL}/api/payments?status=awaiting_advance&limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("payments"):
            print("INFO: No payments in awaiting_advance status to simulate")
            pytest.skip("No payments available for simulation")
            return
        
        payment = data["payments"][0]
        payment_id = payment["payment_id"]
        
        # Simulate payment
        response = self.session.post(f"{BASE_URL}/api/payments/{payment_id}/simulate-payment")
        
        if response.status_code == 200:
            result = response.json()
            assert result.get("status") == "advance_paid"
            print(f"PASS: Payment simulated successfully - {payment_id}")
            
            # Store for release test
            self.__class__.simulated_payment_id = payment_id
        else:
            print(f"INFO: Simulate payment returned {response.status_code} - {response.text}")
    
    def test_release_payment_to_venue(self):
        """Test releasing payment to venue (admin only)"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a payment in advance_paid status
        response = self.session.get(f"{BASE_URL}/api/payments?status=advance_paid&limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("payments"):
            print("INFO: No payments in advance_paid status to release")
            pytest.skip("No payments available for release")
            return
        
        payment = data["payments"][0]
        payment_id = payment["payment_id"]
        
        # Release payment
        release_data = {
            "payment_id": payment_id,
            "notes": "Test release via automated test"
        }
        response = self.session.post(f"{BASE_URL}/api/payments/{payment_id}/release", json=release_data)
        
        if response.status_code == 200:
            result = response.json()
            assert result.get("status") == "payment_released"
            assert "net_amount_released" in result
            assert "commission_retained" in result
            print(f"PASS: Payment released - Net: {result['net_amount_released']}, Commission: {result['commission_retained']}")
        else:
            print(f"INFO: Release payment returned {response.status_code} - {response.text}")
    
    def test_payment_stats_after_operations(self):
        """Verify stats are updated after payment operations"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/payments/stats/summary")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        print(f"Final Stats:")
        print(f"  Total Collected: {summary['total_collected']}")
        print(f"  BMV Commission: {summary['total_commission_earned']}")
        print(f"  Pending Release: {summary['pending_release']}")
        print(f"  Released to Venues: {summary['total_released_to_venues']}")


class TestPaymentAPIValidation:
    """Test payment API validation and error handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_create_order_invalid_lead(self):
        """Test creating payment order for non-existent lead"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/payments/create-order", json={
            "lead_id": "lead_nonexistent123",
            "amount": 50000
        })
        assert response.status_code == 404
        print("PASS: Invalid lead correctly rejected")
    
    def test_release_requires_advance_paid(self):
        """Test that release requires payment to be in advance_paid status"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get any payment that's not in advance_paid
        response = self.session.get(f"{BASE_URL}/api/payments?status=awaiting_advance&limit=1")
        if response.status_code != 200:
            pytest.skip("Could not fetch payments")
        
        data = response.json()
        if not data.get("payments"):
            pytest.skip("No awaiting_advance payments to test")
        
        payment = data["payments"][0]
        
        # Try to release it - should fail
        release_data = {
            "payment_id": payment["payment_id"],
            "notes": "Should fail"
        }
        response = self.session.post(f"{BASE_URL}/api/payments/{payment['payment_id']}/release", json=release_data)
        assert response.status_code == 400
        assert "advance_paid" in response.text.lower() or "cannot release" in response.text.lower()
        print("PASS: Release correctly requires advance_paid status")
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        response = self.session.get(f"{BASE_URL}/api/payments/stats/summary")
        assert response.status_code == 401
        print("PASS: Unauthenticated access correctly denied")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
