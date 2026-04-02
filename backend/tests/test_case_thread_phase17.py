"""
Phase 17: Case Conversation Thread Tests
Tests for customer-RM messaging within case portal.
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

# Test lead with existing thread
TEST_LEAD_ID = "lead_21668ed1ecd9"


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Customer login failed")


@pytest.fixture(scope="module")
def rm_token():
    """Get RM auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("RM login failed")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Admin login failed")


class TestCaseThreadCustomerEndpoints:
    """Tests for customer-facing thread endpoints"""

    def test_customer_get_thread(self, customer_token):
        """Customer can retrieve their conversation thread"""
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "lead_id" in data
        assert "messages" in data
        assert "total" in data
        assert "rm_name" in data
        assert data["lead_id"] == TEST_LEAD_ID
        # Verify message structure
        if data["messages"]:
            msg = data["messages"][0]
            assert "message_id" in msg
            assert "text" in msg
            assert "sender_name" in msg
            assert "sender_role" in msg
            assert "role_label" in msg
            assert "is_customer" in msg
            assert "created_at" in msg
            # Customer view should NOT have sender_id (privacy)
            assert "sender_id" not in msg

    def test_customer_send_message(self, customer_token):
        """Customer can send a message in their case thread"""
        res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"text": "Test message from pytest - customer"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "message_id" in data
        assert data["message_id"].startswith("msg_")
        assert "created_at" in data

    def test_customer_send_empty_message_fails(self, customer_token):
        """Customer cannot send empty message"""
        res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"text": "   "}
        )
        assert res.status_code == 400
        assert "empty" in res.json().get("detail", "").lower()

    def test_customer_send_long_message_fails(self, customer_token):
        """Customer cannot send message over 2000 chars"""
        long_text = "x" * 2001
        res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"text": long_text}
        )
        assert res.status_code == 400
        assert "long" in res.json().get("detail", "").lower()

    def test_customer_get_unread_count(self, customer_token):
        """Customer can get unread message count"""
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/unread",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "unread" in data
        assert isinstance(data["unread"], int)

    def test_customer_cannot_access_other_case(self, customer_token):
        """Customer cannot access thread for case they don't own"""
        # Use a fake lead ID
        res = requests.get(
            f"{BASE_URL}/api/case-thread/lead_nonexistent/customer",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert res.status_code in [403, 404]


class TestCaseThreadInternalEndpoints:
    """Tests for internal (RM/Admin) thread endpoints"""

    def test_rm_get_thread(self, rm_token):
        """RM can retrieve full conversation thread"""
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "lead_id" in data
        assert "messages" in data
        assert "total" in data
        assert "unread_by_customer" in data
        # Internal view should have sender_id
        if data["messages"]:
            msg = data["messages"][0]
            assert "sender_id" in msg
            assert "sender_name" in msg
            assert "role_label" in msg

    def test_rm_send_message(self, rm_token):
        """RM can send a message in case thread"""
        res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"text": "Test reply from pytest - RM"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "message_id" in data
        assert data["message_id"].startswith("msg_")

    def test_admin_can_access_thread(self, admin_token):
        """Admin can access any case thread"""
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "messages" in data

    def test_admin_can_send_message(self, admin_token):
        """Admin can send message in case thread"""
        res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"text": "Test message from admin - pytest"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "message_id" in data

    def test_rm_get_unread_count(self, rm_token):
        """RM can get unread message count (customer messages)"""
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/unread",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "unread" in data
        assert isinstance(data["unread"], int)


class TestCaseThreadReadReceipts:
    """Tests for read receipt functionality"""

    def test_reading_thread_marks_messages_read(self, customer_token, rm_token):
        """Reading thread auto-marks messages as read"""
        # RM sends a message
        send_res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"text": "Message to test read receipt"}
        )
        assert send_res.status_code == 200

        # Customer should have unread
        unread_before = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/unread",
            headers={"Authorization": f"Bearer {customer_token}"}
        ).json().get("unread", 0)

        # Customer reads thread
        read_res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert read_res.status_code == 200

        # Unread should be 0 now
        unread_after = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/unread",
            headers={"Authorization": f"Bearer {customer_token}"}
        ).json().get("unread", 0)

        assert unread_after == 0


class TestCaseThreadRoleLabels:
    """Tests for role label display"""

    def test_customer_sees_role_labels(self, customer_token, rm_token):
        """Customer sees proper role labels for RM messages"""
        # RM sends message
        requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"text": "Testing role label display"}
        )

        # Customer reads thread
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert res.status_code == 200
        messages = res.json().get("messages", [])

        # Find RM message
        rm_messages = [m for m in messages if m.get("sender_role") == "rm"]
        if rm_messages:
            assert rm_messages[0]["role_label"] == "Relationship Manager"

        # Find customer message
        cust_messages = [m for m in messages if m.get("sender_role") == "customer"]
        if cust_messages:
            assert cust_messages[0]["role_label"] == "Customer"


class TestCaseThreadAccessControl:
    """Tests for access control"""

    def test_unauthenticated_cannot_access(self):
        """Unauthenticated user cannot access thread"""
        res = requests.get(f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/customer")
        assert res.status_code == 401

    def test_customer_cannot_use_internal_endpoint(self, customer_token):
        """Customer cannot use internal endpoint"""
        res = requests.get(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Should fail with 403 (role check) or 401
        assert res.status_code in [401, 403]

    def test_customer_cannot_post_to_internal(self, customer_token):
        """Customer cannot post to internal endpoint"""
        res = requests.post(
            f"{BASE_URL}/api/case-thread/{TEST_LEAD_ID}/internal",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"text": "Should fail"}
        )
        assert res.status_code in [401, 403]
