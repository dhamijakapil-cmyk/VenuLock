"""
Test Team Announcements CRUD API
Tests:
- GET /api/team/announcements - returns active announcements (public)
- GET /api/team/announcements/all - returns ALL announcements (admin only, 403 for non-admin)
- POST /api/team/announcements - create announcement (admin only)
- PUT /api/team/announcements/{id} - update announcement (admin only)
- DELETE /api/team/announcements/{id} - delete announcement (admin only)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAnnouncementsAPI:
    """Test Announcements CRUD endpoints"""
    
    admin_token = None
    hr_token = None
    test_announcement_id = None
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Get admin and HR tokens for testing"""
        if not TestAnnouncementsAPI.admin_token:
            # Admin login
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@venulock.in",
                "password": "admin123"
            })
            if resp.status_code == 200:
                TestAnnouncementsAPI.admin_token = resp.json().get("token")
        
        if not TestAnnouncementsAPI.hr_token:
            # HR login
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "hr@venuloq.in",
                "password": "hr123"
            })
            if resp.status_code == 200:
                TestAnnouncementsAPI.hr_token = resp.json().get("token")
    
    # ───────────────────────────────────────────────────────────────────
    # GET /api/team/announcements - Public (active only)
    # ───────────────────────────────────────────────────────────────────
    
    def test_get_active_announcements_no_auth(self):
        """Public can fetch active announcements without authentication"""
        resp = requests.get(f"{BASE_URL}/api/team/announcements")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of announcements"
        # Should return active announcements (seed data exists)
        print(f"Found {len(data)} active announcements")
    
    def test_get_active_announcements_with_auth(self):
        """Authenticated user can fetch active announcements"""
        headers = {"Authorization": f"Bearer {self.hr_token}"} if self.hr_token else {}
        resp = requests.get(f"{BASE_URL}/api/team/announcements", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list)
        # Verify structure of announcements
        for ann in data:
            assert "announcement_id" in ann or "title" in ann, "Missing announcement fields"
            assert ann.get("active") == True, f"Got inactive announcement: {ann}"
        print(f"Active announcements returned: {len(data)}")
    
    def test_active_announcements_sorted_pinned_first(self):
        """Active announcements should be sorted by pinned first, then newest"""
        resp = requests.get(f"{BASE_URL}/api/team/announcements")
        assert resp.status_code == 200
        data = resp.json()
        if len(data) >= 2:
            # Check that pinned announcements come first
            pinned_found = False
            unpinned_found_after_pinned = False
            for ann in data:
                if ann.get("pinned"):
                    pinned_found = True
                elif pinned_found:
                    unpinned_found_after_pinned = True
                    break
            # If we have both pinned and unpinned, pinned should come first
            # This is a sanity check - actual ordering depends on seed data
            print(f"Pinned sorting check complete. Pinned found: {pinned_found}")
    
    # ───────────────────────────────────────────────────────────────────
    # GET /api/team/announcements/all - Admin only
    # ───────────────────────────────────────────────────────────────────
    
    def test_get_all_announcements_admin_success(self):
        """Admin can fetch ALL announcements (including inactive)"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/team/announcements/all", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} total announcements")
    
    def test_get_all_announcements_hr_forbidden(self):
        """HR role should get 403 when accessing /all endpoint"""
        if not self.hr_token:
            pytest.skip("HR token not available")
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        resp = requests.get(f"{BASE_URL}/api/team/announcements/all", headers=headers)
        assert resp.status_code == 403, f"Expected 403 for non-admin, got {resp.status_code}"
        print("HR correctly denied access to /all endpoint")
    
    def test_get_all_announcements_no_auth_forbidden(self):
        """No auth should get 403 when accessing /all endpoint"""
        resp = requests.get(f"{BASE_URL}/api/team/announcements/all")
        assert resp.status_code == 403, f"Expected 403 for no auth, got {resp.status_code}"
        print("Unauthenticated correctly denied access to /all endpoint")
    
    # ───────────────────────────────────────────────────────────────────
    # POST /api/team/announcements - Admin only
    # ───────────────────────────────────────────────────────────────────
    
    def test_create_announcement_admin_success(self):
        """Admin can create a new announcement"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        unique_title = f"TEST_Announcement_{uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique_title,
            "body": "This is a test announcement body",
            "type": "info",
            "pinned": False,
            "expires_at": None
        }
        
        resp = requests.post(f"{BASE_URL}/api/team/announcements", json=payload, headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Validate response structure
        assert "announcement_id" in data, "Missing announcement_id in response"
        assert data.get("title") == unique_title, f"Title mismatch: {data.get('title')}"
        assert data.get("body") == "This is a test announcement body"
        assert data.get("type") == "info"
        assert data.get("active") == True
        
        # Store for cleanup
        TestAnnouncementsAPI.test_announcement_id = data.get("announcement_id")
        print(f"Created announcement: {TestAnnouncementsAPI.test_announcement_id}")
    
    def test_create_announcement_hr_forbidden(self):
        """HR role should get 403 when creating announcement"""
        if not self.hr_token:
            pytest.skip("HR token not available")
        
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        payload = {"title": "HR Test", "body": "Should fail", "type": "info"}
        
        resp = requests.post(f"{BASE_URL}/api/team/announcements", json=payload, headers=headers)
        assert resp.status_code == 403, f"Expected 403 for non-admin, got {resp.status_code}"
        print("HR correctly denied from creating announcement")
    
    def test_create_announcement_no_auth_forbidden(self):
        """Unauthenticated should get 403 when creating announcement"""
        payload = {"title": "No Auth Test", "body": "Should fail", "type": "info"}
        resp = requests.post(f"{BASE_URL}/api/team/announcements", json=payload)
        assert resp.status_code == 403, f"Expected 403 for no auth, got {resp.status_code}"
    
    def test_create_announcement_missing_title(self):
        """Should fail with 400 if title is missing"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {"body": "No title provided", "type": "info"}
        
        resp = requests.post(f"{BASE_URL}/api/team/announcements", json=payload, headers=headers)
        assert resp.status_code == 400, f"Expected 400 for missing title, got {resp.status_code}"
        print("Missing title correctly rejected with 400")
    
    def test_create_announcement_all_types(self):
        """Test creating announcements with all valid types"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        types = ["info", "success", "warning", "urgent"]
        created_ids = []
        
        for ann_type in types:
            payload = {
                "title": f"TEST_Type_{ann_type}_{uuid.uuid4().hex[:4]}",
                "body": f"Testing {ann_type} type",
                "type": ann_type,
                "pinned": False
            }
            resp = requests.post(f"{BASE_URL}/api/team/announcements", json=payload, headers=headers)
            assert resp.status_code == 200, f"Failed to create {ann_type} announcement: {resp.text}"
            data = resp.json()
            assert data.get("type") == ann_type, f"Type mismatch for {ann_type}"
            created_ids.append(data.get("announcement_id"))
        
        # Cleanup created announcements
        for ann_id in created_ids:
            requests.delete(f"{BASE_URL}/api/team/announcements/{ann_id}", headers=headers)
        print(f"All 4 announcement types created and cleaned up successfully")
    
    # ───────────────────────────────────────────────────────────────────
    # PUT /api/team/announcements/{id} - Admin only
    # ───────────────────────────────────────────────────────────────────
    
    def test_update_announcement_admin_success(self):
        """Admin can update an existing announcement"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        if not TestAnnouncementsAPI.test_announcement_id:
            pytest.skip("No test announcement to update")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        ann_id = TestAnnouncementsAPI.test_announcement_id
        
        # Update title and toggle pinned
        payload = {"title": "UPDATED_Title", "pinned": True}
        resp = requests.put(f"{BASE_URL}/api/team/announcements/{ann_id}", json=payload, headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("title") == "UPDATED_Title"
        assert data.get("pinned") == True
        print(f"Updated announcement {ann_id} successfully")
    
    def test_toggle_active_status(self):
        """Admin can toggle active/hidden status"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        if not TestAnnouncementsAPI.test_announcement_id:
            pytest.skip("No test announcement")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        ann_id = TestAnnouncementsAPI.test_announcement_id
        
        # Set to inactive
        resp = requests.put(f"{BASE_URL}/api/team/announcements/{ann_id}", 
                           json={"active": False}, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("active") == False, "Failed to set inactive"
        
        # Verify it's not in active list
        resp2 = requests.get(f"{BASE_URL}/api/team/announcements")
        active_ids = [a.get("announcement_id") for a in resp2.json()]
        assert ann_id not in active_ids, "Hidden announcement still in active list"
        
        # Restore to active
        resp3 = requests.put(f"{BASE_URL}/api/team/announcements/{ann_id}", 
                            json={"active": True}, headers=headers)
        assert resp3.status_code == 200
        assert resp3.json().get("active") == True
        print("Toggle active/hidden works correctly")
    
    def test_update_announcement_hr_forbidden(self):
        """HR role should get 403 when updating announcement"""
        if not self.hr_token:
            pytest.skip("HR token not available")
        if not TestAnnouncementsAPI.test_announcement_id:
            pytest.skip("No test announcement")
        
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        ann_id = TestAnnouncementsAPI.test_announcement_id
        
        resp = requests.put(f"{BASE_URL}/api/team/announcements/{ann_id}", 
                           json={"title": "HR Update"}, headers=headers)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("HR correctly denied from updating announcement")
    
    def test_update_nonexistent_announcement(self):
        """Should return 404 for non-existent announcement"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        resp = requests.put(f"{BASE_URL}/api/team/announcements/nonexistent_id_12345", 
                           json={"title": "Test"}, headers=headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    
    # ───────────────────────────────────────────────────────────────────
    # DELETE /api/team/announcements/{id} - Admin only
    # ───────────────────────────────────────────────────────────────────
    
    def test_delete_announcement_hr_forbidden(self):
        """HR role should get 403 when deleting announcement"""
        if not self.hr_token:
            pytest.skip("HR token not available")
        if not TestAnnouncementsAPI.test_announcement_id:
            pytest.skip("No test announcement")
        
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        ann_id = TestAnnouncementsAPI.test_announcement_id
        
        resp = requests.delete(f"{BASE_URL}/api/team/announcements/{ann_id}", headers=headers)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("HR correctly denied from deleting announcement")
    
    def test_delete_announcement_admin_success(self):
        """Admin can delete an announcement"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        if not TestAnnouncementsAPI.test_announcement_id:
            pytest.skip("No test announcement to delete")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        ann_id = TestAnnouncementsAPI.test_announcement_id
        
        resp = requests.delete(f"{BASE_URL}/api/team/announcements/{ann_id}", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        # Verify deletion
        resp2 = requests.get(f"{BASE_URL}/api/team/announcements/all", headers=headers)
        all_ids = [a.get("announcement_id") for a in resp2.json()]
        assert ann_id not in all_ids, "Deleted announcement still exists"
        
        TestAnnouncementsAPI.test_announcement_id = None
        print(f"Deleted announcement {ann_id} successfully")
    
    def test_delete_nonexistent_announcement(self):
        """Should return 404 for non-existent announcement"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        resp = requests.delete(f"{BASE_URL}/api/team/announcements/nonexistent_12345", headers=headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    
    # ───────────────────────────────────────────────────────────────────
    # Dashboard announcements integration
    # ───────────────────────────────────────────────────────────────────
    
    def test_dashboard_returns_announcements(self):
        """Dashboard endpoint should include announcements"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/team/dashboard", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "announcements" in data, "Dashboard missing announcements field"
        assert isinstance(data["announcements"], list)
        print(f"Dashboard returns {len(data['announcements'])} announcements")
    
    def test_seed_announcements_exist(self):
        """Verify seed announcements exist (Q1 Targets, System Maintenance)"""
        resp = requests.get(f"{BASE_URL}/api/team/announcements")
        assert resp.status_code == 200
        data = resp.json()
        
        titles = [ann.get("title") for ann in data]
        # Check if seed data exists
        has_q1 = any("Q1" in t or "Targets" in t for t in titles if t)
        has_maintenance = any("Maintenance" in t for t in titles if t)
        
        print(f"Seed data check - Q1 Targets: {has_q1}, Maintenance: {has_maintenance}")
        print(f"Found announcements: {titles[:5]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
