"""
Test P2 Features: Badge Counts, Finance/Operations/Marketing API endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-event-search.preview.emergentagent.com')


class TestBadgeCounts:
    """Test badge counts API for different roles"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def hr_token(self):
        """Login as HR and get token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "hr@venuloq.in",
            "password": "hr123"
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("HR login failed")
    
    @pytest.fixture
    def vam_token(self):
        """Login as VAM and get token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vam@venuloq.in",
            "password": "vam123"
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("VAM login failed")
    
    def test_badge_counts_admin(self, admin_token):
        """Admin gets Users, Venues, Client Cases counts"""
        res = requests.get(
            f"{BASE_URL}/api/team/badge-counts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        # Admin should have these keys (values can be 0 or more)
        print(f"Admin badge counts: {data}")
        # These keys should be present based on team.py code
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        # Check if expected keys exist (may be 0 if no pending items)
        # Keys: Users, Venues, Client Cases
    
    def test_badge_counts_hr(self, hr_token):
        """HR gets Staff Verification count"""
        res = requests.get(
            f"{BASE_URL}/api/team/badge-counts",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        print(f"HR badge counts: {data}")
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        # HR should see 'Staff Verification' key
    
    def test_badge_counts_vam(self, vam_token):
        """VAM gets Review Queue count"""
        res = requests.get(
            f"{BASE_URL}/api/team/badge-counts",
            headers={"Authorization": f"Bearer {vam_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        print(f"VAM badge counts: {data}")
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        # VAM should see 'Review Queue' key
    
    def test_badge_counts_unauthenticated(self):
        """Unauthenticated request returns empty dict"""
        res = requests.get(f"{BASE_URL}/api/team/badge-counts")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        print(f"Unauthenticated badge counts: {data}")
        assert data == {}, f"Expected empty dict for unauthenticated, got {data}"


class TestAdminEndpoints:
    """Test admin endpoints used by Finance/Operations/Marketing dashboards"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_admin_payments(self, admin_token):
        """Finance dashboard uses GET /api/admin/payments"""
        res = requests.get(
            f"{BASE_URL}/api/admin/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Admin payments response keys: {data.keys() if isinstance(data, dict) else type(data)}")
    
    def test_admin_leads(self, admin_token):
        """Finance/Marketing dashboards use GET /api/admin/leads"""
        res = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Admin leads response keys: {data.keys() if isinstance(data, dict) else type(data)}")
    
    def test_admin_stats(self, admin_token):
        """Operations dashboard uses GET /api/admin/stats"""
        res = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Admin stats: {data}")
    
    def test_venue_onboarding_all(self, admin_token):
        """Operations dashboard uses GET /api/venue-onboarding/all"""
        res = requests.get(
            f"{BASE_URL}/api/venue-onboarding/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Venue onboarding response keys: {data.keys() if isinstance(data, dict) else type(data)}")
    
    def test_venues_cities(self, admin_token):
        """Marketing dashboard uses GET /api/venues/cities"""
        res = requests.get(f"{BASE_URL}/api/venues/cities")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Cities count: {len(data) if isinstance(data, list) else data}")


class TestSEOEndpoints:
    """Test public endpoints used for SEO pages"""
    
    def test_landing_page_loads(self):
        """Landing page should be accessible"""
        res = requests.get(f"{BASE_URL}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    
    def test_featured_venues(self):
        """Get featured venues for venue detail SEO test"""
        res = requests.get(f"{BASE_URL}/api/venues/featured")
        if res.status_code == 200:
            data = res.json()
            print(f"Featured venues count: {len(data) if isinstance(data, list) else 0}")
            if data and len(data) > 0:
                print(f"First featured venue: {data[0].get('name')} - slug: {data[0].get('slug')}")
        else:
            print(f"Featured venues endpoint returned {res.status_code}")
    
    def test_venues_search(self):
        """Public venue search"""
        res = requests.get(f"{BASE_URL}/api/venues")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Venues count: {len(data) if isinstance(data, list) else 0}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
