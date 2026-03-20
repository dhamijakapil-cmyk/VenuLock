"""
VenuLoQ RM Onboarding Workflow Tests
=====================================
Tests the full RM lifecycle:
1. Admin creates RM with temp password
2. RM logs in and changes password
3. RM completes profile
4. HR verifies RM
5. RM can access dashboard after verification
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"
HR_EMAIL = "hr@venuloq.in"
HR_PASSWORD = "hr123"

# Test RM we'll create - unique email per test run
TEST_RM_EMAIL = f"test_rm_onboard_{int(time.time())}@venuloq.in"
TEST_RM_NAME = "Test RM Onboarding"
TEST_RM_TEMP_PASSWORD = "temp1234"
TEST_RM_NEW_PASSWORD = "newpass123"

# Profile data
TEST_RM_PHONE = "9876543210"
TEST_RM_ADDRESS = "123 Test Street, Mumbai, India"
TEST_RM_EMERGENCY_NAME = "Emergency Contact Test"
TEST_RM_EMERGENCY_PHONE = "9999888877"


class TestAdminLogin:
    """Ensure admin can log in before creating RMs"""
    
    def test_admin_login(self, api_session):
        """Admin can log in successfully"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin logged in: {data['user']['email']}")


class TestHRLogin:
    """Ensure HR can log in"""
    
    def test_hr_login(self, api_session):
        """HR can log in successfully"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": HR_EMAIL,
            "password": HR_PASSWORD
        })
        assert response.status_code == 200, f"HR login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "hr"
        print(f"✓ HR logged in: {data['user']['email']}")


class TestRMOnboardingWorkflow:
    """Full RM onboarding workflow tests"""
    
    test_rm_id = None
    
    def test_01_admin_creates_rm(self, admin_token, api_session):
        """Admin creates new RM with temporary password"""
        api_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_session.post(f"{BASE_URL}/api/admin/create-rm", json={
            "name": TEST_RM_NAME,
            "email": TEST_RM_EMAIL,
            "password": TEST_RM_TEMP_PASSWORD
        })
        
        assert response.status_code == 200, f"Failed to create RM: {response.text}"
        data = response.json()
        
        assert "user_id" in data
        assert data["email"] == TEST_RM_EMAIL.lower()
        assert "temp_password" in data
        
        TestRMOnboardingWorkflow.test_rm_id = data["user_id"]
        print(f"✓ RM created: {data['email']} (ID: {data['user_id']})")
    
    def test_02_admin_create_rm_duplicate_fails(self, admin_token, api_session):
        """Creating RM with same email fails with 400"""
        api_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_session.post(f"{BASE_URL}/api/admin/create-rm", json={
            "name": "Duplicate RM",
            "email": TEST_RM_EMAIL,
            "password": "anotherpass123"
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ Duplicate RM creation correctly rejected")
    
    def test_03_new_rm_login_requires_password_change(self, api_session):
        """New RM can login and response shows must_change_password=true"""
        api_session.headers.pop("Authorization", None)
        
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_RM_EMAIL,
            "password": TEST_RM_TEMP_PASSWORD
        })
        
        assert response.status_code == 200, f"RM login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert data["user"]["role"] == "rm"
        assert data["user"]["must_change_password"] == True, "Expected must_change_password=true"
        assert data["user"]["profile_completed"] == False, "Expected profile_completed=false"
        assert data["user"]["verification_status"] == "pending", "Expected verification_status=pending"
        
        print("✓ New RM logged in with must_change_password=true, profile_completed=false, verification_status=pending")
    
    def test_04_rm_changes_password(self, rm_temp_token, api_session):
        """RM can change temporary password"""
        api_session.headers.update({"Authorization": f"Bearer {rm_temp_token}"})
        
        response = api_session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": TEST_RM_TEMP_PASSWORD,
            "new_password": TEST_RM_NEW_PASSWORD
        })
        
        assert response.status_code == 200, f"Password change failed: {response.text}"
        data = response.json()
        assert "message" in data
        print("✓ RM password changed successfully")
    
    def test_05_rm_can_login_with_new_password(self, api_session):
        """RM can login with new password after change"""
        api_session.headers.pop("Authorization", None)
        
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_RM_EMAIL,
            "password": TEST_RM_NEW_PASSWORD
        })
        
        assert response.status_code == 200, f"RM login with new password failed: {response.text}"
        data = response.json()
        
        # After password change, must_change_password should be false
        assert data["user"]["must_change_password"] == False, "Expected must_change_password=false after change"
        assert data["user"]["profile_completed"] == False, "Profile should still be incomplete"
        
        print("✓ RM logged in with new password, must_change_password=false")
    
    def test_06_rm_completes_profile(self, rm_new_token, api_session):
        """RM submits profile with required fields"""
        api_session.headers.update({"Authorization": f"Bearer {rm_new_token}"})
        
        response = api_session.put(f"{BASE_URL}/api/auth/rm-profile", json={
            "phone": TEST_RM_PHONE,
            "address": TEST_RM_ADDRESS,
            "emergency_contact_name": TEST_RM_EMERGENCY_NAME,
            "emergency_contact_phone": TEST_RM_EMERGENCY_PHONE
        })
        
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        
        assert data.get("phone") == TEST_RM_PHONE
        assert data.get("address") == TEST_RM_ADDRESS
        assert data.get("profile_completed") == True
        
        print("✓ RM profile completed with all required fields")
    
    def test_07_rm_uploads_profile_photo(self, rm_new_token, api_session):
        """RM can upload base64 profile photo"""
        api_session.headers.update({"Authorization": f"Bearer {rm_new_token}"})
        
        # Small base64 image (1x1 transparent PNG)
        base64_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = api_session.post(f"{BASE_URL}/api/auth/rm-profile-photo", json={
            "photo": base64_photo
        })
        
        assert response.status_code == 200, f"Photo upload failed: {response.text}"
        data = response.json()
        assert "profile_photo" in data
        print("✓ RM profile photo uploaded")
    
    def test_08_rm_login_blocked_pending_verification(self, api_session):
        """After profile complete, RM login blocked with 403 (pending HR verification)"""
        api_session.headers.pop("Authorization", None)
        
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_RM_EMAIL,
            "password": TEST_RM_NEW_PASSWORD
        })
        
        # Should be 403 - pending HR verification
        assert response.status_code == 403, f"Expected 403 for pending verification, got {response.status_code}"
        detail = response.json().get("detail", "").lower()
        assert "pending" in detail or "verification" in detail
        print("✓ RM login correctly blocked with 403 - pending HR verification")
    
    def test_09_hr_sees_pending_in_dashboard(self, hr_token, api_session):
        """HR dashboard shows pending verification count"""
        api_session.headers.update({"Authorization": f"Bearer {hr_token}"})
        
        response = api_session.get(f"{BASE_URL}/api/hr/dashboard")
        
        assert response.status_code == 200, f"HR dashboard failed: {response.text}"
        data = response.json()
        
        assert "pending_verifications" in data
        assert data["pending_verifications"] >= 1, f"Expected at least 1 pending, got {data['pending_verifications']}"
        
        print(f"✓ HR dashboard shows {data['pending_verifications']} pending verifications")
    
    def test_10_hr_sees_rm_in_pending_list(self, hr_token, api_session):
        """HR can see the new RM in pending list"""
        api_session.headers.update({"Authorization": f"Bearer {hr_token}"})
        
        response = api_session.get(f"{BASE_URL}/api/hr/pending")
        
        assert response.status_code == 200, f"HR pending list failed: {response.text}"
        data = response.json()
        
        assert "pending" in data
        emails = [rm["email"] for rm in data["pending"]]
        assert TEST_RM_EMAIL.lower() in emails, f"Test RM not found in pending list. Found: {emails}"
        
        print(f"✓ HR sees test RM in pending list ({len(data['pending'])} total pending)")
    
    def test_11_hr_sees_staff_list(self, hr_token, api_session):
        """HR can see all RM staff"""
        api_session.headers.update({"Authorization": f"Bearer {hr_token}"})
        
        response = api_session.get(f"{BASE_URL}/api/hr/staff")
        
        assert response.status_code == 200, f"HR staff list failed: {response.text}"
        data = response.json()
        
        assert "staff" in data
        assert data["total"] >= 1
        
        print(f"✓ HR staff list shows {data['total']} RMs")
    
    def test_12_hr_approves_rm(self, hr_token, api_session):
        """HR approves the RM"""
        api_session.headers.update({"Authorization": f"Bearer {hr_token}"})
        
        rm_id = TestRMOnboardingWorkflow.test_rm_id
        assert rm_id, "RM ID not available from earlier test"
        
        response = api_session.patch(f"{BASE_URL}/api/hr/verify/{rm_id}", json={
            "action": "approve"
        })
        
        assert response.status_code == 200, f"HR approve failed: {response.text}"
        data = response.json()
        
        assert data["verification_status"] == "verified"
        print(f"✓ HR approved RM: {rm_id}")
    
    def test_13_rm_can_login_after_approval(self, api_session):
        """After HR approval, RM can login successfully"""
        api_session.headers.pop("Authorization", None)
        
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_RM_EMAIL,
            "password": TEST_RM_NEW_PASSWORD
        })
        
        assert response.status_code == 200, f"RM login after approval failed: {response.text}"
        data = response.json()
        
        assert data["user"]["verification_status"] == "verified"
        assert data["user"]["profile_completed"] == True
        assert data["user"]["must_change_password"] == False
        
        print("✓ RM can login after HR approval (verification_status=verified)")


class TestRMRejectionFlow:
    """Test HR rejection workflow"""
    
    rejection_rm_id = None
    rejection_rm_email = f"test_rm_reject_{int(time.time())}@venuloq.in"
    rejection_rm_password = "temp1234"
    
    def test_01_create_rm_for_rejection(self, admin_token, api_session):
        """Admin creates RM to be rejected"""
        api_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_session.post(f"{BASE_URL}/api/admin/create-rm", json={
            "name": "Test RM Rejection",
            "email": self.rejection_rm_email,
            "password": self.rejection_rm_password
        })
        
        assert response.status_code == 200, f"Failed to create RM for rejection: {response.text}"
        TestRMRejectionFlow.rejection_rm_id = response.json()["user_id"]
        print(f"✓ Created RM for rejection test: {self.rejection_rm_email}")
    
    def test_02_complete_rm_profile_for_rejection(self, api_session):
        """Complete RM profile so they can be reviewed"""
        # Login as RM
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.rejection_rm_email,
            "password": self.rejection_rm_password
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Change password
        api_session.headers.update({"Authorization": f"Bearer {token}"})
        response = api_session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": self.rejection_rm_password,
            "new_password": "newpass456"
        })
        assert response.status_code == 200
        
        # Update profile
        response = api_session.put(f"{BASE_URL}/api/auth/rm-profile", json={
            "phone": "1234567890",
            "address": "456 Reject St",
            "emergency_contact_name": "Contact Person",
            "emergency_contact_phone": "0987654321"
        })
        assert response.status_code == 200
        print("✓ RM profile completed for rejection test")
    
    def test_03_hr_rejects_rm(self, hr_token, api_session):
        """HR rejects the RM with notes"""
        api_session.headers.update({"Authorization": f"Bearer {hr_token}"})
        
        rm_id = TestRMRejectionFlow.rejection_rm_id
        
        response = api_session.patch(f"{BASE_URL}/api/hr/verify/{rm_id}", json={
            "action": "reject",
            "notes": "Documents incomplete - missing ID verification"
        })
        
        assert response.status_code == 200, f"HR reject failed: {response.text}"
        data = response.json()
        
        assert data["verification_status"] == "rejected"
        print(f"✓ HR rejected RM: {rm_id}")
    
    def test_04_rejected_rm_cannot_login(self, api_session):
        """Rejected RM gets 403 on login"""
        api_session.headers.pop("Authorization", None)
        
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.rejection_rm_email,
            "password": "newpass456"
        })
        
        assert response.status_code == 403, f"Expected 403 for rejected RM, got {response.status_code}"
        detail = response.json().get("detail", "").lower()
        assert "rejected" in detail
        print("✓ Rejected RM correctly blocked with 403")


# ===================== FIXTURES =====================

@pytest.fixture(scope="session")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def admin_token(api_session):
    """Get admin authentication token"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.fail(f"Admin login failed: {response.text}")


@pytest.fixture(scope="session")
def hr_token(api_session):
    """Get HR authentication token"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": HR_EMAIL,
        "password": HR_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.fail(f"HR login failed: {response.text}")


@pytest.fixture(scope="class")
def rm_temp_token(api_session):
    """Get token for RM logged in with temp password"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_RM_EMAIL,
        "password": TEST_RM_TEMP_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip(f"RM temp login failed: {response.text}")


@pytest.fixture(scope="class")
def rm_new_token(api_session):
    """Get token for RM logged in with new password"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_RM_EMAIL,
        "password": TEST_RM_NEW_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip(f"RM new password login failed: {response.text}")
