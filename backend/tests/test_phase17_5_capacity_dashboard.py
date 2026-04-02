"""
Phase 17.5: Ven-Us Capacity / Workforce Health Panel Tests
Tests the capacity intelligence API and admin-only access controls.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def rm_token(api_client):
    """Get RM authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": RM_EMAIL,
        "password": RM_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"RM login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


class TestAuthenticationLogins:
    """Test that all user types can login successfully"""
    
    def test_admin_login(self, api_client):
        """Admin login should succeed"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "admin"
        print(f"✓ Admin login successful - role: {data.get('user', {}).get('role')}")
    
    def test_rm_login(self, api_client):
        """RM login should succeed"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert response.status_code == 200, f"RM login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "rm"
        print(f"✓ RM login successful - role: {data.get('user', {}).get('role')}")
    
    def test_customer_login(self, api_client):
        """Customer login should succeed"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "customer"
        print(f"✓ Customer login successful - role: {data.get('user', {}).get('role')}")


class TestCapacityAnalysisAPI:
    """Test the capacity analysis endpoint"""
    
    def test_capacity_analysis_admin_access(self, api_client, admin_token):
        """Admin should be able to access capacity analysis"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/capacity/analysis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Capacity analysis failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "rm_loads" in data, "Missing rm_loads in response"
        assert "alerts" in data, "Missing alerts in response"
        assert "analyzed_at" in data, "Missing analyzed_at in response"
        assert "total_rms" in data, "Missing total_rms in response"
        assert "avg_rm_load" in data, "Missing avg_rm_load in response"
        assert "alert_count" in data, "Missing alert_count in response"
        
        print(f"✓ Capacity analysis returned successfully")
        print(f"  - Total RMs: {data.get('total_rms')}")
        print(f"  - Avg RM Load: {data.get('avg_rm_load')}")
        print(f"  - Alerts: {len(data.get('alerts', []))}")
    
    def test_rm_loads_structure(self, api_client, admin_token):
        """Verify rm_loads array has correct per-RM data structure"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/capacity/analysis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        rm_loads = data.get("rm_loads", [])
        if len(rm_loads) > 0:
            rm = rm_loads[0]
            # Verify each RM has required fields
            assert "rm_id" in rm, "Missing rm_id in RM load data"
            assert "name" in rm, "Missing name in RM load data"
            assert "active_cases" in rm, "Missing active_cases in RM load data"
            assert "capacity_pct" in rm, "Missing capacity_pct in RM load data"
            assert "overdue_followups" in rm, "Missing overdue_followups in RM load data"
            
            print(f"✓ RM loads structure verified")
            print(f"  - Sample RM: {rm.get('name')} - {rm.get('active_cases')} cases, {rm.get('capacity_pct')}% capacity")
        else:
            print("⚠ No RMs found in rm_loads (may be expected if no active RMs)")
    
    def test_alerts_structure(self, api_client, admin_token):
        """Verify alerts have correct structure with severity/category/recommendation"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/capacity/analysis",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        alerts = data.get("alerts", [])
        if len(alerts) > 0:
            alert = alerts[0]
            # Verify alert structure
            assert "severity" in alert, "Missing severity in alert"
            assert "category" in alert, "Missing category in alert"
            assert "title" in alert, "Missing title in alert"
            assert "message" in alert, "Missing message in alert"
            assert "recommendation" in alert, "Missing recommendation in alert"
            
            # Verify severity is valid
            assert alert["severity"] in ["critical", "warning", "info"], f"Invalid severity: {alert['severity']}"
            
            print(f"✓ Alerts structure verified")
            print(f"  - Sample alert: [{alert.get('severity')}] {alert.get('title')}")
        else:
            print("✓ No alerts (system healthy)")
        
        # Verify alert_count structure
        alert_count = data.get("alert_count", {})
        assert "critical" in alert_count, "Missing critical count in alert_count"
        assert "warning" in alert_count, "Missing warning count in alert_count"
        print(f"  - Alert counts: {alert_count.get('critical')} critical, {alert_count.get('warning')} warnings")
    
    def test_capacity_analysis_rm_forbidden(self, api_client, rm_token):
        """RM users should get 403 when accessing capacity analysis"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/capacity/analysis",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for RM, got {response.status_code}"
        print("✓ RM correctly denied access to capacity analysis (403)")
    
    def test_capacity_analysis_customer_forbidden(self, api_client, customer_token):
        """Customer users should get 403 when accessing capacity analysis"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/capacity/analysis",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print("✓ Customer correctly denied access to capacity analysis (403)")
    
    def test_capacity_analysis_unauthenticated(self, api_client):
        """Unauthenticated requests should get 401"""
        response = api_client.get(f"{BASE_URL}/api/platform-ops/capacity/analysis")
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("✓ Unauthenticated request correctly denied (401)")


class TestCapacityHistoryAPI:
    """Test the capacity history endpoint"""
    
    def test_capacity_history_admin_access(self, api_client, admin_token):
        """Admin should be able to access capacity history"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/capacity/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Capacity history failed: {response.text}"
        data = response.json()
        
        assert "snapshots" in data, "Missing snapshots in response"
        print(f"✓ Capacity history returned {len(data.get('snapshots', []))} snapshots")


class TestOtherPlatformOpsEndpoints:
    """Test other platform-ops endpoints for admin-only access"""
    
    def test_performance_stats_admin(self, api_client, admin_token):
        """Admin should access performance stats"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/performance/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        print(f"✓ Performance stats accessible - {len(data.get('stats', []))} endpoints tracked")
    
    def test_db_health_admin(self, api_client, admin_token):
        """Admin should access DB health"""
        response = api_client.get(
            f"{BASE_URL}/api/platform-ops/health/db",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ DB health check passed - {data.get('collections')} collections")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
