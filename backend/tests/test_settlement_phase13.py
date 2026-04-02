"""
VenuLoQ Phase 13 — Settlement Backend Tests
Tests settlement wiring, dashboard, handoff, collection, payables, closure endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - using venuloq.in domain as per server.py seed data
ADMIN_EMAIL = "admin@venuloq.in"
ADMIN_PASSWORD = "admin123"
RM_EMAIL = "rm1@venuloq.in"
RM_PASSWORD = "rm123"


class TestSettlementAuth:
    """Settlement endpoints require authentication"""
    
    def test_dashboard_requires_auth(self):
        """GET /api/settlement/dashboard returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/settlement/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Settlement dashboard requires auth")


class TestSettlementLogin:
    """Test login for RM and Admin users"""
    
    def test_rm_login(self):
        """RM can login with rm1@venuloq.in / rm123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200, f"RM login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"PASS: RM login successful, role: {data.get('user', {}).get('role', 'unknown')}")
        return data
    
    def test_admin_login(self):
        """Admin can login with admin@venuloq.in / admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"PASS: Admin login successful, role: {data.get('user', {}).get('role', 'unknown')}")
        return data


@pytest.fixture(scope="module")
def rm_token():
    """Get RM auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"RM login failed: {response.status_code}")
    data = response.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    data = response.json()
    return data.get("token") or data.get("access_token")


class TestSettlementDashboard:
    """Settlement dashboard endpoint tests"""
    
    def test_rm_dashboard_returns_items_and_summary(self, rm_token):
        """GET /api/settlement/dashboard with RM token returns items and summary"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, "Response missing 'items' field"
        assert "summary" in data, "Response missing 'summary' field"
        assert isinstance(data["items"], list), "items should be a list"
        assert isinstance(data["summary"], dict), "summary should be a dict"
        print(f"PASS: RM dashboard returns {len(data['items'])} items, summary: {data['summary']}")
    
    def test_admin_dashboard_returns_items(self, admin_token):
        """GET /api/settlement/dashboard with Admin token returns items (admin sees all)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, "Response missing 'items' field"
        assert "summary" in data, "Response missing 'summary' field"
        print(f"PASS: Admin dashboard returns {len(data['items'])} items")
        return data
    
    def test_dashboard_summary_has_expected_fields(self, admin_token):
        """Dashboard summary contains expected count fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        assert response.status_code == 200
        summary = response.json().get("summary", {})
        expected_fields = ["total", "closure_ready", "settlement_pending", "under_review", 
                          "settlement_ready", "blocked", "completed", "disputes"]
        for field in expected_fields:
            assert field in summary, f"Summary missing '{field}' field"
        print(f"PASS: Dashboard summary has all expected fields: {list(summary.keys())}")


class TestSettlementHandoff:
    """Settlement handoff endpoint tests"""
    
    def test_handoff_requires_auth(self):
        """POST /api/settlement/{lead_id}/handoff returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/handoff", json={})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Handoff requires auth")
    
    def test_handoff_404_for_invalid_lead(self, admin_token):
        """POST /api/settlement/{lead_id}/handoff returns 404 for non-existent lead"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/settlement/nonexistent_lead_xyz/handoff", 
                                json={"settlement_note": "test"}, headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Handoff returns 404 for invalid lead")


class TestSettlementDetail:
    """Settlement detail endpoint tests"""
    
    def test_get_settlement_requires_auth(self):
        """GET /api/settlement/{lead_id} returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/settlement/test_lead")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Get settlement requires auth")
    
    def test_get_settlement_404_for_invalid_lead(self, admin_token):
        """GET /api/settlement/{lead_id} returns 404 for non-existent lead"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/settlement/nonexistent_lead_xyz", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Get settlement returns 404 for invalid lead")


class TestSettlementStatus:
    """Settlement status update endpoint tests"""
    
    def test_status_update_requires_auth(self):
        """POST /api/settlement/{lead_id}/status returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/status", 
                                json={"status": "settlement_pending"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Status update requires auth")
    
    def test_status_update_validates_status(self, admin_token):
        """POST /api/settlement/{lead_id}/status rejects invalid status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get a valid lead from dashboard
        dash_response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        if dash_response.status_code != 200 or not dash_response.json().get("items"):
            pytest.skip("No settlement items available for testing")
        
        lead_id = dash_response.json()["items"][0]["lead_id"]
        response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/status", 
                                json={"status": "invalid_status_xyz"}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Status update rejects invalid status")


class TestSettlementCollection:
    """Settlement collection endpoint tests"""
    
    def test_collection_update_requires_auth(self):
        """POST /api/settlement/{lead_id}/collection returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/collection", 
                                json={"expected_amount": 100000})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Collection update requires auth")
    
    def test_collection_update_validates_status(self, admin_token):
        """POST /api/settlement/{lead_id}/collection rejects invalid collection status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        dash_response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        if dash_response.status_code != 200 or not dash_response.json().get("items"):
            pytest.skip("No settlement items available for testing")
        
        lead_id = dash_response.json()["items"][0]["lead_id"]
        response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/collection", 
                                json={"status": "invalid_collection_status"}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Collection update rejects invalid status")


