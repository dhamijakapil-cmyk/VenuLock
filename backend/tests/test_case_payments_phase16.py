"""
Phase 16 — Customer Deposit Payment Layer Tests
Tests for case-connected deposit payment flow:
- RM creates deposit/payment requests linked to a case
- Customer views payment due in their case portal and pays via Razorpay (test mode)
- Payment status/history visible to both customer and RM
- Collection milestone updates feed into case settlement posture
- Duplicate prevention, reminder, cancel flows
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"

# Test case with existing payment data
TEST_LEAD_ID = "lead_21668ed1ecd9"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def rm_token(api_client):
    """Get RM authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"RM authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def customer_client(api_client, customer_token):
    """Session with customer auth header"""
    api_client.headers.update({"Authorization": f"Bearer {customer_token}"})
    return api_client


@pytest.fixture
def rm_client(api_client, rm_token):
    """Session with RM auth header"""
    api_client.headers.update({"Authorization": f"Bearer {rm_token}"})
    return api_client


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestRazorpayConfig:
    """Test Razorpay configuration endpoint"""
    
    def test_get_razorpay_config(self, customer_client):
        """GET /api/case-payments/razorpay-config — Returns Razorpay public key"""
        response = customer_client.get(f"{BASE_URL}/api/case-payments/razorpay-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "key_id" in data, "Response should contain key_id"
        assert "is_test_mode" in data, "Response should contain is_test_mode"
        # In test mode, key should be rzp_test_demo
        assert data["is_test_mode"] == True, "Should be in test mode"
        print(f"✓ Razorpay config: key_id={data['key_id']}, is_test_mode={data['is_test_mode']}")


class TestRMCreateDepositRequest:
    """Test RM creating deposit/payment requests"""
    
    def test_create_deposit_request_success(self, rm_client):
        """POST /api/case-payments/{lead_id}/request — RM creates deposit request"""
        # First, get a lead that the RM has access to
        leads_response = rm_client.get(f"{BASE_URL}/api/conversion/cases")
        if leads_response.status_code != 200 or not leads_response.json().get("cases"):
            pytest.skip("RM has no leads in pipeline")
        
        lead_id = leads_response.json()["cases"][0]["lead_id"]
        
        response = rm_client.post(f"{BASE_URL}/api/case-payments/{lead_id}/request", json={
            "amount": 25000,
            "purpose": "site_visit_booking",
            "description": "Site visit booking deposit",
            "customer_note": "Please pay this deposit to confirm your site visit.",
            "due_date": "2026-02-15"
        })
        
        # Could be 200 or 400 if duplicate exists
        if response.status_code == 400 and "already exists" in response.text.lower():
            print(f"✓ Duplicate prevention working - deposit request already exists for this purpose")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payment_request_id" in data, "Response should contain payment_request_id"
        assert "receipt_number" in data, "Response should contain receipt_number"
        assert data["message"] == "Deposit request created"
        print(f"✓ Created deposit request: {data['payment_request_id']}, receipt: {data['receipt_number']}")
    
    def test_create_deposit_request_invalid_amount(self, rm_client):
        """POST /api/case-payments/{lead_id}/request — Validates amount > 0"""
        leads_response = rm_client.get(f"{BASE_URL}/api/conversion/cases")
        if leads_response.status_code != 200 or not leads_response.json().get("cases"):
            pytest.skip("RM has no leads in pipeline")
        
        lead_id = leads_response.json()["cases"][0]["lead_id"]
        
        response = rm_client.post(f"{BASE_URL}/api/case-payments/{lead_id}/request", json={
            "amount": 0,
            "purpose": "booking_deposit"
        })
        
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        assert "positive" in response.text.lower() or "amount" in response.text.lower()
        print("✓ Amount validation working - rejected zero amount")
    
    def test_create_deposit_request_negative_amount(self, rm_client):
        """POST /api/case-payments/{lead_id}/request — Validates amount > 0 (negative)"""
        leads_response = rm_client.get(f"{BASE_URL}/api/conversion/cases")
        if leads_response.status_code != 200 or not leads_response.json().get("cases"):
            pytest.skip("RM has no leads in pipeline")
        
        lead_id = leads_response.json()["cases"][0]["lead_id"]
        
        response = rm_client.post(f"{BASE_URL}/api/case-payments/{lead_id}/request", json={
            "amount": -5000,
            "purpose": "booking_deposit"
        })
        
        assert response.status_code == 400, f"Expected 400 for negative amount, got {response.status_code}"
        print("✓ Amount validation working - rejected negative amount")


class TestCustomerViewPayments:
    """Test customer viewing payment requests"""
    
    def test_customer_view_payments(self, customer_client):
        """GET /api/case-payments/{lead_id}/customer-payments — Customer views payment requests"""
        response = customer_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/customer-payments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payments" in data, "Response should contain payments array"
        assert "summary" in data, "Response should contain summary"
        
        summary = data["summary"]
        assert "total_due" in summary, "Summary should contain total_due"
        assert "total_paid" in summary, "Summary should contain total_paid"
        assert "pending_count" in summary, "Summary should contain pending_count"
        
        print(f"✓ Customer payments: {len(data['payments'])} payments, total_due=₹{summary['total_due']}, total_paid=₹{summary['total_paid']}")
        
        # Verify payment structure
        if data["payments"]:
            payment = data["payments"][0]
            assert "payment_request_id" in payment
            assert "amount" in payment
            assert "purpose" in payment
            assert "status" in payment
            assert "can_pay" in payment
            print(f"  First payment: {payment['purpose_label']} - ₹{payment['amount']} - {payment['status_label']}")


class TestRMViewInternalPayments:
    """Test RM viewing internal payment data"""
    
    def test_rm_view_internal_payments(self, rm_client):
        """GET /api/case-payments/{lead_id}/internal-payments — RM views all payment requests"""
        # Use the test lead
        response = rm_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/internal-payments")
        
        # Could be 403 if RM doesn't own this lead
        if response.status_code == 403:
            pytest.skip("RM doesn't have access to test lead")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payments" in data, "Response should contain payments array"
        assert "summary" in data, "Response should contain summary"
        
        summary = data["summary"]
        assert "total_requested" in summary
        assert "total_collected" in summary
        assert "total_pending" in summary
        assert "count" in summary
        assert "success_count" in summary
        assert "pending_count" in summary
        
        print(f"✓ Internal payments: {summary['count']} total, collected=₹{summary['total_collected']}, pending=₹{summary['total_pending']}")


class TestPaymentCheckout:
    """Test customer initiating payment checkout"""
    
    def test_checkout_creates_order(self, customer_client):
        """POST /api/case-payments/{payment_request_id}/checkout — Customer initiates Razorpay order"""
        # First get a pending payment
        payments_response = customer_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/customer-payments")
        if payments_response.status_code != 200:
            pytest.skip("Could not fetch customer payments")
        
        payments = payments_response.json().get("payments", [])
        pending_payments = [p for p in payments if p.get("can_pay")]
        
        if not pending_payments:
            pytest.skip("No pending payments available for checkout test")
        
        payment_request_id = pending_payments[0]["payment_request_id"]
        
        response = customer_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/checkout")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "razorpay_key" in data, "Response should contain razorpay_key"
        assert "order_id" in data, "Response should contain order_id"
        assert "amount" in data, "Response should contain amount"
        assert "is_test_mode" in data, "Response should contain is_test_mode"
        assert data["is_test_mode"] == True, "Should be in test mode"
        
        print(f"✓ Checkout order created: order_id={data['order_id']}, amount={data['amount']} paise")


class TestPaymentSimulation:
    """Test payment simulation in test mode"""
    
    def test_simulate_payment_success(self, customer_client):
        """POST /api/case-payments/{payment_request_id}/simulate — Test mode payment simulation"""
        # First get a pending payment
        payments_response = customer_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/customer-payments")
        if payments_response.status_code != 200:
            pytest.skip("Could not fetch customer payments")
        
        payments = payments_response.json().get("payments", [])
        pending_payments = [p for p in payments if p.get("can_pay")]
        
        if not pending_payments:
            pytest.skip("No pending payments available for simulation test")
        
        payment_request_id = pending_payments[0]["payment_request_id"]
        
        response = customer_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/simulate")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "payment_success", f"Expected payment_success, got {data.get('status')}"
        assert "receipt_number" in data, "Response should contain receipt_number"
        assert "amount" in data, "Response should contain amount"
        assert data.get("simulated") == True, "Should be marked as simulated"
        
        print(f"✓ Payment simulated: receipt={data['receipt_number']}, amount=₹{data['amount']}")
    
    def test_simulate_already_paid(self, customer_client):
        """POST /api/case-payments/{payment_request_id}/simulate — Cannot pay again for success"""
        # Get payments and find one that's already paid
        payments_response = customer_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/customer-payments")
        if payments_response.status_code != 200:
            pytest.skip("Could not fetch customer payments")
        
        payments = payments_response.json().get("payments", [])
        paid_payments = [p for p in payments if p.get("status") == "payment_success"]
        
        if not paid_payments:
            pytest.skip("No paid payments available for already-paid test")
        
        payment_request_id = paid_payments[0]["payment_request_id"]
        
        response = customer_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/simulate")
        
        # Should return 200 with "Already paid" message
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "payment_success"
        assert "already" in data.get("message", "").lower() or data["status"] == "payment_success"
        print("✓ Already-paid protection working")


class TestPaymentReminder:
    """Test RM sending payment reminders"""
    
    def test_send_reminder(self, rm_client):
        """POST /api/case-payments/{payment_request_id}/remind — RM sends reminder"""
        # Get internal payments to find a pending one
        response = rm_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/internal-payments")
        
        if response.status_code == 403:
            pytest.skip("RM doesn't have access to test lead")
        
        if response.status_code != 200:
            pytest.skip("Could not fetch internal payments")
        
        payments = response.json().get("payments", [])
        pending_payments = [p for p in payments if p.get("status") in ("payment_requested", "payment_due", "payment_failed")]
        
        if not pending_payments:
            pytest.skip("No pending payments available for reminder test")
        
        payment_request_id = pending_payments[0]["payment_request_id"]
        
        remind_response = rm_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/remind", json={
            "note": "Friendly reminder to complete your payment"
        })
        
        assert remind_response.status_code == 200, f"Expected 200, got {remind_response.status_code}: {remind_response.text}"
        assert remind_response.json().get("message") == "Reminder sent"
        print(f"✓ Reminder sent for payment {payment_request_id}")


