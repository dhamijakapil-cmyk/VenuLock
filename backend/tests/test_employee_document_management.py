"""
VenuLoQ Employee Onboarding & Document Management Tests
========================================================

Tests for expanded employee creation (all roles), document management (7-item checklist),
and login gates for managed employees.

Coverage:
- Admin create-employee endpoint for all roles (RM, HR, Finance, etc.)
- HR document-types endpoint (7 document types)
- Document upload, verify, delete, re-upload
- HR dashboard stats for ALL employee types
- HR staff endpoint with role filtering
- Login gate blocking non-RM employees pending verification
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid roles for create-employee
EMPLOYEE_ROLES = ['rm', 'hr', 'venue_owner', 'event_planner', 'finance', 'operations', 'marketing']

# Expected document types
EXPECTED_DOC_TYPES = [
    'id_proof', 'offer_letter', 'bank_details', 'address_proof',
    'emergency_contact', 'educational_certs', 'background_verification'
]

# Small base64 PNG for document upload testing
TEST_BASE64_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='


@pytest.fixture(scope='module')
def admin_token():
    """Get admin token for testing."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@venulock.in",
        "password": "admin123"
    })
    if resp.status_code != 200:
        pytest.skip("Admin login failed - skipping tests")
    return resp.json().get('token')


