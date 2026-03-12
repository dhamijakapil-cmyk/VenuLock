"""
Test suite for Admin Control Room API
Tests the GET /api/admin/control-room endpoint for Revenue & Pipeline Intelligence Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"email": "testadmin@venuloq.com", "password": "test123"}
RM_CREDENTIALS = {"email": "testrm@venuloq.com", "password": "test123"}


class TestControlRoomAPI:
    """Tests for Control Room API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def get_rm_token(self):
        """Login as RM and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=RM_CREDENTIALS
        )
        assert response.status_code == 200, f"RM login failed: {response.text}"
        return response.json()["token"]
    
    def test_control_room_requires_authentication(self):
        """Test that control room endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 401, "Should require authentication"
        print("PASS: Control room requires authentication")
    
    def test_control_room_admin_only(self):
        """Test that control room endpoint is admin-only"""
        rm_token = self.get_rm_token()
        self.session.headers.update({"Authorization": f"Bearer {rm_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 403, f"RM should not access control room. Got: {response.status_code}"
        data = response.json()
        assert "permission" in data.get("detail", "").lower() or "insufficient" in data.get("detail", "").lower()
        print("PASS: Control room is admin-only access")
    
    def test_control_room_returns_metrics(self):
        """Test that control room returns all required metrics"""
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 200, f"Control room API failed: {response.text}"
        
        data = response.json()
        
        # Verify top-level structure
        assert "metrics" in data, "Response should have 'metrics' key"
        assert "monthly_gmv_trend" in data, "Response should have 'monthly_gmv_trend' key"
        assert "top_venues_by_commission" in data, "Response should have 'top_venues_by_commission' key"
        assert "current_month" in data, "Response should have 'current_month' key"
        assert "generated_at" in data, "Response should have 'generated_at' key"
        
        print("PASS: Control room returns all required top-level keys")
    
    def test_control_room_metrics_structure(self):
        """Test that metrics has all required fields"""
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 200
        
        metrics = response.json()["metrics"]
        
        # Required metric fields
        required_fields = [
            "total_pipeline_value",
            "confirmed_gmv_current_month",
            "confirmed_bookings_current_month",
            "bmv_commission_current_month",
            "total_collected_current_month",
            "active_tentative_holds",
            "payment_conversion_rate",
            "total_active_leads"
        ]
        
        for field in required_fields:
            assert field in metrics, f"Missing metric field: {field}"
            # Verify all metrics are numbers
            assert isinstance(metrics[field], (int, float)), f"{field} should be a number"
        
        print("PASS: All required metric fields present with correct types")
    
    def test_control_room_monthly_gmv_trend(self):
        """Test that monthly GMV trend has correct structure (6 months)"""
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 200
        
        trend = response.json()["monthly_gmv_trend"]
        
        # Should have 6 months of data
        assert isinstance(trend, list), "monthly_gmv_trend should be a list"
        assert len(trend) == 6, f"Expected 6 months of trend data, got {len(trend)}"
        
        # Verify each month's structure
        for month_data in trend:
            assert "month" in month_data, "Each trend item should have 'month'"
            assert "month_full" in month_data, "Each trend item should have 'month_full'"
            assert "gmv" in month_data, "Each trend item should have 'gmv'"
            assert "bookings" in month_data, "Each trend item should have 'bookings'"
            assert "commission" in month_data, "Each trend item should have 'commission'"
            
            # Validate types
            assert isinstance(month_data["gmv"], (int, float))
            assert isinstance(month_data["bookings"], (int, float))
            assert isinstance(month_data["commission"], (int, float))
        
        print("PASS: Monthly GMV trend has correct structure with 6 months")
    
    def test_control_room_top_venues_structure(self):
        """Test that top venues table has correct structure"""
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 200
        
        top_venues = response.json()["top_venues_by_commission"]
        
        # Should be a list (possibly empty if no commission data)
        assert isinstance(top_venues, list), "top_venues_by_commission should be a list"
        
        # If there are venues, validate structure
        if top_venues:
            venue = top_venues[0]
            required_venue_fields = [
                "venue_id",
                "venue_name",
                "city",
                "tier",
                "total_revenue",
                "total_commission",
                "payment_count"
            ]
            for field in required_venue_fields:
                assert field in venue, f"Missing venue field: {field}"
            
            # Validate tier values
            assert venue["tier"] in ["Premium", "Standard", "Budget"], f"Invalid tier: {venue['tier']}"
        
        print("PASS: Top venues structure is correct")
    
    def test_control_room_pipeline_value_is_numeric(self):
        """Test that pipeline value is a valid number"""
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 200
        
        pipeline_value = response.json()["metrics"]["total_pipeline_value"]
        assert isinstance(pipeline_value, (int, float)), "Pipeline value should be numeric"
        assert pipeline_value >= 0, "Pipeline value should not be negative"
        
        print(f"PASS: Pipeline value is valid: {pipeline_value}")
    
    def test_control_room_current_month_format(self):
        """Test that current_month is properly formatted"""
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/control-room")
        assert response.status_code == 200
        
        current_month = response.json()["current_month"]
        
        # Should be in format "Month Year" e.g., "February 2026"
        parts = current_month.split()
        assert len(parts) == 2, f"Current month should be 'Month Year' format, got: {current_month}"
        
        # Validate month name
        valid_months = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"]
        assert parts[0] in valid_months, f"Invalid month name: {parts[0]}"
        
        # Validate year
        assert parts[1].isdigit(), f"Year should be numeric: {parts[1]}"
        
        print(f"PASS: Current month format correct: {current_month}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
