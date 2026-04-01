"""
Test suite for VenuLoQ Field Workflow - Acquisitions API
Tests: Create draft, update, list, stats, status transitions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-event-search.preview.emergentagent.com')

# Test credentials
SPECIALIST_EMAIL = "specialist@venuloq.in"
SPECIALIST_PASSWORD = "test123"


class TestAcquisitionsFieldWorkflow:
    """Test acquisitions API for field workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as specialist and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SPECIALIST_EMAIL, "password": SPECIALIST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user = data["user"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        print(f"Logged in as: {self.user['name']} ({self.user['role']})")
    
    def test_01_specialist_login(self):
        """Test specialist can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SPECIALIST_EMAIL, "password": SPECIALIST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "venue_specialist"
        print(f"SUCCESS: Specialist login works, role={data['user']['role']}")
    
    def test_02_create_draft_acquisition(self):
        """Test creating a new draft acquisition"""
        payload = {
            "venue_name": f"TEST_Draft_Venue_{int(time.time())}",
            "owner_name": "Test Owner",
            "owner_phone": "9876543210",
            "venue_type": "banquet_hall"
        }
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "acquisition_id" in data
        assert data["status"] == "draft"
        assert "completeness" in data
        print(f"SUCCESS: Created draft acquisition: {data['acquisition_id']}")
        
        # Store for cleanup
        self.created_acq_id = data["acquisition_id"]
        return data["acquisition_id"]
    
    def test_03_list_my_acquisitions(self):
        """Test listing acquisitions with my_only=true"""
        response = requests.get(
            f"{BASE_URL}/api/acquisitions/?my_only=true",
            headers=self.headers
        )
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        assert "acquisitions" in data
        assert "count" in data
        assert isinstance(data["acquisitions"], list)
        print(f"SUCCESS: Listed {data['count']} acquisitions")
    
    def test_04_get_stats_summary(self):
        """Test stats summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/acquisitions/stats/summary",
            headers=self.headers
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "by_status" in data
        assert isinstance(data["by_status"], dict)
        print(f"SUCCESS: Stats summary - total={data['total']}, by_status={data['by_status']}")
    
    def test_05_get_single_acquisition(self):
        """Test getting a single acquisition by ID"""
        # First create one
        create_payload = {
            "venue_name": f"TEST_Get_Venue_{int(time.time())}",
            "owner_name": "Get Test Owner",
            "owner_phone": "9876543211"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=self.headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        acq_id = create_response.json()["acquisition_id"]
        
        # Now get it
        response = requests.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get failed: {response.text}"
        data = response.json()
        assert data["acquisition_id"] == acq_id
        assert data["venue_name"] == create_payload["venue_name"]
        assert "completeness" in data
        print(f"SUCCESS: Got acquisition {acq_id}")
    
    def test_06_update_acquisition(self):
        """Test updating an acquisition"""
        # First create one
        create_payload = {
            "venue_name": f"TEST_Update_Venue_{int(time.time())}",
            "owner_name": "Update Test Owner",
            "owner_phone": "9876543212"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=self.headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        acq_id = create_response.json()["acquisition_id"]
        
        # Update it
        update_payload = {
            "city": "Delhi",
            "locality": "Connaught Place",
            "capacity_min": 100,
            "capacity_max": 500,
            "pricing_band_min": 1500
        }
        response = requests.put(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers=self.headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert "completeness" in data
        print(f"SUCCESS: Updated acquisition {acq_id}")
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["city"] == "Delhi"
        assert get_data["locality"] == "Connaught Place"
        print(f"SUCCESS: Update verified - city={get_data['city']}, locality={get_data['locality']}")
    
    def test_07_submit_for_review(self):
        """Test submitting acquisition for review"""
        # Create a complete acquisition
        create_payload = {
            "venue_name": f"TEST_Submit_Venue_{int(time.time())}",
            "owner_name": "Submit Test Owner",
            "owner_phone": "9876543213",
            "city": "Delhi",
            "locality": "Karol Bagh",
            "venue_type": "hotel",
            "capacity_min": 100,
            "capacity_max": 500,
            "owner_interest": "hot",
            "pricing_band_min": 1500,
            "meeting_outcome": "Interested — send onboarding link",
            "next_followup_date": "2026-04-10"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=self.headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        acq_id = create_response.json()["acquisition_id"]
        
        # Submit for review
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            headers=self.headers,
            json={"new_status": "submitted_for_review"}
        )
        assert response.status_code == 200, f"Submit failed: {response.text}"
        data = response.json()
        assert "submitted_for_review" in data["message"]
        print(f"SUCCESS: Submitted acquisition {acq_id} for review")
        
        # Verify status changed
        get_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{acq_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "submitted_for_review"
        print(f"SUCCESS: Status verified as submitted_for_review")
    
    def test_08_cannot_submit_incomplete(self):
        """Test that incomplete acquisition cannot be submitted"""
        # Create incomplete acquisition (missing mandatory fields)
        create_payload = {
            "venue_name": f"TEST_Incomplete_Venue_{int(time.time())}",
            "owner_name": "Incomplete Owner"
            # Missing: owner_phone, city, locality, venue_type, capacity_min, capacity_max
        }
        create_response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=self.headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        acq_id = create_response.json()["acquisition_id"]
        
        # Try to submit - should fail
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{acq_id}/status",
            headers=self.headers,
            json={"new_status": "submitted_for_review"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "missing mandatory fields" in response.json()["detail"].lower()
        print(f"SUCCESS: Incomplete acquisition correctly rejected for submission")
    
    def test_09_filter_by_status(self):
        """Test filtering acquisitions by status"""
        response = requests.get(
            f"{BASE_URL}/api/acquisitions/?status=draft&my_only=true",
            headers=self.headers
        )
        assert response.status_code == 200, f"Filter failed: {response.text}"
        data = response.json()
        # All returned should be drafts
        for acq in data["acquisitions"]:
            assert acq["status"] == "draft", f"Expected draft, got {acq['status']}"
        print(f"SUCCESS: Filtered by status=draft, got {data['count']} results")


class TestRoleProtection:
    """Test role-based access control for acquisitions"""
    
    def test_customer_cannot_create_acquisition(self):
        """Test that customer role cannot create acquisitions"""
        # Login as customer
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "democustomer@venulock.in", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Customer login failed - account may not exist")
        
        token = login_response.json()["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Try to create acquisition
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/",
            headers=headers,
            json={"venue_name": "Customer Test Venue"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"SUCCESS: Customer correctly denied acquisition creation")
    
    def test_admin_can_access_all(self):
        """Test that admin can access all acquisitions"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@venulock.in", "password": "admin123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed - account may not exist")
        
        token = login_response.json()["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # List all acquisitions (not just own)
        response = requests.get(
            f"{BASE_URL}/api/acquisitions/",
            headers=headers
        )
        assert response.status_code == 200, f"Admin list failed: {response.text}"
        data = response.json()
        print(f"SUCCESS: Admin can list all acquisitions, count={data['count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