class TestSettlementPayables:
    """Settlement payables endpoint tests"""
    
    def test_payables_update_requires_auth(self):
        """POST /api/settlement/{lead_id}/payables returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/payables", 
                                json={"venue_payable": 50000})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Payables update requires auth")
    
    def test_payables_update_validates_completeness(self, admin_token):
        """POST /api/settlement/{lead_id}/payables rejects invalid completeness"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        dash_response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        if dash_response.status_code != 200 or not dash_response.json().get("items"):
            pytest.skip("No settlement items available for testing")
        
        lead_id = dash_response.json()["items"][0]["lead_id"]
        response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/payables", 
                                json={"completeness": "invalid_completeness"}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Payables update rejects invalid completeness")


class TestSettlementPayoutReadiness:
    """Settlement payout readiness endpoint tests"""
    
    def test_payout_readiness_requires_auth(self):
        """POST /api/settlement/{lead_id}/payout-readiness returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/payout-readiness", 
                                json={"posture": "payout_ready"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Payout readiness update requires auth")
    
    def test_payout_readiness_validates_posture(self, admin_token):
        """POST /api/settlement/{lead_id}/payout-readiness rejects invalid posture"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        dash_response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        if dash_response.status_code != 200 or not dash_response.json().get("items"):
            pytest.skip("No settlement items available for testing")
        
        lead_id = dash_response.json()["items"][0]["lead_id"]
        response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/payout-readiness", 
                                json={"posture": "invalid_posture"}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Payout readiness rejects invalid posture")


class TestSettlementFinancialClosure:
    """Settlement financial closure endpoint tests"""
    
    def test_financial_closure_get_requires_auth(self):
        """GET /api/settlement/{lead_id}/financial-closure returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/settlement/test_lead/financial-closure")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Financial closure GET requires auth")
    
    def test_financial_closure_post_requires_auth(self):
        """POST /api/settlement/{lead_id}/financial-closure returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/financial-closure", 
                                json={"event_closure_complete": True})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Financial closure POST requires auth")
    
    def test_complete_requires_auth(self):
        """POST /api/settlement/{lead_id}/complete returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/complete")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Complete financial closure requires auth")


class TestSettlementNote:
    """Settlement note endpoint tests"""
    
    def test_note_update_requires_auth(self):
        """POST /api/settlement/{lead_id}/note returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/settlement/test_lead/note", 
                                json={"note": "Test note"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Note update requires auth")


class TestSettlementIntegration:
    """Integration tests for settlement workflow"""
    
    def test_full_settlement_workflow(self, admin_token):
        """Test complete settlement workflow if closure_ready cases exist"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. Get dashboard
        dash_response = requests.get(f"{BASE_URL}/api/settlement/dashboard", headers=headers)
        assert dash_response.status_code == 200
        items = dash_response.json().get("items", [])
        
        if not items:
            print("SKIP: No settlement items available for integration test")
            pytest.skip("No settlement items available")
        
        # Find a closure_ready case for handoff test
        closure_ready_items = [i for i in items if i.get("settlement_status") == "closure_ready"]
        
        if closure_ready_items:
            lead_id = closure_ready_items[0]["lead_id"]
            print(f"Testing handoff on closure_ready lead: {lead_id}")
            
            # 2. Initiate handoff
            handoff_response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/handoff", 
                                            json={"settlement_note": "TEST_Integration test handoff"}, 
                                            headers=headers)
            if handoff_response.status_code == 200:
                print(f"PASS: Handoff initiated for {lead_id}")
                
                # 3. Get settlement detail
                detail_response = requests.get(f"{BASE_URL}/api/settlement/{lead_id}", headers=headers)
                assert detail_response.status_code == 200
                detail = detail_response.json()
                assert detail.get("settlement", {}).get("settlement_status") == "settlement_pending"
                print(f"PASS: Settlement status is now settlement_pending")
                
                # 4. Update collection
                collection_response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/collection",
                                                   json={"expected_amount": 100000, "received_amount": 80000, "status": "partial"},
                                                   headers=headers)
                assert collection_response.status_code == 200
                print("PASS: Collection updated")
                
                # 5. Update payables
                payables_response = requests.post(f"{BASE_URL}/api/settlement/{lead_id}/payables",
                                                 json={"venue_payable": 50000, "vendor_payable": 10000, "completeness": "complete"},
                                                 headers=headers)
                assert payables_response.status_code == 200
                print("PASS: Payables updated")
                
                # 6. Get financial closure state
                closure_response = requests.get(f"{BASE_URL}/api/settlement/{lead_id}/financial-closure", headers=headers)
                assert closure_response.status_code == 200
                closure_data = closure_response.json()
                assert "checks" in closure_data
                print(f"PASS: Financial closure gate has {closure_data.get('passed_count', 0)}/{closure_data.get('total_count', 5)} checks")
            else:
                print(f"INFO: Handoff returned {handoff_response.status_code} - {handoff_response.text}")
        else:
            # Test with existing settlement_pending case
            pending_items = [i for i in items if i.get("settlement_status") != "closure_ready"]
            if pending_items:
                lead_id = pending_items[0]["lead_id"]
                print(f"Testing with existing settlement case: {lead_id}")
                
                # Get settlement detail
                detail_response = requests.get(f"{BASE_URL}/api/settlement/{lead_id}", headers=headers)
                assert detail_response.status_code == 200
                print(f"PASS: Got settlement detail for {lead_id}")
        
        print("PASS: Settlement integration test completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