@pytest.fixture(scope='module')
def hr_token():
    """Get HR token for testing."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "hr@venuloq.in",
        "password": "hr123"
    })
    if resp.status_code != 200:
        pytest.skip("HR login failed - skipping tests")
    return resp.json().get('token')


class TestAdminCreateEmployee:
    """Tests for POST /api/admin/create-employee endpoint."""

    def test_create_hr_employee(self, admin_token):
        """Admin can create HR employee."""
        unique_email = f"TEST_hr_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test HR", "email": unique_email, "password": "testpass123", "role": "hr"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get('role') == 'hr'
        assert 'user_id' in data
        assert 'Human Resources' in data.get('message', '') or 'Hr' in data.get('message', '')

    def test_create_finance_employee(self, admin_token):
        """Admin can create Finance employee."""
        unique_email = f"TEST_finance_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Finance", "email": unique_email, "password": "testpass123", "role": "finance"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get('role') == 'finance'

    def test_create_operations_employee(self, admin_token):
        """Admin can create Operations employee."""
        unique_email = f"TEST_operations_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Operations", "email": unique_email, "password": "testpass123", "role": "operations"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        assert resp.json().get('role') == 'operations'

    def test_create_marketing_employee(self, admin_token):
        """Admin can create Marketing employee."""
        unique_email = f"TEST_marketing_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Marketing", "email": unique_email, "password": "testpass123", "role": "marketing"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        assert resp.json().get('role') == 'marketing'

    def test_create_event_planner_employee(self, admin_token):
        """Admin can create Event Planner employee."""
        unique_email = f"TEST_event_planner_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Event Planner", "email": unique_email, "password": "testpass123", "role": "event_planner"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        assert resp.json().get('role') == 'event_planner'

    def test_create_venue_owner_employee(self, admin_token):
        """Admin can create Venue Owner employee."""
        unique_email = f"TEST_venue_owner_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Venue Owner", "email": unique_email, "password": "testpass123", "role": "venue_owner"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        assert resp.json().get('role') == 'venue_owner'

    def test_invalid_role_returns_400(self, admin_token):
        """Creating employee with invalid role returns 400."""
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Invalid", "email": "invalid@test.com", "password": "test123", "role": "superadmin"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 400
        assert 'Invalid role' in resp.json().get('detail', '')

    def test_duplicate_email_returns_400(self, admin_token):
        """Creating employee with duplicate email returns 400."""
        # Try to create with existing admin email
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Dupe", "email": "admin@venulock.in", "password": "test123", "role": "rm"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 400
        assert 'already exists' in resp.json().get('detail', '')


class TestHRDocumentTypes:
    """Tests for GET /api/hr/document-types endpoint."""

    def test_document_types_returns_7_items(self, hr_token):
        """HR document-types endpoint returns 7 document types."""
        resp = requests.get(
            f"{BASE_URL}/api/hr/document-types",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert 'document_types' in data
        assert len(data['document_types']) == 7
        
        # Verify all expected doc types are present
        keys = [dt['key'] for dt in data['document_types']]
        for expected_key in EXPECTED_DOC_TYPES:
            assert expected_key in keys, f"Missing document type: {expected_key}"


class TestHRDashboard:
    """Tests for GET /api/hr/dashboard endpoint."""

    def test_dashboard_returns_stats_for_all_roles(self, hr_token):
        """HR dashboard returns aggregated stats for ALL managed employee types."""
        resp = requests.get(
            f"{BASE_URL}/api/hr/dashboard",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify required stat fields
        assert 'total_staff' in data
        assert 'pending_verifications' in data
        assert 'verified' in data
        assert 'rejected' in data
        assert 'profile_incomplete' in data
        assert 'docs_pending' in data
        assert 'docs_verified' in data


class TestHRStaff:
    """Tests for GET /api/hr/staff endpoint."""

    def test_staff_returns_all_managed_roles(self, hr_token):
        """HR staff endpoint returns employees of all managed roles."""
        resp = requests.get(
            f"{BASE_URL}/api/hr/staff",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert 'staff' in data
        assert 'total' in data

    def test_staff_filter_by_role_hr(self, hr_token):
        """HR staff endpoint can filter by role=hr."""
        resp = requests.get(
            f"{BASE_URL}/api/hr/staff?role=hr",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        # All returned staff should be HR
        for staff in data.get('staff', []):
            assert staff.get('role') == 'hr', f"Expected role 'hr', got {staff.get('role')}"

    def test_staff_filter_by_role_rm(self, hr_token):
        """HR staff endpoint can filter by role=rm."""
        resp = requests.get(
            f"{BASE_URL}/api/hr/staff?role=rm",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        for staff in data.get('staff', []):
            assert staff.get('role') == 'rm'

    def test_staff_includes_doc_counts(self, hr_token):
        """HR staff endpoint includes document counts per employee."""
        resp = requests.get(
            f"{BASE_URL}/api/hr/staff",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        if data.get('staff'):
            sample = data['staff'][0]
            # Verify doc count fields are present
            assert 'docs_uploaded' in sample or 'docs_verified' in sample or 'docs_total_required' in sample


class TestDocumentManagement:
    """Tests for document upload, verification, and deletion."""

    @pytest.fixture(scope='class')
    def test_employee(self, admin_token):
        """Create a test employee for document management testing."""
        unique_email = f"TEST_docmgmt_{int(time.time())}@venuloq.in"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Doc Mgmt", "email": unique_email, "password": "testpass123", "role": "rm"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            pytest.skip("Could not create test employee")
        return resp.json()

    def test_upload_document(self, hr_token, test_employee):
        """HR can upload a document for an employee."""
        user_id = test_employee.get('user_id')
        resp = requests.post(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            json={
                "doc_type": "id_proof",
                "file_name": "test_id_proof.png",
                "file_data": TEST_BASE64_PNG
            },
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert 'doc_id' in data
        assert data.get('doc_type') == 'id_proof'

    def test_get_employee_documents_returns_checklist(self, hr_token, test_employee):
        """GET employee documents returns 7-item checklist."""
        user_id = test_employee.get('user_id')
        resp = requests.get(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert 'checklist' in data
        assert len(data['checklist']) == 7
        assert data.get('total_required') == 7

    def test_verify_document(self, hr_token, test_employee):
        """HR can mark a document as verified."""
        user_id = test_employee.get('user_id')
        
        # First get the doc_id
        resp = requests.get(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        checklist = resp.json().get('checklist', [])
        
        # Find the uploaded document
        id_proof = next((c for c in checklist if c.get('doc_type') == 'id_proof' and c.get('uploaded')), None)
        if not id_proof or not id_proof.get('document'):
            pytest.skip("No id_proof document uploaded")
        
        doc_id = id_proof['document']['doc_id']
        
        # Verify the document
        resp = requests.patch(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents/{doc_id}",
            json={"status": "verified"},
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        assert 'verified' in resp.json().get('message', '').lower()

    def test_reupload_replaces_document(self, hr_token, test_employee):
        """Re-uploading same doc_type replaces existing document."""
        user_id = test_employee.get('user_id')
        
        # Upload again with different filename
        resp = requests.post(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            json={
                "doc_type": "id_proof",
                "file_name": "replaced_id_proof.png",
                "file_data": TEST_BASE64_PNG
            },
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        
        # Verify there's still only one id_proof (not two)
        resp = requests.get(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        checklist = resp.json().get('checklist', [])
        id_proofs = [c for c in checklist if c.get('doc_type') == 'id_proof' and c.get('uploaded')]
        assert len(id_proofs) == 1
        # Verify status reset to pending after re-upload
        assert id_proofs[0].get('status') == 'pending'

    def test_delete_document(self, hr_token, test_employee):
        """HR can delete a document."""
        user_id = test_employee.get('user_id')
        
        # Upload a document to delete
        resp = requests.post(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            json={
                "doc_type": "offer_letter",
                "file_name": "test_offer_letter.pdf",
                "file_data": TEST_BASE64_PNG
            },
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        doc_id = resp.json().get('doc_id')
        
        # Delete the document
        resp = requests.delete(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents/{doc_id}",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        assert resp.status_code == 200
        
        # Verify it's gone
        resp = requests.get(
            f"{BASE_URL}/api/hr/employee/{user_id}/documents",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        checklist = resp.json().get('checklist', [])
        offer_letter = next((c for c in checklist if c.get('doc_type') == 'offer_letter'), None)
        assert offer_letter is not None
        assert offer_letter.get('uploaded') == False


class TestLoginGateForManagedRoles:
    """Tests for login blocking of managed employees pending verification."""

    @pytest.fixture(scope='class')
    def profile_complete_employee(self, admin_token):
        """Create employee, complete profile, and return credentials."""
        unique_email = f"TEST_logingate_{int(time.time())}@venuloq.in"
        password = "testpass123"
        
        # Create employee
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Test Login Gate", "email": unique_email, "password": password, "role": "hr"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            pytest.skip("Could not create test employee")
        user_id = resp.json().get('user_id')
        
        # Login to get token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": unique_email, "password": password})
        if resp.status_code != 200:
            pytest.skip("Could not login as new employee")
        token = resp.json().get('token')
        
        # Change password (required first step)
        new_password = "newpass123"
        resp = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": password, "new_password": new_password},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Re-login with new password
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": unique_email, "password": new_password})
        token = resp.json().get('token')
        
        # Complete profile
        resp = requests.put(
            f"{BASE_URL}/api/auth/rm-profile",
            json={
                "phone": "9876543210",
                "address": "Test Address",
                "emergency_contact_name": "Emergency Contact",
                "emergency_contact_phone": "1234567890"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        return {
            "email": unique_email,
            "password": new_password,
            "user_id": user_id
        }

    def test_non_rm_blocked_after_profile_complete(self, profile_complete_employee):
        """HR employee login blocked after profile complete, pending verification."""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": profile_complete_employee["email"],
                "password": profile_complete_employee["password"]
            }
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        detail = resp.json().get('detail', '')
        assert 'pending' in detail.lower() or 'verification' in detail.lower()


# Cleanup marker for test data
@pytest.fixture(scope='session', autouse=True)
def cleanup_note():
    """Note: Test data created with TEST_ prefix should be cleaned up periodically."""
    yield
    print("\n[Cleanup Note] Test employees created with TEST_ prefix emails")
