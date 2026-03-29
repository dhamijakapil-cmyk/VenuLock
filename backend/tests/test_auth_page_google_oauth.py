"""
Test suite for Auth Page restructure, Google OAuth infrastructure, and MyEnquiries enhancements.
Tests:
- Email OTP send endpoint
- Google OAuth config endpoint (returns enabled:false when no credentials)
- Google OAuth auth-url endpoint (returns 503 when no credentials)
- My-enquiries endpoint with last_activity enrichment
- My-enquiries activity endpoint
- Password login flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailOTPAuth:
    """Email OTP authentication tests"""
    
    def test_send_email_otp_success(self):
        """Test POST /api/auth/email-otp/send returns success"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "test_otp_user@example.com"}
        )
        # Should return 200 with success message
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data or "otp_sent" in data or "debug_otp" in data, f"Unexpected response: {data}"
        print(f"Email OTP send response: {data}")
    
    def test_send_email_otp_invalid_email(self):
        """Test POST /api/auth/email-otp/send with invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/email-otp/send",
            json={"email": "invalid-email"}
        )
        # Should return 400 or 422 for invalid email
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"


class TestGoogleOAuthConfig:
    """Google OAuth configuration tests - should be disabled without credentials"""
    
    def test_google_config_returns_disabled(self):
        """Test GET /api/auth/google/config returns enabled:false"""
        response = requests.get(f"{BASE_URL}/api/auth/google/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "enabled" in data, f"Missing 'enabled' field: {data}"
        # Since no GOOGLE_CLIENT_ID is set in .env, should be disabled
        assert data["enabled"] == False, f"Expected enabled:false, got {data}"
        print(f"Google OAuth config: {data}")
    
    def test_google_auth_url_returns_503(self):
        """Test POST /api/auth/google/auth-url returns 503 when not configured"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google/auth-url",
            json={"redirect_uri": "https://example.com/auth/google"}
        )
        # Should return 503 since Google OAuth is not configured
        assert response.status_code == 503, f"Expected 503, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, f"Missing error detail: {data}"
        print(f"Google auth-url response (expected 503): {data}")


class TestPasswordLogin:
    """Password-based login tests"""
    
    def test_password_login_success(self):
        """Test password login with democustomer credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, f"Missing token in response: {data}"
        assert "user" in data, f"Missing user in response: {data}"
        assert data["user"]["email"] == "democustomer@venulock.in"
        assert data["user"]["role"] == "customer"
        print(f"Password login success: user_id={data['user'].get('user_id')}, role={data['user']['role']}")
        return data["token"]
    
    def test_password_login_invalid_credentials(self):
        """Test password login with wrong credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"


class TestMyEnquiriesWithLastActivity:
    """My-enquiries endpoint tests with last_activity enrichment"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for customer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate customer")
    
    def test_my_enquiries_returns_last_activity(self, auth_token):
        """Test GET /api/my-enquiries returns leads with last_activity object"""
        response = requests.get(
            f"{BASE_URL}/api/my-enquiries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"My-enquiries returned {len(data)} leads")
        
        # Check that each lead has last_activity
        for lead in data:
            assert "last_activity" in lead, f"Missing last_activity in lead: {lead.get('lead_id')}"
            last_activity = lead["last_activity"]
            assert "message" in last_activity, f"Missing message in last_activity: {last_activity}"
            assert "at" in last_activity, f"Missing 'at' timestamp in last_activity: {last_activity}"
            print(f"Lead {lead.get('lead_id')}: last_activity = {last_activity}")
    
    def test_my_enquiries_activity_endpoint(self, auth_token):
        """Test GET /api/my-enquiries/{lead_id}/activity returns activities array"""
        # First get a lead
        response = requests.get(
            f"{BASE_URL}/api/my-enquiries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No enquiries found for customer")
        
        leads = response.json()
        lead_id = leads[0].get("lead_id")
        
        # Get activity for this lead
        activity_response = requests.get(
            f"{BASE_URL}/api/my-enquiries/{lead_id}/activity",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert activity_response.status_code == 200, f"Expected 200, got {activity_response.status_code}: {activity_response.text}"
        data = activity_response.json()
        assert "activities" in data, f"Missing activities in response: {data}"
        assert isinstance(data["activities"], list), f"activities should be a list: {data}"
        print(f"Lead {lead_id} has {len(data['activities'])} activities")
    
    def test_my_enquiries_activity_not_found(self, auth_token):
        """Test GET /api/my-enquiries/{lead_id}/activity returns 404 for non-existent lead"""
        response = requests.get(
            f"{BASE_URL}/api/my-enquiries/nonexistent_lead_123/activity",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


class TestNotificationsForBadge:
    """Test notifications endpoint used by BottomTabBar badge"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for customer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "democustomer@venulock.in",
                "password": "password123"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate customer")
    
    def test_notifications_unread_count(self, auth_token):
        """Test GET /api/notifications?limit=1&unread_only=true returns unread_count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=1&unread_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should have unread_count field
        assert "unread_count" in data, f"Missing unread_count in response: {data}"
        print(f"Notifications unread_count: {data.get('unread_count')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
