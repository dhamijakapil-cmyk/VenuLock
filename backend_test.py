import requests
import sys
import json
from datetime import datetime

class BookMyVenueAPITester:
    def __init__(self, base_url="https://executive-venue.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.rm_token = None
        self.venue_owner_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, str(e)

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_seed_data(self):
        """Test data seeding"""
        success, response = self.run_test("Seed Data", "POST", "api/seed-data", 200)
        return success, response

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "api/auth/login",
            200,
            data={"email": "admin@bookmyvenue.in", "password": "admin123"}
        )
        if success and isinstance(response, dict) and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_rm_login(self):
        """Test RM login and get token"""
        success, response = self.run_test(
            "RM Login",
            "POST",
            "api/auth/login", 
            200,
            data={"email": "rm1@bookmyvenue.in", "password": "rm123"}
        )
        if success and isinstance(response, dict) and 'token' in response:
            self.rm_token = response['token']
            return True
        return False

    def test_venue_owner_login(self):
        """Test venue owner login and get token"""
        success, response = self.run_test(
            "Venue Owner Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "venue@bookmyvenue.in", "password": "venue123"}
        )
        if success and isinstance(response, dict) and 'token' in response:
            self.venue_owner_token = response['token']
            return True
        return False

    def test_public_endpoints(self):
        """Test public endpoints that don't require auth"""
        results = []
        
        # Test cities
        success, _ = self.run_test("Get Cities", "GET", "api/cities", 200)
        results.append(success)
        
        # Test venues search
        success, _ = self.run_test("Search Venues", "GET", "api/venues?limit=5", 200)
        results.append(success)
        
        # Test venue detail (get first venue)
        success, venues_data = self.run_test("Get Venues for Detail Test", "GET", "api/venues?limit=1", 200)
        if success and isinstance(venues_data, list) and len(venues_data) > 0:
            venue_id = venues_data[0].get('venue_id')
            if venue_id:
                success, _ = self.run_test("Get Venue Detail", "GET", f"api/venues/{venue_id}", 200)
                results.append(success)
        
        return all(results)

    def test_lead_creation(self):
        """Test enquiry/lead creation"""
        lead_data = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com", 
            "customer_phone": "9876543210",
            "event_type": "wedding",
            "event_date": "2025-12-25",
            "guest_count": 300,
            "budget": 500000,
            "preferences": "Looking for outdoor venue",
            "venue_ids": [],
            "city": "Delhi",
            "area": "Connaught Place"
        }
        return self.run_test("Create Lead/Enquiry", "POST", "api/leads", 200, data=lead_data)

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        if not self.admin_token:
            print("❌ No admin token available for testing")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        results = []
        
        # Test admin stats
        success, _ = self.run_test("Admin Stats", "GET", "api/admin/stats", 200, headers=headers)
        results.append(success)
        
        # Test pending approvals
        success, _ = self.run_test("Pending Approvals", "GET", "api/admin/pending-approvals", 200, headers=headers)
        results.append(success)
        
        # Test admin users
        success, _ = self.run_test("Admin Users", "GET", "api/admin/users", 200, headers=headers)
        results.append(success)
        
        return all(results)

    def test_rm_endpoints(self):
        """Test RM-specific endpoints"""
        if not self.rm_token:
            print("❌ No RM token available for testing") 
            return False
            
        headers = {'Authorization': f'Bearer {self.rm_token}'}
        results = []
        
        # Test RM leads
        success, _ = self.run_test("RM Leads", "GET", "api/leads", 200, headers=headers)
        results.append(success)
        
        return all(results)

    def test_venue_owner_endpoints(self):
        """Test venue owner endpoints"""
        if not self.venue_owner_token:
            print("❌ No venue owner token available for testing")
            return False
            
        headers = {'Authorization': f'Bearer {self.venue_owner_token}'}
        results = []
        
        # Test my venues
        success, _ = self.run_test("My Venues", "GET", "api/my-venues", 200, headers=headers)
        results.append(success)
        
        return all(results)

    def test_venue_search_filters(self):
        """Test venue search with various filters"""
        results = []
        
        # Test city filter
        success, _ = self.run_test("Search by City", "GET", "api/venues?city=Delhi", 200)
        results.append(success)
        
        # Test event type filter  
        success, _ = self.run_test("Search by Event Type", "GET", "api/venues?event_type=wedding", 200)
        results.append(success)
        
        # Test guest count filter
        success, _ = self.run_test("Search by Guest Count", "GET", "api/venues?guest_min=100&guest_max=500", 200)
        results.append(success)
        
        # Test sorting
        success, _ = self.run_test("Search with Sorting", "GET", "api/venues?sort_by=price_low", 200)
        results.append(success)
        
        return all(results)

def main():
    print("🚀 Starting BookMyVenue API Tests...")
    tester = BookMyVenueAPITester()
    
    # Test basic connectivity
    if not tester.test_health_check()[0]:
        print("❌ Health check failed - API may not be accessible")
        return 1
    
    # Seed data first
    print("\n📊 Seeding test data...")
    tester.test_seed_data()
    
    # Test authentication
    print("\n🔐 Testing Authentication...")
    admin_login_success = tester.test_admin_login()
    rm_login_success = tester.test_rm_login() 
    venue_owner_login_success = tester.test_venue_owner_login()
    
    # Test public endpoints
    print("\n🌐 Testing Public Endpoints...")
    public_success = tester.test_public_endpoints()
    
    # Test lead creation (public endpoint)
    print("\n📝 Testing Lead Creation...")
    lead_success = tester.test_lead_creation()[0]
    
    # Test venue search filters
    print("\n🔍 Testing Search Filters...")
    search_success = tester.test_venue_search_filters()
    
    # Test role-based endpoints
    print("\n👑 Testing Admin Endpoints...")
    admin_success = tester.test_admin_endpoints()
    
    print("\n👨‍💼 Testing RM Endpoints...")
    rm_success = tester.test_rm_endpoints()
    
    print("\n🏢 Testing Venue Owner Endpoints...")
    venue_owner_success = tester.test_venue_owner_endpoints()
    
    # Print final results
    print(f"\n📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"   - {test['name']}: {error_msg}") 
    
    # Determine overall success
    critical_tests = [admin_login_success, rm_login_success, venue_owner_login_success, public_success]
    if all(critical_tests):
        print("\n✅ All critical tests passed!")
        return 0
    else:
        print("\n❌ Some critical tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())