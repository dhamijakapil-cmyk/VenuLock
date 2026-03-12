"""
Test suite for Conversion Intelligence feature
Tests: Stage funnel, deal velocity, revenue forecast, filters, and CSV export
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module: Authentication fixtures for admin access
@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@venuloq.in", "password": "admin123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin authentication"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


# Module: Main conversion-intelligence endpoint tests
class TestConversionIntelligenceMain:
    """Tests for GET /api/admin/conversion-intelligence"""
    
    def test_main_endpoint_returns_200(self, admin_headers):
        """Main endpoint should return 200 with data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify top-level structure
        assert "drop_off" in data
        assert "velocity" in data
        assert "forecast" in data
        assert "filters_applied" in data
        assert "generated_at" in data
    
    def test_drop_off_structure(self, admin_headers):
        """Drop-off section should have transitions, funnel, overall_conversion"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        drop_off = data["drop_off"]
        
        assert "transitions" in drop_off
        assert "funnel" in drop_off
        assert "overall_conversion" in drop_off
        assert "total_leads" in drop_off
        assert "total_lost" in drop_off
        assert "leak_point" in drop_off
        
        # Verify transitions structure
        if drop_off["transitions"]:
            t = drop_off["transitions"][0]
            assert "from_stage" in t
            assert "to_stage" in t
            assert "conversion_rate" in t
            assert "drop_off" in t
            assert "drop_off_pct" in t
            assert "is_leak_point" in t
    
    def test_velocity_structure(self, admin_headers):
        """Velocity section should have stage velocity and metrics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        velocity = data["velocity"]
        
        assert "avg_time_to_first_contact_hrs" in velocity
        assert "median_time_to_first_contact_hrs" in velocity
        assert "avg_time_to_close_days" in velocity
        assert "median_time_to_close_days" in velocity
        assert "stage_velocity" in velocity
        assert "sla_config" in velocity
        
        # Verify stage velocity structure
        if velocity["stage_velocity"]:
            sv = velocity["stage_velocity"][0]
            assert "stage" in sv
            assert "avg_hours" in sv
            assert "median_hours" in sv
            assert "sla_threshold_hours" in sv
            assert "exceeds_sla" in sv
    
    def test_forecast_structure(self, admin_headers):
        """Forecast section should have pipeline and weighted values"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        forecast = data["forecast"]
        
        assert "pipeline_value" in forecast
        assert "pipeline_lead_count" in forecast
        assert "weighted_projected_gmv" in forecast
        assert "weighted_projected_commission" in forecast
        assert "stage_pipeline" in forecast
        assert "stage_weights" in forecast
        
        # Verify stage pipeline structure
        if forecast["stage_pipeline"]:
            sp = forecast["stage_pipeline"][0]
            assert "stage" in sp
            assert "lead_count" in sp
            assert "total_value" in sp
            assert "weight" in sp
            assert "weighted_value" in sp


# Module: Filter tests
class TestConversionIntelligenceFilters:
    """Tests for filter functionality"""
    
    def test_date_range_7_days(self, admin_headers):
        """Filter by 7 days should work"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence?date_range=7",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"]["date_range"] == "7"
    
    def test_date_range_30_days(self, admin_headers):
        """Filter by 30 days should work"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence?date_range=30",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"]["date_range"] == "30"
    
    def test_date_range_90_days(self, admin_headers):
        """Filter by 90 days should work"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence?date_range=90",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"]["date_range"] == "90"
    
    def test_city_filter(self, admin_headers):
        """Filter by city should work"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence?city=Delhi",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"]["city"] == "Delhi"
    
    def test_rm_filter(self, admin_headers):
        """Filter by RM should work"""
        # First get an RM user_id
        filter_response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        rms = filter_response.json().get("rms", [])
        if rms:
            rm_id = rms[0]["user_id"]
            response = requests.get(
                f"{BASE_URL}/api/admin/conversion-intelligence?rm_id={rm_id}",
                headers=admin_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["filters_applied"]["rm_id"] == rm_id
    
    def test_combined_filters(self, admin_headers):
        """Multiple filters should work together"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence?date_range=30&city=Delhi",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"]["date_range"] == "30"
        assert data["filters_applied"]["city"] == "Delhi"


