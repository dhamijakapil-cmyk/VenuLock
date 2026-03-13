"""
Tests for simplified registration flow (email + password only, no name required).
Backend should auto-derive name from email prefix when not provided.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSimplifiedRegister:
    """Test simplified register endpoint - email+password only"""

    def test_register_email_password_only(self):
        """Register with just email and password - name auto-derived from email prefix"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"testuser_{unique_id}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "password123",
            "role": "customer"
        })
        
        print(f"Register response status: {response.status_code}")
        print(f"Register response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user object"
        
        user = data["user"]
        assert user["email"] == test_email, "Email should match"
        assert user["role"] == "customer", "Role should be customer"
        
        # Name should be auto-derived from email prefix
        expected_name_prefix = f"testuser_{unique_id}".title()
        assert user["name"] is not None, "Name should be auto-derived"
        print(f"Auto-derived name: {user['name']}, expected prefix: Testuser_{unique_id}")

    def test_register_without_name_field(self):
        """Register without including name field at all"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"noname_{unique_id}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "securepass456"
        })
        
        print(f"Register without name status: {response.status_code}")
        print(f"Register without name body: {response.json()}")
        
        assert response.status_code == 200, f"Should succeed without name: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # Name should default to email prefix
        assert user["name"] is not None, "Name should be auto-derived from email prefix"
        assert "noname" in user["name"].lower(), f"Name should contain email prefix, got: {user['name']}"

    def test_register_with_explicit_name(self):
        """Register with explicit name provided (should still work)"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"named_{unique_id}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "password789",
            "name": "Explicitly Named User"
        })
        
        print(f"Register with name status: {response.status_code}")
        print(f"Register with name body: {response.json()}")
        
        assert response.status_code == 200, f"Should succeed with explicit name: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # When name is provided explicitly, it should be used
        assert user["name"] == "Explicitly Named User", f"Name should match provided value, got: {user['name']}"

    def test_register_duplicate_email_error(self):
        """Attempt to register with already registered email should fail"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"duplicate_{unique_id}@test.com"
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "password123"
        })
        assert response1.status_code == 200, "First registration should succeed"
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "differentpass"
        })
        
        print(f"Duplicate register status: {response2.status_code}")
        
        assert response2.status_code == 400, f"Should fail with 400 for duplicate email: {response2.text}"
        assert "already registered" in response2.json().get("detail", "").lower()


class TestLoginFlow:
    """Test login endpoints"""

    def test_login_admin_user(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        
        print(f"Admin login status: {response.status_code}")
        print(f"Admin login body: {response.json()}")
        
        assert response.status_code == 200, f"Admin login should succeed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Should return token"
        assert data["user"]["email"] == "admin@venuloq.in"
        assert data["user"]["role"] == "admin"

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        
        print(f"Invalid login status: {response.status_code}")
        
        assert response.status_code == 401, f"Should return 401 for invalid credentials"


class TestRegisteredUserLogin:
    """Test that newly registered users can login"""

    def test_register_then_login(self):
        """Register a user then login with same credentials"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"logintest_{unique_id}@test.com"
        test_password = "mypassword123"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password
        })
        assert reg_response.status_code == 200, "Registration should succeed"
        
        # Login with same credentials
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        print(f"Login after register status: {login_response.status_code}")
        
        assert login_response.status_code == 200, f"Login should succeed: {login_response.text}"
        
        data = login_response.json()
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "customer"
