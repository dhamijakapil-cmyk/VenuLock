"""
RM Performance Analytics API Tests
Tests for GET /api/admin/rm-analytics and GET /api/admin/sla-breaches endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@bookmyvenue.in", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed")

@pytest.fixture(scope="module")
def rm_token():
    """Get RM authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "rm1@bookmyvenue.in", "password": "rm123"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("RM login failed")

@pytest.fixture
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session

@pytest.fixture
def rm_client(rm_token):
    """Session with RM auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {rm_token}"
    })
    return session


class TestRMAnalyticsEndpoint:
    """Tests for GET /api/admin/rm-analytics endpoint"""

    def test_rm_analytics_default_period(self, admin_client):
        """Test RM analytics with default time period (month)"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rms" in data
        assert "summary" in data
        assert "time_period" in data
        assert "generated_at" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_rms" in summary
        assert "total_leads" in summary
        assert "total_confirmed" in summary
        assert "total_gmv" in summary
        assert "total_commission" in summary
        assert "overall_conversion" in summary

    def test_rm_analytics_month_period(self, admin_client):
        """Test RM analytics with month time period"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics?time_period=month")
        assert response.status_code == 200
        
        data = response.json()
        assert data["time_period"] == "month"

    def test_rm_analytics_week_period(self, admin_client):
        """Test RM analytics with week time period"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics?time_period=week")
        assert response.status_code == 200
        
        data = response.json()
        assert data["time_period"] == "week"

    def test_rm_analytics_all_period(self, admin_client):
        """Test RM analytics with all time period"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics?time_period=all")
        assert response.status_code == 200
        
        data = response.json()
        assert data["time_period"] == "all"

    def test_rm_analytics_quarter_period(self, admin_client):
        """Test RM analytics with quarter time period"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics?time_period=quarter")
        assert response.status_code == 200
        
        data = response.json()
        assert data["time_period"] == "quarter"

    def test_rm_analytics_year_period(self, admin_client):
        """Test RM analytics with year time period"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics?time_period=year")
        assert response.status_code == 200
        
        data = response.json()
        assert data["time_period"] == "year"

    def test_rm_analytics_rm_data_structure(self, admin_client):
        """Test that each RM entry has correct data structure"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["rms"]) > 0:
            rm = data["rms"][0]
            
            # Verify RM basic info
            assert "rm_id" in rm
            assert "rm_name" in rm
            assert "email" in rm
            
            # Verify funnel structure
            assert "funnel" in rm
            funnel = rm["funnel"]
            assert "assigned" in funnel
            assert "contacted" in funnel
            assert "site_visits" in funnel
            assert "confirmed" in funnel
            assert "lost" in funnel
            
            # Verify conversion rates structure
            assert "conversion_rates" in rm
            rates = rm["conversion_rates"]
            assert "overall" in rates
            assert "assign_to_contact" in rates
            assert "contact_to_visit" in rates
            assert "visit_to_confirm" in rates
            
            # Verify financials structure
            assert "financials" in rm
            financials = rm["financials"]
            assert "total_gmv" in financials
            assert "avg_deal_size" in financials
            assert "total_commission" in financials
            assert "venue_commission" in financials
            assert "planner_commission" in financials
            
            # Verify time metrics structure
            assert "time_metrics" in rm
            time_metrics = rm["time_metrics"]
            assert "avg_time_to_first_contact_hrs" in time_metrics
            assert "avg_time_to_close_hrs" in time_metrics

    def test_rm_analytics_forbidden_for_rm_user(self, rm_client):
        """Test that RM users cannot access admin analytics"""
        response = rm_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 403, f"Expected 403 for RM user, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "Insufficient permissions" in data["detail"]


class TestSLABreachesEndpoint:
    """Tests for GET /api/admin/sla-breaches endpoint"""

    def test_sla_breaches_basic(self, admin_client):
        """Test SLA breaches endpoint returns correct structure"""
        response = admin_client.get(f"{BASE_URL}/api/admin/sla-breaches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "aging_leads" in data
        assert "sla_breaches" in data
        assert "summary" in data
        assert "rm_breach_summary" in data
        assert "sla_config" in data
        assert "generated_at" in data

    def test_sla_breaches_summary_structure(self, admin_client):
        """Test SLA breaches summary has correct fields"""
        response = admin_client.get(f"{BASE_URL}/api/admin/sla-breaches")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        assert "total_aging" in summary
        assert "total_breaches" in summary
        assert "critical_breaches" in summary
        assert "warning_breaches" in summary

    def test_sla_breaches_config_structure(self, admin_client):
        """Test SLA config has correct fields"""
        response = admin_client.get(f"{BASE_URL}/api/admin/sla-breaches")
        assert response.status_code == 200
        
        data = response.json()
        config = data["sla_config"]
        assert "first_contact_hours" in config
        assert "aging_thresholds" in config
        
        # Verify aging thresholds
        thresholds = config["aging_thresholds"]
        assert "new" in thresholds
        assert "contacted" in thresholds
        assert "requirement_understood" in thresholds
        assert "shortlisted" in thresholds
        assert "site_visit" in thresholds
        assert "negotiation" in thresholds

    def test_sla_breaches_forbidden_for_rm_user(self, rm_client):
        """Test that RM users cannot access SLA breaches"""
        response = rm_client.get(f"{BASE_URL}/api/admin/sla-breaches")
        assert response.status_code == 403, f"Expected 403 for RM user, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "Insufficient permissions" in data["detail"]


class TestRMAnalyticsDataIntegrity:
    """Tests for data integrity in RM analytics"""

    def test_total_leads_matches_sum(self, admin_client):
        """Verify total_leads equals sum of all RM assigned leads"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 200
        
        data = response.json()
        total_from_summary = data["summary"]["total_leads"]
        total_from_rms = sum(rm["funnel"]["assigned"] for rm in data["rms"])
        assert total_from_summary == total_from_rms

    def test_total_gmv_matches_sum(self, admin_client):
        """Verify total_gmv equals sum of all RM GMVs"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 200
        
        data = response.json()
        total_from_summary = data["summary"]["total_gmv"]
        total_from_rms = sum(rm["financials"]["total_gmv"] for rm in data["rms"])
        assert total_from_summary == total_from_rms

    def test_total_confirmed_matches_sum(self, admin_client):
        """Verify total_confirmed equals sum of all RM confirmations"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 200
        
        data = response.json()
        total_from_summary = data["summary"]["total_confirmed"]
        total_from_rms = sum(rm["funnel"]["confirmed"] for rm in data["rms"])
        assert total_from_summary == total_from_rms

    def test_rms_sorted_by_gmv(self, admin_client):
        """Verify RMs are sorted by GMV in descending order"""
        response = admin_client.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 200
        
        data = response.json()
        rms = data["rms"]
        if len(rms) > 1:
            gmv_values = [rm["financials"]["total_gmv"] for rm in rms]
            assert gmv_values == sorted(gmv_values, reverse=True), "RMs should be sorted by GMV descending"


class TestRMAnalyticsNoAuth:
    """Tests for authentication requirements"""

    def test_rm_analytics_requires_auth(self):
        """Test RM analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/rm-analytics")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

    def test_sla_breaches_requires_auth(self):
        """Test SLA breaches requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/sla-breaches")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