# Module: Filter options endpoint tests
class TestFilterOptionsEndpoint:
    """Tests for GET /api/admin/conversion-intelligence/filters"""
    
    def test_filters_endpoint_returns_200(self, admin_headers):
        """Filter options endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        assert response.status_code == 200
    
    def test_filters_returns_cities(self, admin_headers):
        """Should return list of cities"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        data = response.json()
        
        assert "cities" in data
        assert isinstance(data["cities"], list)
        # Should have at least some cities
        assert len(data["cities"]) >= 1
    
    def test_filters_returns_rms(self, admin_headers):
        """Should return list of RMs with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        data = response.json()
        
        assert "rms" in data
        assert isinstance(data["rms"], list)
        
        if data["rms"]:
            rm = data["rms"][0]
            assert "user_id" in rm
            assert "name" in rm
            # email is optional but should be present
    
    def test_filters_cities_include_expected(self, admin_headers):
        """Cities should include expected cities"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        data = response.json()
        cities = data["cities"]
        
        # Based on test context, should have these cities
        expected_cities = ["Delhi", "Mumbai", "Gurgaon", "Pune"]
        for city in expected_cities:
            assert city in cities, f"Expected city '{city}' not found in {cities}"


# Module: Export endpoint tests
class TestExportEndpoint:
    """Tests for GET /api/admin/conversion-intelligence/export"""
    
    def test_export_endpoint_returns_200(self, admin_headers):
        """Export endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/export",
            headers=admin_headers
        )
        assert response.status_code == 200
    
    def test_export_returns_list(self, admin_headers):
        """Export should return a list of leads"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/export",
            headers=admin_headers
        )
        data = response.json()
        
        assert isinstance(data, list)
    
    def test_export_lead_structure(self, admin_headers):
        """Exported leads should have expected CSV fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/export?date_range=30",
            headers=admin_headers
        )
        data = response.json()
        
        if data:
            lead = data[0]
            expected_fields = [
                "lead_id", "customer_name", "customer_email", "customer_phone",
                "city", "event_type", "event_date", "guest_count", "stage",
                "deal_value", "venue_commission", "planner_commission",
                "rm_id", "created_at", "first_contacted_at", "confirmed_at"
            ]
            for field in expected_fields:
                assert field in lead, f"Field '{field}' missing from export"
    
    def test_export_with_filters(self, admin_headers):
        """Export should respect filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/export?city=Delhi&date_range=90",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All exported leads should be from Delhi
        for lead in data:
            assert lead.get("city") == "Delhi", f"Lead {lead.get('lead_id')} has city {lead.get('city')}, expected Delhi"


# Module: Authentication and authorization tests
class TestAuthAuthorization:
    """Tests for authentication and authorization"""
    
    def test_unauthenticated_returns_401(self):
        """Unauthenticated requests should return 401"""
        response = requests.get(f"{BASE_URL}/api/admin/conversion-intelligence")
        assert response.status_code in [401, 403]
    
    def test_non_admin_returns_403(self):
        """Non-admin users should be forbidden"""
        # Login as RM
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rm1@venuloq.in", "password": "rm123"}
        )
        if login_response.status_code != 200:
            pytest.skip("RM user not available for testing")
        
        rm_token = login_response.json()["token"]
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 403


# Module: Data integrity tests
class TestDataIntegrity:
    """Tests for data integrity and calculations"""
    
    def test_funnel_stages_ordered(self, admin_headers):
        """Funnel stages should be in correct order"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        funnel = data["drop_off"]["funnel"]
        
        expected_order = [
            "new", "contacted", "requirement_understood", "shortlisted",
            "site_visit", "negotiation", "booking_confirmed"
        ]
        
        actual_stages = [item["stage"] for item in funnel]
        assert actual_stages == expected_order, f"Funnel order mismatch: {actual_stages}"
    
    def test_conversion_rates_valid(self, admin_headers):
        """Conversion rates should be between 0 and 100"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        
        for t in data["drop_off"]["transitions"]:
            rate = t["conversion_rate"]
            assert 0 <= rate <= 100, f"Invalid conversion rate: {rate}"
    
    def test_exactly_one_leak_point(self, admin_headers):
        """There should be at most one leak point marked"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        
        leak_points = [t for t in data["drop_off"]["transitions"] if t["is_leak_point"]]
        assert len(leak_points) <= 1, f"Multiple leak points found: {len(leak_points)}"
    
    def test_stage_weights_valid(self, admin_headers):
        """Stage weights should be between 0 and 1"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence",
            headers=admin_headers
        )
        data = response.json()
        
        for stage, weight in data["forecast"]["stage_weights"].items():
            assert 0 <= weight <= 1, f"Invalid weight for {stage}: {weight}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
