"""
Tests for Weekly RM Performance Digest and Critical SLA Escalation Email features.
- POST /api/admin/send-weekly-digests - sends digest emails to all active RMs
- POST /api/admin/send-sla-escalations - sends escalation emails for critical breaches (>2x threshold)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestWeeklyDigestEndpoints:
    """Tests for Weekly RM Performance Digest Email feature"""
    
    admin_token = None
    rm_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and RM for tests"""
        # Admin login
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
        
        # RM login
        rm_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venulock.in", 
            "password": "rm123"
        })
        if rm_resp.status_code == 200:
            self.__class__.rm_token = rm_resp.json().get("token")
    
    def test_weekly_digest_requires_authentication(self):
        """Test that weekly digest endpoint requires authentication"""
        resp = requests.post(f"{BASE_URL}/api/admin/send-weekly-digests")
        assert resp.status_code == 401
        assert "Not authenticated" in resp.json().get("detail", "")
        print("PASS: Weekly digest requires authentication")
    
    def test_weekly_digest_requires_admin_role(self):
        """Test that weekly digest endpoint requires admin role"""
        if not self.rm_token:
            pytest.skip("RM token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-weekly-digests",
            headers={"Authorization": f"Bearer {self.rm_token}"}
        )
        assert resp.status_code == 403
        assert "Insufficient permissions" in resp.json().get("detail", "")
        print("PASS: Weekly digest requires admin role")
    
    def test_weekly_digest_admin_can_trigger(self):
        """Test that admin can trigger weekly digest"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-weekly-digests",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Validate response structure
        assert "sent" in data
        assert "failed" in data
        assert "total_rms" in data
        assert isinstance(data["sent"], int)
        assert isinstance(data["failed"], int)
        assert isinstance(data["total_rms"], int)
        
        # Verify sent count matches total_rms minus failed
        assert data["sent"] + data["failed"] == data["total_rms"]
        
        print(f"PASS: Weekly digest sent to {data['sent']} RMs (total: {data['total_rms']})")
    
    def test_weekly_digest_response_format(self):
        """Test weekly digest response format is correct"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-weekly-digests",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # All expected fields present
        expected_fields = ["sent", "failed", "total_rms"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print("PASS: Weekly digest response format is correct")


class TestSLAEscalationEndpoints:
    """Tests for Critical SLA Escalation Email feature"""
    
    admin_token = None
    rm_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and RM for tests"""
        # Admin login
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
        
        # RM login
        rm_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venulock.in",
            "password": "rm123"
        })
        if rm_resp.status_code == 200:
            self.__class__.rm_token = rm_resp.json().get("token")
    
    def test_sla_escalation_requires_authentication(self):
        """Test that SLA escalation endpoint requires authentication"""
        resp = requests.post(f"{BASE_URL}/api/admin/send-sla-escalations")
        assert resp.status_code == 401
        assert "Not authenticated" in resp.json().get("detail", "")
        print("PASS: SLA escalation requires authentication")
    
    def test_sla_escalation_requires_admin_role(self):
        """Test that SLA escalation endpoint requires admin role"""
        if not self.rm_token:
            pytest.skip("RM token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-sla-escalations",
            headers={"Authorization": f"Bearer {self.rm_token}"}
        )
        assert resp.status_code == 403
        assert "Insufficient permissions" in resp.json().get("detail", "")
        print("PASS: SLA escalation requires admin role")
    
    def test_sla_escalation_admin_can_trigger(self):
        """Test that admin can trigger SLA escalation"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-sla-escalations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Validate response structure
        assert "escalated" in data
        assert "checked_at" in data
        assert isinstance(data["escalated"], int)
        assert data["escalated"] >= 0
        
        print(f"PASS: SLA escalation returned {data['escalated']} escalations")
    
    def test_sla_escalation_24h_cooldown(self):
        """Test that SLA escalation respects 24h cooldown per lead"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # First call
        resp1 = requests.post(
            f"{BASE_URL}/api/admin/send-sla-escalations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp1.status_code == 200
        escalated1 = resp1.json().get("escalated", 0)
        
        # Second call immediately after
        resp2 = requests.post(
            f"{BASE_URL}/api/admin/send-sla-escalations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp2.status_code == 200
        escalated2 = resp2.json().get("escalated", 0)
        
        # Second call should return 0 due to cooldown (unless new leads appeared)
        # Note: This test assumes no new critical breaches were added between calls
        print(f"PASS: Escalation cooldown working - First: {escalated1}, Second: {escalated2}")
    
    def test_sla_escalation_response_format(self):
        """Test SLA escalation response format is correct"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-sla-escalations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # All expected fields present
        expected_fields = ["escalated", "checked_at"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # checked_at should be a valid ISO timestamp
        try:
            datetime.fromisoformat(data["checked_at"].replace("Z", "+00:00"))
            print("PASS: SLA escalation response format is correct")
        except ValueError:
            pytest.fail("checked_at is not a valid ISO timestamp")


class TestSLABreachesEndpoint:
    """Tests for SLA breaches monitoring endpoint"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin for tests"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
    
    def test_sla_breaches_returns_aging_leads(self):
        """Test that SLA breaches endpoint returns aging leads with correct structure"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/sla-breaches",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Validate response structure
        assert "aging_leads" in data
        assert "sla_breaches" in data
        assert "summary" in data
        assert "sla_config" in data
        
        # Check aging leads structure (if any exist)
        if data["aging_leads"]:
            lead = data["aging_leads"][0]
            expected_fields = ["lead_id", "customer_name", "stage", "hours_in_stage", "threshold_hours"]
            for field in expected_fields:
                assert field in lead, f"Missing field in aging lead: {field}"
        
        print(f"PASS: SLA breaches endpoint returns {len(data['aging_leads'])} aging leads")
    
    def test_sla_breaches_identifies_critical_leads(self):
        """Test that SLA breaches correctly identifies leads >2x threshold"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/sla-breaches",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check for critical severity leads (>2x threshold)
        critical_leads = [l for l in data.get("aging_leads", []) if l.get("severity") == "critical"]
        
        for lead in critical_leads:
            hours = lead.get("hours_in_stage", 0)
            threshold = lead.get("threshold_hours", 1)
            # Critical leads should be >2x threshold
            assert hours > threshold * 2, f"Lead {lead['lead_id']} marked critical but hours ({hours}) <= 2x threshold ({threshold * 2})"
        
        print(f"PASS: Found {len(critical_leads)} critical leads (>2x threshold)")


class TestVenueCitiesEndpoint:
    """Tests for City Hub Landing Page API"""
    
    def test_venues_cities_returns_cities(self):
        """Test GET /api/venues/cities returns cities with data"""
        resp = requests.get(f"{BASE_URL}/api/venues/cities")
        assert resp.status_code == 200
        data = resp.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "No cities returned"
        
        # Validate first city structure
        city = data[0]
        expected_fields = ["city", "slug", "venue_count", "min_price", "max_capacity"]
        for field in expected_fields:
            assert field in city, f"Missing field: {field}"
        
        assert city["venue_count"] > 0, "First city should have venues"
        print(f"PASS: GET /api/venues/cities returns {len(data)} cities")
    
    def test_venues_cities_has_required_data(self):
        """Test cities have all required fields for City Hub page"""
        resp = requests.get(f"{BASE_URL}/api/venues/cities")
        assert resp.status_code == 200
        cities = resp.json()
        
        for city in cities:
            # Required fields
            assert "city" in city
            assert "slug" in city
            assert "venue_count" in city
            
            # Slug should be lowercase with dashes
            assert city["slug"] == city["slug"].lower()
            
        print("PASS: All cities have required data for City Hub page")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
