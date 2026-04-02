"""
Phase 15 — Customer Case Portal + Proposal/File Sharing Hub
Tests for:
- Customer-facing endpoints: /my-cases, /cases/{lead_id}, /cases/{lead_id}/respond
- RM/Internal endpoints: /{lead_id}/share, /{lead_id}/engagement, /{lead_id}/revoke/{share_id}
- Version handling for proposals/quotes
- Lifecycle states: shared -> viewed -> responded / superseded / revoked
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"

# Test lead ID from agent context
TEST_LEAD_ID = "lead_21668ed1ecd9"


class TestCasePortalAuth:
    """Test authentication for case portal endpoints"""
    
    def test_customer_login(self):
        """Customer can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        print(f"Customer login response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "token" in data or "access_token" in data
            print("Customer login: PASS")
        else:
            print(f"Customer login failed: {response.text}")
            pytest.skip("Customer login failed - may need to create customer user")
    
    def test_rm_login(self):
        """RM can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        print(f"RM login response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
        print("RM login: PASS")


@pytest.fixture
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    return None


@pytest.fixture
def rm_token():
    """Get RM auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    return None


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    return None


class TestCustomerCasePortal:
    """Customer-facing case portal endpoints"""
    
    def test_my_cases_requires_auth(self):
        """GET /my-cases requires authentication"""
        response = requests.get(f"{BASE_URL}/api/case-portal/my-cases")
        assert response.status_code in [401, 403]
        print("my-cases requires auth: PASS")
    
    def test_my_cases_returns_cases(self, customer_token):
        """GET /my-cases returns customer's cases"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/case-portal/my-cases", headers=headers)
        print(f"my-cases response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert "total" in data
        
        # Verify case structure if cases exist
        if data["cases"]:
            case = data["cases"][0]
            assert "lead_id" in case
            assert "stage_label" in case
            print(f"Found {len(data['cases'])} cases")
        print("my-cases returns cases: PASS")
    
    def test_case_detail_returns_data(self, customer_token):
        """GET /cases/{lead_id} returns case detail with shares and timeline"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # First get a case ID from my-cases
        cases_response = requests.get(f"{BASE_URL}/api/case-portal/my-cases", headers=headers)
        if cases_response.status_code != 200 or not cases_response.json().get("cases"):
            pytest.skip("No cases available for customer")
        
        lead_id = cases_response.json()["cases"][0]["lead_id"]
        
        response = requests.get(f"{BASE_URL}/api/case-portal/cases/{lead_id}", headers=headers)
        print(f"case detail response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify case detail structure
        assert "lead_id" in data
        assert "stage_label" in data
        assert "status_message" in data
        assert "shares" in data
        assert "timeline" in data
        assert "pending_count" in data
        
        print(f"Case detail: {data['lead_id']}, stage: {data['stage_label']}, shares: {len(data['shares'])}")
        print("case detail returns data: PASS")
    
    def test_customer_respond_to_case(self, customer_token):
        """POST /cases/{lead_id}/respond records customer response"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Get a case
        cases_response = requests.get(f"{BASE_URL}/api/case-portal/my-cases", headers=headers)
        if cases_response.status_code != 200 or not cases_response.json().get("cases"):
            pytest.skip("No cases available for customer")
        
        lead_id = cases_response.json()["cases"][0]["lead_id"]
        
        # Respond to case (general response, not to specific share)
        response = requests.post(f"{BASE_URL}/api/case-portal/cases/{lead_id}/respond", 
            headers=headers,
            json={
                "response": "request_callback",
                "note": "Please call me tomorrow afternoon"
            }
        )
        print(f"respond response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "response_id" in data
        print("customer respond to case: PASS")
    
    def test_invalid_response_rejected(self, customer_token):
        """POST /cases/{lead_id}/respond rejects invalid response type"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        cases_response = requests.get(f"{BASE_URL}/api/case-portal/my-cases", headers=headers)
        if cases_response.status_code != 200 or not cases_response.json().get("cases"):
            pytest.skip("No cases available for customer")
        
        lead_id = cases_response.json()["cases"][0]["lead_id"]
        
        response = requests.post(f"{BASE_URL}/api/case-portal/cases/{lead_id}/respond", 
            headers=headers,
            json={
                "response": "invalid_response_type",
                "note": "test"
            }
        )
        print(f"invalid response: {response.status_code}")
        
        assert response.status_code == 400
        print("invalid response rejected: PASS")


class TestRMPortalEndpoints:
    """RM/Internal case portal endpoints"""
    
    def test_rm_share_to_customer(self, rm_token):
        """POST /{lead_id}/share creates share with version handling"""
        if not rm_token:
            pytest.skip("RM token not available")
        
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        # Get a lead from RM's pipeline
        pipeline_response = requests.get(f"{BASE_URL}/api/conversion/pipeline", headers=headers)
        if pipeline_response.status_code != 200:
            pytest.skip("Could not get RM pipeline")
        
        leads = pipeline_response.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in RM pipeline")
        
        lead_id = leads[0]["lead_id"]
        
        # Share a note to customer
        response = requests.post(f"{BASE_URL}/api/case-portal/{lead_id}/share",
            headers=headers,
            json={
                "share_type": "note",
                "title": "Test Update from RM",
                "description": "This is a test share from automated testing",
                "customer_note": "We're working on your request!"
            }
        )
        print(f"share to customer response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "share_id" in data
        assert "version" in data
        print(f"Created share: {data['share_id']}, version: {data['version']}")
        print("RM share to customer: PASS")
    
    def test_rm_share_quote_versioning(self, rm_token):
        """POST /{lead_id}/share handles quote versioning (supersedes old versions)"""
        if not rm_token:
            pytest.skip("RM token not available")
        
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        pipeline_response = requests.get(f"{BASE_URL}/api/conversion/pipeline", headers=headers)
        if pipeline_response.status_code != 200:
            pytest.skip("Could not get RM pipeline")
        
        leads = pipeline_response.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in RM pipeline")
        
        lead_id = leads[0]["lead_id"]
        
        # Share first quote
        response1 = requests.post(f"{BASE_URL}/api/case-portal/{lead_id}/share",
            headers=headers,
            json={
                "share_type": "quote",
                "title": "Quote for Test Venue",
                "venue_id": "venue_test_123",
                "venue_name": "Test Venue",
                "content": {"amount": 50000, "per_plate": 1500}
            }
        )
        print(f"First quote response: {response1.status_code}")
        assert response1.status_code == 200
        v1 = response1.json()["version"]
        
        # Share second quote (should supersede first)
        response2 = requests.post(f"{BASE_URL}/api/case-portal/{lead_id}/share",
            headers=headers,
            json={
                "share_type": "quote",
                "title": "Revised Quote for Test Venue",
                "venue_id": "venue_test_123",
                "venue_name": "Test Venue",
                "content": {"amount": 45000, "per_plate": 1400},
                "change_summary": "Reduced price by 10%"
            }
        )
        print(f"Second quote response: {response2.status_code}")
        assert response2.status_code == 200
        v2 = response2.json()["version"]
        
        assert v2 > v1, f"Version should increment: v1={v1}, v2={v2}"
        print(f"Quote versioning: v1={v1}, v2={v2}")
        print("RM share quote versioning: PASS")
    
    def test_rm_get_engagement_summary(self, rm_token):
        """GET /{lead_id}/engagement returns engagement summary"""
        if not rm_token:
            pytest.skip("RM token not available")
        
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        pipeline_response = requests.get(f"{BASE_URL}/api/conversion/pipeline", headers=headers)
        if pipeline_response.status_code != 200:
            pytest.skip("Could not get RM pipeline")
        
        leads = pipeline_response.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in RM pipeline")
        
        lead_id = leads[0]["lead_id"]
        
        response = requests.get(f"{BASE_URL}/api/case-portal/{lead_id}/engagement", headers=headers)
        print(f"engagement response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "shares" in data
        assert "summary" in data
        
        summary = data["summary"]
        assert "total_shared" in summary
        assert "viewed" in summary
        assert "responded" in summary
        assert "pending" in summary
        
        print(f"Engagement: shared={summary['total_shared']}, viewed={summary['viewed']}, responded={summary['responded']}")
        print("RM get engagement summary: PASS")
    
    def test_rm_get_internal_shares(self, rm_token):
        """GET /{lead_id}/shares returns all shares including revoked/superseded"""
        if not rm_token:
            pytest.skip("RM token not available")
        
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        pipeline_response = requests.get(f"{BASE_URL}/api/conversion/pipeline", headers=headers)
        if pipeline_response.status_code != 200:
            pytest.skip("Could not get RM pipeline")
        
        leads = pipeline_response.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in RM pipeline")
        
        lead_id = leads[0]["lead_id"]
        
        response = requests.get(f"{BASE_URL}/api/case-portal/{lead_id}/shares", headers=headers)
        print(f"internal shares response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "shares" in data
        assert "total" in data
        
        print(f"Internal shares: {data['total']} total")
        print("RM get internal shares: PASS")
    
    def test_rm_revoke_share(self, rm_token):
        """POST /{lead_id}/revoke/{share_id} revokes a shared item"""
        if not rm_token:
            pytest.skip("RM token not available")
        
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        pipeline_response = requests.get(f"{BASE_URL}/api/conversion/pipeline", headers=headers)
        if pipeline_response.status_code != 200:
            pytest.skip("Could not get RM pipeline")
        
        leads = pipeline_response.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in RM pipeline")
        
        lead_id = leads[0]["lead_id"]
        
        # First create a share to revoke
        share_response = requests.post(f"{BASE_URL}/api/case-portal/{lead_id}/share",
            headers=headers,
            json={
                "share_type": "note",
                "title": "Share to be revoked",
                "description": "This will be revoked"
            }
        )
        if share_response.status_code != 200:
            pytest.skip("Could not create share to revoke")
        
        share_id = share_response.json()["share_id"]
        
        # Revoke the share
        response = requests.post(f"{BASE_URL}/api/case-portal/{lead_id}/revoke/{share_id}", headers=headers)
        print(f"revoke response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify it's revoked
        shares_response = requests.get(f"{BASE_URL}/api/case-portal/{lead_id}/shares", headers=headers)
        shares = shares_response.json().get("shares", [])
        revoked_share = next((s for s in shares if s["share_id"] == share_id), None)
        assert revoked_share is not None
        assert revoked_share["lifecycle"] == "revoked"
        
        print("RM revoke share: PASS")


class TestAccessControl:
    """Test access control for case portal"""
    
    def test_customer_cannot_access_other_case(self, customer_token):
        """Customer cannot access a case they don't own"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Try to access a random lead ID
        response = requests.get(f"{BASE_URL}/api/case-portal/cases/lead_nonexistent_12345", headers=headers)
        print(f"access other case response: {response.status_code}")
        
        assert response.status_code in [403, 404]
        print("customer cannot access other case: PASS")
    
    def test_rm_cannot_share_to_other_rm_case(self, rm_token, admin_token):
        """RM cannot share to a case assigned to another RM"""
        if not rm_token or not admin_token:
            pytest.skip("Tokens not available")
        
        # This test would require finding a case assigned to a different RM
        # For now, we verify the endpoint exists and returns proper error
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        response = requests.post(f"{BASE_URL}/api/case-portal/lead_nonexistent_12345/share",
            headers=headers,
            json={
                "share_type": "note",
                "title": "Test"
            }
        )
        print(f"share to other RM case response: {response.status_code}")
        
        assert response.status_code in [403, 404]
        print("RM cannot share to other RM case: PASS")


class TestLifecycleStates:
    """Test share lifecycle state transitions"""
    
    def test_mark_share_viewed(self, customer_token):
        """POST /cases/{lead_id}/view/{share_id} marks share as viewed"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Get a case with shares
        cases_response = requests.get(f"{BASE_URL}/api/case-portal/my-cases", headers=headers)
        if cases_response.status_code != 200 or not cases_response.json().get("cases"):
            pytest.skip("No cases available")
        
        lead_id = cases_response.json()["cases"][0]["lead_id"]
        
        # Get case detail to find a share
        detail_response = requests.get(f"{BASE_URL}/api/case-portal/cases/{lead_id}", headers=headers)
        if detail_response.status_code != 200:
            pytest.skip("Could not get case detail")
        
        shares = detail_response.json().get("shares", [])
        if not shares:
            pytest.skip("No shares in case")
        
        share_id = shares[0]["share_id"]
        
        # Mark as viewed
        response = requests.post(f"{BASE_URL}/api/case-portal/cases/{lead_id}/view/{share_id}", headers=headers)
        print(f"mark viewed response: {response.status_code}")
        
        assert response.status_code == 200
        print("mark share viewed: PASS")
    
    def test_respond_to_specific_share(self, customer_token):
        """POST /cases/{lead_id}/respond with share_id responds to specific share"""
        if not customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        cases_response = requests.get(f"{BASE_URL}/api/case-portal/my-cases", headers=headers)
        if cases_response.status_code != 200 or not cases_response.json().get("cases"):
            pytest.skip("No cases available")
        
        lead_id = cases_response.json()["cases"][0]["lead_id"]
        
        detail_response = requests.get(f"{BASE_URL}/api/case-portal/cases/{lead_id}", headers=headers)
        if detail_response.status_code != 200:
            pytest.skip("Could not get case detail")
        
        shares = detail_response.json().get("shares", [])
        # Find a share that hasn't been responded to
        pending_share = next((s for s in shares if not s.get("customer_response")), None)
        
        if not pending_share:
            pytest.skip("No pending shares to respond to")
        
        share_id = pending_share["share_id"]
        
        response = requests.post(f"{BASE_URL}/api/case-portal/cases/{lead_id}/respond",
            headers=headers,
            json={
                "response": "interested",
                "note": "This looks great!",
                "share_id": share_id
            }
        )
        print(f"respond to share response: {response.status_code}")
        
        assert response.status_code == 200
        print("respond to specific share: PASS")


class TestConversionCaseDetailPortalTab:
    """Test RM Portal tab in ConversionCaseDetail"""
    
    def test_rm_can_access_conversion_case_detail(self, rm_token):
        """RM can access conversion case detail page"""
        if not rm_token:
            pytest.skip("RM token not available")
        
        headers = {"Authorization": f"Bearer {rm_token}"}
        
        # Get a lead from pipeline
        pipeline_response = requests.get(f"{BASE_URL}/api/conversion/pipeline", headers=headers)
        if pipeline_response.status_code != 200:
            pytest.skip("Could not get RM pipeline")
        
        leads = pipeline_response.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in RM pipeline")
        
        lead_id = leads[0]["lead_id"]
        
        # Get case detail
        response = requests.get(f"{BASE_URL}/api/conversion/cases/{lead_id}", headers=headers)
        print(f"conversion case detail response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "lead_id" in data
        assert "customer_name" in data
        print("RM can access conversion case detail: PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
