"""
Test Sign In / Sign Up Auth Flow for VenuLoQ
Tests:
- POST /api/auth/register - Sign Up new user
- POST /api/auth/login - Sign In existing user
- POST /api/auth/login - Admin/RM login with short username
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSignUpFlow:
    """Test user registration (Sign Up) flow"""
    
    def test_signup_new_user(self):
        """Test creating a new user with email + password"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_agent_{unique_id}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": f"Test User {unique_id}"
        })
        
        print(f"Sign Up Response Status: {response.status_code}")
        print(f"Sign Up Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == test_email
        assert data["user"]["name"] == f"Test User {unique_id}"
        assert data["user"]["role"] == "customer"
        assert "user_id" in data["user"]
        
        print(f"PASS: Sign Up successful for {test_email}")
    
    def test_signup_duplicate_email(self):
        """Test that duplicate email returns 400"""
        # First create a user
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_dup_{unique_id}@example.com"
        
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Test User"
        })
        assert response1.status_code == 200
        
        # Try to create same user again
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Test User 2"
        })
        
        print(f"Duplicate Email Response Status: {response2.status_code}")
        print(f"Duplicate Email Response: {response2.text}")
        
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        assert "already registered" in response2.json().get("detail", "").lower()
        
        print("PASS: Duplicate email correctly returns 400")


class TestSignInFlow:
    """Test user sign in flow"""
    
    def test_signin_existing_user(self):
        """Test sign in with existing user credentials"""
        # First create a user
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_signin_{unique_id}@example.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Sign In Test User"
        })
        assert reg_response.status_code == 200
        
        # Now sign in
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "test123456"
        })
        
        print(f"Sign In Response Status: {response.status_code}")
        print(f"Sign In Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == test_email
        
        print(f"PASS: Sign In successful for {test_email}")
    
    def test_signin_with_test_user(self):
        """Test sign in with the test user from requirements"""
        # This user should exist: testuser_signup@example.com / test123456
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser_signup@example.com",
            "password": "test123456"
        })
        
        print(f"Test User Sign In Response Status: {response.status_code}")
        print(f"Test User Sign In Response: {response.text[:500]}")
        
        # User might not exist yet - create if needed
        if response.status_code == 401:
            print("Test user doesn't exist - creating...")
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "testuser_signup@example.com",
                "password": "test123456",
                "name": "Test User Signup"
            })
            print(f"Created test user: {reg_response.status_code}")
            
            # Try login again
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "testuser_signup@example.com",
                "password": "test123456"
            })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        
        print("PASS: Test user sign in successful")
    
    def test_signin_invalid_credentials(self):
        """Test sign in with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser_signup@example.com",
            "password": "wrongpassword"
        })
        
        print(f"Invalid Credentials Response Status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        
        print("PASS: Invalid credentials correctly returns 401")


class TestAdminRMLogin:
    """Test admin and RM login with short usernames"""
    
    def test_admin_login_short_username(self):
        """Test admin login with short username 'admin'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "admin"
        })
        
        print(f"Admin Login Response Status: {response.status_code}")
        print(f"Admin Login Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200 for admin login, got {response.status_code}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        
        print("PASS: Admin login with short username successful")
    
    def test_admin_login_full_email(self):
        """Test admin login with full email 'admin@venuloq.in'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin"
        })
        
        print(f"Admin Full Email Login Response Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200 for admin full email login, got {response.status_code}"
        
        data = response.json()
        assert data["user"]["role"] == "admin"
        
        print("PASS: Admin login with full email successful")


class TestAuthMeEndpoint:
    """Test /api/auth/me endpoint"""
    
    def test_get_me_with_token(self):
        """Test getting current user with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "admin"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get /me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Get Me Response Status: {response.status_code}")
        print(f"Get Me Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
        
        print("PASS: Get /me with token successful")
    
    def test_get_me_no_token(self):
        """Test /me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        print(f"Get Me No Token Response Status: {response.status_code}")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without token, got {response.status_code}"
        
        print("PASS: Get /me without token correctly returns 401/403")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
