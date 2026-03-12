"""
Channel Performance API Tests for VenuLoQ.
Tests lead source attribution and channel performance metrics endpoints.
Tests: GET /api/admin/channel-performance, POST /api/admin/backfill-lead-sources,
       GET /api/admin/conversion-intelligence/filters (sources field)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@venuloq.in"
ADMIN_PASSWORD = "admin123"

class TestChannelPerformance:
    """Test Channel Performance endpoints and source attribution"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }

    # ============== GET /api/admin/channel-performance TESTS ==============
    
    def test_channel_performance_returns_200(self, admin_headers):
        """Test channel performance endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/channel-performance", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify response structure
        assert "sources" in data, "Response should contain 'sources' array"
        assert "summary" in data, "Response should contain 'summary' object"
        assert "filters_applied" in data, "Response should contain 'filters_applied'"
        assert "generated_at" in data, "Response should contain 'generated_at'"
        print("PASSED: Channel performance endpoint returns 200 with correct structure")
    
    def test_channel_performance_sources_structure(self, admin_headers):
        """Test sources array contains correct metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/channel-performance", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check sources is a list
        assert isinstance(data["sources"], list), "Sources should be a list"
        
        if len(data["sources"]) > 0:
            source = data["sources"][0]
            # Verify source metrics structure
            assert "source" in source, "Source should have 'source' field"
            assert "total_leads" in source, "Source should have 'total_leads'"
            assert "confirmed_leads" in source, "Source should have 'confirmed_leads'"
            assert "total_gmv" in source, "Source should have 'total_gmv'"
            assert "total_commission" in source, "Source should have 'total_commission'"
            assert "conversion_rate" in source, "Source should have 'conversion_rate'"
            assert "avg_deal_value" in source, "Source should have 'avg_deal_value'"
            print(f"PASSED: Source structure verified - first source is '{source['source']}' with {source['total_leads']} leads")
        else:
            print("INFO: No sources with leads returned (empty data)")
    
    def test_channel_performance_summary_structure(self, admin_headers):
        """Test summary object contains aggregated metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/channel-performance", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total_leads" in summary, "Summary should have 'total_leads'"
        assert "total_confirmed" in summary, "Summary should have 'total_confirmed'"
        assert "total_gmv" in summary, "Summary should have 'total_gmv'"
        assert "total_commission" in summary, "Summary should have 'total_commission'"
        assert "overall_conversion_rate" in summary, "Summary should have 'overall_conversion_rate'"
        
        print(f"PASSED: Summary structure verified - {summary['total_leads']} leads, {summary['total_confirmed']} confirmed, conversion: {summary['overall_conversion_rate']}%")
    
    def test_channel_performance_all_sources_present(self, admin_headers):
        """Test all valid sources are returned in response"""
        response = requests.get(f"{BASE_URL}/api/admin/channel-performance", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        valid_sources = ["Meta", "Google", "Organic", "Referral", "Planner", "Direct"]
        returned_sources = [s["source"] for s in data["sources"]]
        
        for source in valid_sources:
            assert source in returned_sources, f"Source '{source}' should be in response"
        
        print(f"PASSED: All 6 valid sources present: {returned_sources}")
    
    def test_channel_performance_with_date_range_filter(self, admin_headers):
        """Test channel performance with date_range filter"""
        for days in ["7", "30", "90"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/channel-performance?date_range={days}",
                headers=admin_headers
            )
            assert response.status_code == 200, f"Failed for date_range={days}"
            data = response.json()
            assert data["filters_applied"]["date_range"] == days
        
        print("PASSED: Date range filter works for 7, 30, 90 days")
    
    def test_channel_performance_with_city_filter(self, admin_headers):
        """Test channel performance with city filter"""
        # First get available cities
        filters_response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        assert filters_response.status_code == 200
        cities = filters_response.json().get("cities", [])
        
        if len(cities) > 0:
            test_city = cities[0]
            response = requests.get(
                f"{BASE_URL}/api/admin/channel-performance?city={test_city}",
                headers=admin_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["filters_applied"]["city"] == test_city
            print(f"PASSED: City filter works - tested with '{test_city}'")
        else:
            print("INFO: No cities available to test filter")
    
    def test_channel_performance_with_rm_filter(self, admin_headers):
        """Test channel performance with RM filter"""
        filters_response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        assert filters_response.status_code == 200
        rms = filters_response.json().get("rms", [])
        
        if len(rms) > 0:
            test_rm_id = rms[0]["user_id"]
            response = requests.get(
                f"{BASE_URL}/api/admin/channel-performance?rm_id={test_rm_id}",
                headers=admin_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["filters_applied"]["rm_id"] == test_rm_id
            print(f"PASSED: RM filter works - tested with '{test_rm_id}'")
        else:
            print("INFO: No RMs available to test filter")
    
    def test_channel_performance_requires_auth(self):
        """Test channel performance requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/channel-performance")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASSED: Channel performance requires authentication (401 without token)")
    
    def test_channel_performance_requires_admin_role(self, admin_headers):
        """Test channel performance requires admin role"""
        # First create an RM user token
        rm_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venuloq.in",
            "password": "rm123"
        })
        if rm_login.status_code == 200:
            rm_token = rm_login.json().get("token")
            rm_headers = {
                "Authorization": f"Bearer {rm_token}",
                "Content-Type": "application/json"
            }
            response = requests.get(f"{BASE_URL}/api/admin/channel-performance", headers=rm_headers)
            assert response.status_code == 403, f"Expected 403 for RM user, got {response.status_code}"
            print("PASSED: Channel performance requires admin role (403 for RM)")
        else:
            print("INFO: RM user not available for role test, skipping")

    # ============== POST /api/admin/backfill-lead-sources TESTS ==============
    
    def test_backfill_lead_sources_returns_200(self, admin_headers):
        """Test backfill lead sources endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/admin/backfill-lead-sources",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "updated_count" in data, "Response should contain 'updated_count'"
        print(f"PASSED: Backfill endpoint works - updated {data['updated_count']} leads")
    
    def test_backfill_lead_sources_requires_auth(self):
        """Test backfill requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/backfill-lead-sources")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASSED: Backfill requires authentication (401 without token)")
    
    def test_backfill_lead_sources_requires_admin(self, admin_headers):
        """Test backfill requires admin role"""
        rm_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venuloq.in",
            "password": "rm123"
        })
        if rm_login.status_code == 200:
            rm_token = rm_login.json().get("token")
            rm_headers = {
                "Authorization": f"Bearer {rm_token}",
                "Content-Type": "application/json"
            }
            response = requests.post(f"{BASE_URL}/api/admin/backfill-lead-sources", headers=rm_headers)
            assert response.status_code == 403, f"Expected 403 for RM user, got {response.status_code}"
            print("PASSED: Backfill requires admin role (403 for RM)")
        else:
            print("INFO: RM user not available for role test, skipping")

    # ============== GET /api/admin/conversion-intelligence/filters (SOURCES) TESTS ==============
    
    def test_filter_options_includes_sources(self, admin_headers):
        """Test filter options endpoint returns sources array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence/filters",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "sources" in data, "Filter options should include 'sources' array"
        assert isinstance(data["sources"], list), "Sources should be a list"
        
        # Should include all valid source types
        valid_sources = ["Meta", "Google", "Organic", "Referral", "Planner", "Direct"]
        for source in valid_sources:
            assert source in data["sources"], f"Source '{source}' should be in filter options"
        
        print(f"PASSED: Filter options include sources: {data['sources']}")

    # ============== GET /api/admin/conversion-intelligence (SOURCE FILTER) TESTS ==============
    
    def test_conversion_intelligence_source_filter(self, admin_headers):
        """Test conversion intelligence supports source filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/conversion-intelligence?source=Direct",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["filters_applied"]["source"] == "Direct", "Source filter should be applied"
        print(f"PASSED: Conversion intelligence source filter works - returned {data['drop_off']['total_leads']} leads for 'Direct' source")
    
    def test_conversion_intelligence_source_filter_all_values(self, admin_headers):
        """Test conversion intelligence source filter with all valid values"""
        valid_sources = ["Meta", "Google", "Organic", "Referral", "Planner", "Direct"]
        
        for source in valid_sources:
            response = requests.get(
                f"{BASE_URL}/api/admin/conversion-intelligence?source={source}",
                headers=admin_headers
            )
            assert response.status_code == 200, f"Failed for source={source}"
            data = response.json()
            assert data["filters_applied"]["source"] == source
        
        print("PASSED: Conversion intelligence source filter works for all 6 source types")

    # ============== LEAD CREATE WITH SOURCE FIELDS TESTS ==============
    
    def test_create_lead_with_source(self, admin_headers):
        """Test creating a lead with source attribution fields"""
        import random
        import string
        
        # Generate unique email
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email = f"test_source_{random_suffix}@example.com"
        
        lead_data = {
            "customer_name": "Test Source Lead",
            "customer_email": test_email,
            "customer_phone": "+91-9876543210",
            "event_type": "Wedding",
            "city": "Delhi",
            "source": "Meta",
            "campaign": "summer_campaign_2025",
            "landing_page": "/venues/delhi"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "lead_id" in data, "Response should include lead_id"
        lead_id = data["lead_id"]
        
        # Verify the lead was created with source fields
        get_response = requests.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers=admin_headers
        )
        assert get_response.status_code == 200
        lead = get_response.json()
        
        assert lead.get("source") == "Meta", f"Source should be 'Meta', got '{lead.get('source')}'"
        assert lead.get("campaign") == "summer_campaign_2025", "Campaign should be set"
        assert lead.get("landing_page") == "/venues/delhi", "Landing page should be set"
        
        print(f"PASSED: Lead created with source=Meta, campaign=summer_campaign_2025, landing_page=/venues/delhi")
    
    def test_create_lead_default_source_is_direct(self, admin_headers):
        """Test that leads without source default to 'Direct'"""
        import random
        import string
        
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email = f"test_default_{random_suffix}@example.com"
        
        lead_data = {
            "customer_name": "Test Default Source Lead",
            "customer_email": test_email,
            "customer_phone": "+91-9876543210",
            "event_type": "Wedding",
            "city": "Mumbai"
            # No source field - should default to Direct
        }
        
        response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        lead_id = response.json()["lead_id"]
        
        # Verify default source
        get_response = requests.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers=admin_headers
        )
        assert get_response.status_code == 200
        lead = get_response.json()
        
        assert lead.get("source") == "Direct", f"Default source should be 'Direct', got '{lead.get('source')}'"
        print("PASSED: Lead without source field defaults to 'Direct'")


class TestLeadListSourceFilter:
    """Test lead list endpoint with source filter"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_leads_list_source_filter(self, admin_headers):
        """Test leads list supports source filter"""
        response = requests.get(
            f"{BASE_URL}/api/leads?source=Direct",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "leads" in data, "Response should include leads array"
        assert "total" in data, "Response should include total count"
        
        # Verify all returned leads have the filtered source
        for lead in data["leads"]:
            if lead.get("source"):  # Only check if source is set
                assert lead["source"] == "Direct", f"Lead {lead.get('lead_id')} has source={lead.get('source')}, expected Direct"
        
        print(f"PASSED: Lead list source filter works - {data['total']} leads with source=Direct")
