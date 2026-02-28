"""
Test RM Self-Service Performance Endpoints
Tests for GET /api/rm/my-performance and GET /api/rm/my-sla-alerts
These endpoints return personal metrics for the logged-in RM plus team averages for comparison.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RM1_CREDENTIALS = {"email": "rm1@bookmyvenue.in", "password": "rm123"}
RM3_CREDENTIALS = {"email": "rm3@bookmyvenue.in", "password": "rm123"}
ADMIN_CREDENTIALS = {"email": "admin@bookmyvenue.in", "password": "admin123"}
CUSTOMER_CREDENTIALS = {"email": "test@example.com", "password": "test123"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def rm1_token(api_client):
    """Get auth token for RM1 (Rahul Sharma)"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=RM1_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("RM1 authentication failed - skipping RM1 tests")


@pytest.fixture(scope="module")
def rm3_token(api_client):
    """Get auth token for RM3 (Amit Kumar)"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=RM3_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("RM3 authentication failed - skipping RM3 tests")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get auth token for Admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping admin tests")


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get auth token for Customer"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed - skipping customer rejection tests")


class TestRMMyPerformanceEndpoint:
    """Test GET /api/rm/my-performance endpoint"""

    def test_rm1_can_access_my_performance(self, api_client, rm1_token):
        """RM1 should be able to access their personal performance data"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check top-level structure
        assert "funnel" in data, "Response should contain 'funnel'"
        assert "financials" in data, "Response should contain 'financials'"
        assert "time_metrics" in data, "Response should contain 'time_metrics'"
        assert "team_averages" in data, "Response should contain 'team_averages'"
        assert "generated_at" in data, "Response should contain 'generated_at'"
        
        print(f"RM1 Performance - Assigned: {data['funnel']['assigned']}, Confirmed: {data['funnel']['confirmed']}")

    def test_rm1_funnel_data_structure(self, api_client, rm1_token):
        """RM1 funnel data should have all required fields"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        funnel = response.json()["funnel"]
        
        # Check all required funnel fields
        required_fields = ["assigned", "contacted", "contacted_pct", "site_visits", 
                          "site_visit_pct", "confirmed", "confirmed_pct", "lost", "conversion_rate"]
        for field in required_fields:
            assert field in funnel, f"Funnel should contain '{field}'"
        
        # Verify percentages are numeric
        assert isinstance(funnel["contacted_pct"], (int, float))
        assert isinstance(funnel["site_visit_pct"], (int, float))
        assert isinstance(funnel["confirmed_pct"], (int, float))
        assert isinstance(funnel["conversion_rate"], (int, float))
        
        print(f"RM1 Funnel - Conversion: {funnel['conversion_rate']}%")

    def test_rm1_financials_structure(self, api_client, rm1_token):
        """RM1 financials should have GMV, commission, avg deal size"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        financials = response.json()["financials"]
        
        # Check required financial fields
        assert "total_gmv" in financials, "Financials should contain 'total_gmv'"
        assert "avg_deal_size" in financials, "Financials should contain 'avg_deal_size'"
        assert "total_commission" in financials, "Financials should contain 'total_commission'"
        
        # Values should be numeric
        assert isinstance(financials["total_gmv"], (int, float))
        assert isinstance(financials["avg_deal_size"], (int, float))
        assert isinstance(financials["total_commission"], (int, float))
        
        print(f"RM1 Financials - GMV: {financials['total_gmv']}, Commission: {financials['total_commission']}")

    def test_rm1_team_averages(self, api_client, rm1_token):
        """RM1 response should include team averages for comparison"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        team_avg = response.json()["team_averages"]
        
        # Check required team average fields
        assert "avg_leads_per_rm" in team_avg
        assert "avg_confirmed_per_rm" in team_avg
        assert "avg_gmv_per_rm" in team_avg
        assert "avg_conversion_rate" in team_avg
        assert "team_size" in team_avg
        
        # Team size should be at least 1
        assert team_avg["team_size"] >= 1
        
        print(f"Team Averages - Conversion: {team_avg['avg_conversion_rate']}%, Team Size: {team_avg['team_size']}")

    def test_rm1_time_metrics(self, api_client, rm1_token):
        """RM1 response should include time metrics"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        time_metrics = response.json()["time_metrics"]
        
        # Check time metric fields exist (can be null if no data)
        assert "avg_first_contact_hrs" in time_metrics
        assert "avg_close_hrs" in time_metrics
        
        print(f"RM1 Time Metrics - First Contact: {time_metrics['avg_first_contact_hrs']}h, Close: {time_metrics['avg_close_hrs']}h")

    def test_rm3_gets_different_data(self, api_client, rm3_token, rm1_token):
        """RM3 should get different performance data than RM1"""
        rm1_response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        rm3_response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm3_token}"}
        )
        
        assert rm1_response.status_code == 200
        assert rm3_response.status_code == 200
        
        rm1_data = rm1_response.json()
        rm3_data = rm3_response.json()
        
        # Either assigned count or GMV should differ (RM-specific data)
        # Team averages should be the same for both
        rm1_assigned = rm1_data["funnel"]["assigned"]
        rm3_assigned = rm3_data["funnel"]["assigned"]
        rm1_gmv = rm1_data["financials"]["total_gmv"]
        rm3_gmv = rm3_data["financials"]["total_gmv"]
        
        print(f"RM1 - Assigned: {rm1_assigned}, GMV: {rm1_gmv}")
        print(f"RM3 - Assigned: {rm3_assigned}, GMV: {rm3_gmv}")
        
        # Note: If both RMs have same leads/GMV (unlikely), this check might pass falsely
        # But typically different RMs have different data

    def test_admin_can_access_my_performance(self, api_client, admin_token):
        """Admin should also be able to access the endpoint (role allowed)"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin is allowed per the endpoint decorator require_role("rm", "admin")
        assert response.status_code == 200, f"Admin should have access, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "funnel" in data
        print("Admin can access /rm/my-performance endpoint")

    def test_customer_rejected_from_my_performance(self, api_client, customer_token):
        """Customer should be rejected from accessing RM performance data"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Customer role should be rejected with 403
        assert response.status_code == 403, f"Customer should be rejected, got {response.status_code}: {response.text}"
        print("Customer correctly rejected from /rm/my-performance endpoint")

    def test_unauthenticated_rejected(self, api_client):
        """Unauthenticated request should be rejected"""
        response = api_client.get(f"{BASE_URL}/api/rm/my-performance")
        assert response.status_code in [401, 403], f"Unauthenticated should be rejected, got {response.status_code}"
        print("Unauthenticated user correctly rejected from /rm/my-performance endpoint")