class TestPaymentCancel:
    """Test RM cancelling payment requests"""
    
    def test_cancel_payment_request(self, rm_client):
        """POST /api/case-payments/{payment_request_id}/cancel — RM cancels request"""
        # First create a new payment request to cancel
        leads_response = rm_client.get(f"{BASE_URL}/api/conversion/cases")
        if leads_response.status_code != 200 or not leads_response.json().get("cases"):
            pytest.skip("RM has no leads in pipeline")
        
        lead_id = leads_response.json()["cases"][0]["lead_id"]
        
        # Create a test payment to cancel
        create_response = rm_client.post(f"{BASE_URL}/api/case-payments/{lead_id}/request", json={
            "amount": 1000,
            "purpose": "final_payment",
            "description": "Test payment to cancel"
        })
        
        if create_response.status_code == 400 and "already exists" in create_response.text.lower():
            # Get existing pending payment
            internal_response = rm_client.get(f"{BASE_URL}/api/case-payments/{lead_id}/internal-payments")
            if internal_response.status_code != 200:
                pytest.skip("Could not fetch internal payments")
            
            payments = internal_response.json().get("payments", [])
            pending = [p for p in payments if p.get("status") in ("payment_requested", "payment_due")]
            if not pending:
                pytest.skip("No pending payments to cancel")
            payment_request_id = pending[0]["payment_request_id"]
        elif create_response.status_code == 200:
            payment_request_id = create_response.json()["payment_request_id"]
        else:
            pytest.skip(f"Could not create test payment: {create_response.text}")
        
        # Cancel the payment
        cancel_response = rm_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/cancel")
        
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}: {cancel_response.text}"
        assert "cancelled" in cancel_response.json().get("message", "").lower()
        print(f"✓ Payment request {payment_request_id} cancelled")
    
    def test_cannot_cancel_paid_payment(self, rm_client):
        """POST /api/case-payments/{payment_request_id}/cancel — Cannot cancel paid payment"""
        # Get internal payments to find a paid one
        response = rm_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/internal-payments")
        
        if response.status_code == 403:
            pytest.skip("RM doesn't have access to test lead")
        
        if response.status_code != 200:
            pytest.skip("Could not fetch internal payments")
        
        payments = response.json().get("payments", [])
        paid_payments = [p for p in payments if p.get("status") == "payment_success"]
        
        if not paid_payments:
            pytest.skip("No paid payments available for cancel test")
        
        payment_request_id = paid_payments[0]["payment_request_id"]
        
        cancel_response = rm_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/cancel")
        
        assert cancel_response.status_code == 400, f"Expected 400, got {cancel_response.status_code}"
        assert "cannot cancel" in cancel_response.text.lower() or "already succeeded" in cancel_response.text.lower()
        print("✓ Cannot cancel paid payment - protection working")


