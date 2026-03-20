"""
Test Team Welcome Dashboard API - /api/team/dashboard
Tests role-specific dashboard data for Admin, HR, RM roles
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"
HR_EMAIL = "hr@venuloq.in"
HR_PASSWORD = "hr123"
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"


class TestTeamDashboardAPI:
    """Tests for /api/team/dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def hr_token(self):
        """Get HR auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": HR_EMAIL,
            "password": HR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"HR authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def rm_token(self):
        """Get RM auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"RM authentication failed: {response.status_code} - {response.text}")
    
    # --- Admin Dashboard Tests ---
    def test_admin_dashboard_returns_200(self, admin_token):
        """Admin can fetch team dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_admin_dashboard_has_required_fields(self, admin_token):
        """Admin dashboard returns user_name, role, quick_stats, recent_activity"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "user_name" in data, "Missing user_name in response"
        assert "role" in data, "Missing role in response"
        assert "quick_stats" in data, "Missing quick_stats in response"
        assert "recent_activity" in data, "Missing recent_activity in response"
        assert "announcements" in data, "Missing announcements in response"
    
    def test_admin_dashboard_role_is_admin(self, admin_token):
        """Admin dashboard returns role='admin'"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        assert data.get("role") == "admin", f"Expected role 'admin', got '{data.get('role')}'"
    
    def test_admin_dashboard_has_four_quick_stats(self, admin_token):
        """Admin dashboard has exactly 4 quick stats: Total Venues, Total Leads, Team Members, Pending Reviews"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        quick_stats = data.get("quick_stats", [])
        assert len(quick_stats) == 4, f"Expected 4 quick stats, got {len(quick_stats)}"
        
        stat_labels = [stat["label"] for stat in quick_stats]
        expected_labels = ["Total Venues", "Total Leads", "Team Members", "Pending Reviews"]
        for label in expected_labels:
            assert label in stat_labels, f"Missing expected stat: {label}"
    
    def test_admin_quick_stats_structure(self, admin_token):
        """Each quick stat has label, value, icon"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        for stat in data.get("quick_stats", []):
            assert "label" in stat, f"Stat missing label: {stat}"
            assert "value" in stat, f"Stat missing value: {stat}"
            assert "icon" in stat, f"Stat missing icon: {stat}"
            assert isinstance(stat["value"], (int, float)), f"Stat value should be numeric: {stat}"
    
    def test_admin_recent_activity_structure(self, admin_token):
        """Recent activity items have type, title, subtitle, time"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        for item in data.get("recent_activity", []):
            assert "type" in item, f"Activity missing type: {item}"
            assert "title" in item, f"Activity missing title: {item}"
            assert "subtitle" in item, f"Activity missing subtitle: {item}"
            assert "time" in item, f"Activity missing time: {item}"
    
    # --- HR Dashboard Tests ---
    def test_hr_dashboard_returns_200(self, hr_token):
        """HR can fetch team dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_hr_dashboard_role_is_hr(self, hr_token):
        """HR dashboard returns role='hr'"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        data = response.json()
        assert data.get("role") == "hr", f"Expected role 'hr', got '{data.get('role')}'"
    
    def test_hr_dashboard_has_three_quick_stats(self, hr_token):
        """HR dashboard has 3 quick stats: Total Staff, Pending Verification, Verified"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        data = response.json()
        
        quick_stats = data.get("quick_stats", [])
        assert len(quick_stats) == 3, f"Expected 3 quick stats for HR, got {len(quick_stats)}"
        
        stat_labels = [stat["label"] for stat in quick_stats]
        expected_labels = ["Total Staff", "Pending Verification", "Verified"]
        for label in expected_labels:
            assert label in stat_labels, f"Missing expected HR stat: {label}"
    
    # --- RM Dashboard Tests ---
    def test_rm_dashboard_returns_200(self, rm_token):
        """RM can fetch team dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_rm_dashboard_role_is_rm(self, rm_token):
        """RM dashboard returns role='rm'"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        data = response.json()
        assert data.get("role") == "rm", f"Expected role 'rm', got '{data.get('role')}'"
    
    def test_rm_dashboard_has_three_quick_stats(self, rm_token):
        """RM dashboard has 3 quick stats: My Leads, Active, Won"""
        response = requests.get(
            f"{BASE_URL}/api/team/dashboard",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        data = response.json()
        
        quick_stats = data.get("quick_stats", [])
        assert len(quick_stats) == 3, f"Expected 3 quick stats for RM, got {len(quick_stats)}"
        
        stat_labels = [stat["label"] for stat in quick_stats]
        expected_labels = ["My Leads", "Active", "Won"]
        for label in expected_labels:
            assert label in stat_labels, f"Missing expected RM stat: {label}"
    
    # --- Unauthenticated Access Test ---
    def test_dashboard_without_token_returns_data(self):
        """Dashboard without token returns default data (graceful fallback)"""
        response = requests.get(f"{BASE_URL}/api/team/dashboard")
        # The endpoint returns 200 with fallback data even without auth
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("user_name") == "Team Member", "Expected default user_name"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