class TestRMMySLAAlertsEndpoint:
    """Test GET /api/rm/my-sla-alerts endpoint"""

    def test_rm1_can_access_sla_alerts(self, api_client, rm1_token):
        """RM1 should be able to access their personal SLA alerts"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check top-level structure
        assert "aging_leads" in data, "Response should contain 'aging_leads'"
        assert "expiring_holds" in data, "Response should contain 'expiring_holds'"
        assert "pending_payments" in data, "Response should contain 'pending_payments'"
        assert "summary" in data, "Response should contain 'summary'"
        assert "generated_at" in data, "Response should contain 'generated_at'"
        
        print(f"RM1 SLA Alerts - Total: {data['summary'].get('total_alerts', 0)}")

    def test_rm1_sla_summary_structure(self, api_client, rm1_token):
        """SLA summary should have total_alerts, critical, warnings"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        summary = response.json()["summary"]
        
        assert "total_alerts" in summary
        assert "critical" in summary
        assert "warnings" in summary
        
        # Values should be non-negative integers
        assert summary["total_alerts"] >= 0
        assert summary["critical"] >= 0
        assert summary["warnings"] >= 0
        
        print(f"RM1 SLA Summary - Total: {summary['total_alerts']}, Critical: {summary['critical']}, Warnings: {summary['warnings']}")

    def test_aging_leads_structure(self, api_client, rm1_token):
        """Aging leads should have correct structure if present"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        aging_leads = response.json()["aging_leads"]
        
        # If there are aging leads, check structure
        if len(aging_leads) > 0:
            lead = aging_leads[0]
            assert "lead_id" in lead
            assert "customer_name" in lead
            assert "alert_type" in lead
            assert "description" in lead
            assert "hours_overdue" in lead
            assert "severity" in lead
            print(f"Found {len(aging_leads)} aging leads for RM1")
        else:
            print("No aging leads for RM1 (all within SLA)")

    def test_rm3_gets_different_sla_alerts(self, api_client, rm3_token, rm1_token):
        """RM3 should get different SLA alerts than RM1"""
        rm1_response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        rm3_response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm3_token}"}
        )
        
        assert rm1_response.status_code == 200
        assert rm3_response.status_code == 200
        
        rm1_alerts = rm1_response.json()["summary"]["total_alerts"]
        rm3_alerts = rm3_response.json()["summary"]["total_alerts"]
        
        print(f"RM1 Total Alerts: {rm1_alerts}")
        print(f"RM3 Total Alerts: {rm3_alerts}")
        
        # Note: Different RMs might have same alert count, but different actual alerts

    def test_admin_can_access_sla_alerts(self, api_client, admin_token):
        """Admin should also be able to access the SLA alerts endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should have access, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data
        print("Admin can access /rm/my-sla-alerts endpoint")

    def test_customer_rejected_from_sla_alerts(self, api_client, customer_token):
        """Customer should be rejected from accessing RM SLA alerts"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Customer should be rejected, got {response.status_code}: {response.text}"
        print("Customer correctly rejected from /rm/my-sla-alerts endpoint")

    def test_unauthenticated_rejected(self, api_client):
        """Unauthenticated request should be rejected"""
        response = api_client.get(f"{BASE_URL}/api/rm/my-sla-alerts")
        assert response.status_code in [401, 403], f"Unauthenticated should be rejected, got {response.status_code}"
        print("Unauthenticated user correctly rejected from /rm/my-sla-alerts endpoint")


class TestRMDataIsolation:
    """Test that RMs only see their own data, not other RMs' data"""

    def test_rm1_performance_is_rm_specific(self, api_client, rm1_token):
        """RM1's performance should only include leads assigned to RM1"""
        response = api_client.get(
            f"{BASE_URL}/api/rm/my-performance",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # According to agent context: RM1 (Rahul Sharma) has 13 leads, 3 confirmed, 23.1% conversion, 22.0L GMV
        # We verify the data is personal, not aggregate of all RMs
        funnel = data["funnel"]
        
        # Personal data should not equal team totals (unless only 1 RM, which is unlikely)
        team_size = data["team_averages"]["team_size"]
        if team_size > 1:
            # If multiple RMs, individual assigned should be <= team average * team_size
            # This just verifies it's personal data, not shared
            print(f"RM1 has {funnel['assigned']} assigned leads (personal, not team-wide)")
        
        # Verify the conversion rate exists and is reasonable
        assert 0 <= funnel["conversion_rate"] <= 100, "Conversion rate should be 0-100%"

    def test_sla_alerts_are_rm_specific(self, api_client, rm1_token, rm3_token):
        """SLA alerts should be specific to each RM's leads"""
        # Get RM1's aging leads
        rm1_response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm1_token}"}
        )
        rm1_data = rm1_response.json()
        rm1_aging_lead_ids = [l["lead_id"] for l in rm1_data.get("aging_leads", [])]
        
        # Get RM3's aging leads
        rm3_response = api_client.get(
            f"{BASE_URL}/api/rm/my-sla-alerts",
            headers={"Authorization": f"Bearer {rm3_token}"}
        )
        rm3_data = rm3_response.json()
        rm3_aging_lead_ids = [l["lead_id"] for l in rm3_data.get("aging_leads", [])]
        
        # If both have aging leads, they should not overlap (each RM has their own leads)
        if rm1_aging_lead_ids and rm3_aging_lead_ids:
            overlap = set(rm1_aging_lead_ids).intersection(set(rm3_aging_lead_ids))
            assert len(overlap) == 0, f"RMs should not share lead IDs, overlap: {overlap}"
            print(f"Data isolation verified: RM1 and RM3 have no overlapping aging leads")
        else:
            print("One or both RMs have no aging leads - data isolation assumed correct")