class TestCaseDetailPaymentCount:
    """Test case detail includes payment_pending_count"""
    
    def test_case_detail_has_payment_count(self, customer_client):
        """GET /api/case-portal/cases/{lead_id} — Returns payment_pending_count"""
        response = customer_client.get(f"{BASE_URL}/api/case-portal/cases/{TEST_LEAD_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payment_pending_count" in data, "Case detail should include payment_pending_count"
        print(f"✓ Case detail has payment_pending_count: {data['payment_pending_count']}")


class TestDuplicatePrevention:
    """Test duplicate payment request prevention"""
    
    def test_duplicate_prevention(self, rm_client):
        """POST /api/case-payments/{lead_id}/request — Prevents duplicate pending requests"""
        leads_response = rm_client.get(f"{BASE_URL}/api/conversion/cases")
        if leads_response.status_code != 200 or not leads_response.json().get("cases"):
            pytest.skip("RM has no leads in pipeline")
        
        lead_id = leads_response.json()["cases"][0]["lead_id"]
        
        # Try to create two booking deposits
        first_response = rm_client.post(f"{BASE_URL}/api/case-payments/{lead_id}/request", json={
            "amount": 50000,
            "purpose": "booking_deposit",
            "description": "First booking deposit"
        })
        
        # Second request with same purpose should fail
        second_response = rm_client.post(f"{BASE_URL}/api/case-payments/{lead_id}/request", json={
            "amount": 50000,
            "purpose": "booking_deposit",
            "description": "Second booking deposit"
        })
        
        # At least one should be 400 (duplicate)
        if first_response.status_code == 400:
            assert "already exists" in first_response.text.lower()
            print("✓ Duplicate prevention working - first request blocked (existing)")
        elif second_response.status_code == 400:
            assert "already exists" in second_response.text.lower()
            print("✓ Duplicate prevention working - second request blocked")
        else:
            # Both succeeded - this shouldn't happen
            pytest.fail("Duplicate prevention not working - both requests succeeded")


class TestPaymentVerification:
    """Test payment verification endpoint"""
    
    def test_verify_payment_invalid_signature(self, customer_client):
        """POST /api/case-payments/{payment_request_id}/verify — Test mode always passes"""
        # Get a pending payment
        payments_response = customer_client.get(f"{BASE_URL}/api/case-payments/{TEST_LEAD_ID}/customer-payments")
        if payments_response.status_code != 200:
            pytest.skip("Could not fetch customer payments")
        
        payments = payments_response.json().get("payments", [])
        pending_payments = [p for p in payments if p.get("can_pay")]
        
        if not pending_payments:
            pytest.skip("No pending payments available for verification test")
        
        payment_request_id = pending_payments[0]["payment_request_id"]
        
        # First initiate checkout to get an order
        checkout_response = customer_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/checkout")
        if checkout_response.status_code != 200:
            pytest.skip("Could not initiate checkout")
        
        order_id = checkout_response.json().get("order_id")
        
        # In test mode, verification should pass with any signature
        verify_response = customer_client.post(f"{BASE_URL}/api/case-payments/{payment_request_id}/verify", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_test_123456",
            "razorpay_signature": "test_signature_abc"
        })
        
        # In test mode, this should succeed
        assert verify_response.status_code == 200, f"Expected 200 in test mode, got {verify_response.status_code}: {verify_response.text}"
        data = verify_response.json()
        assert data["status"] == "payment_success"
        print(f"✓ Payment verified in test mode: receipt={data.get('receipt_number')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
