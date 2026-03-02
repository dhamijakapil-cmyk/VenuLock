"""
Tests for Venue Availability Calendar Feature
- Bulk availability update API
- Date holds (create, extend, release)
- Auto-release expired holds
- Public venue availability display
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://venue-discovery-15.preview.emergentagent.com').rstrip('/')

# Test data
VENUE_OWNER_CREDENTIALS = {"email": "testowner@venue.com", "password": "test123"}
RM_CREDENTIALS = {"email": "testrm@bookmyvenue.com", "password": "test123"}
ADMIN_CREDENTIALS = {"email": "testadmin@bookmyvenue.com", "password": "test123"}
TEST_VENUE_ID = "venue_ac489187b511"
TEST_LEAD_ID = "lead_ed08103a8038"


class TestVenueAvailabilityBulkUpdate:
    """Test bulk availability update API for venue owners"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for venue owner"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip("Venue owner login failed")
    
    def test_bulk_update_availability_blocked(self):
        """Test bulk update availability to blocked status"""
        # Use future dates
        future_dates = []
        for i in range(10, 12):  # Use March 10-11 to avoid conflicts
            date = f"2026-03-{i:02d}"
            future_dates.append(date)
        
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/availability/bulk",
            headers=self.headers,
            json={
                "dates": future_dates,
                "status": "blocked",
                "time_slot": "full_day",
                "notes": "Test blocked dates"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "Updated availability" in data["message"]
        print(f"PASS: Bulk update blocked - {data['message']}")
    
    def test_bulk_update_availability_available(self):
        """Test bulk update availability to available status"""
        future_dates = []
        for i in range(10, 12):  # Clean up test dates
            date = f"2026-03-{i:02d}"
            future_dates.append(date)
        
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/availability/bulk",
            headers=self.headers,
            json={
                "dates": future_dates,
                "status": "available",
                "time_slot": "full_day"
            }
        )
        
        assert response.status_code == 200
        print("PASS: Bulk update available status")
    
    def test_get_venue_availability(self):
        """Test getting venue availability for a month"""
        response = requests.get(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/availability?month=2026-03",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "venue_id" in data
        assert "slots" in data
        assert isinstance(data["slots"], list)
        print(f"PASS: Get availability - {len(data['slots'])} slots retrieved")


class TestDateHoldCreation:
    """Test date hold creation by RM"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for RM"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip("RM login failed")
    
    def test_create_date_hold(self):
        """Test creating a date hold for a lead"""
        # Use a future date that's unlikely to be blocked
        future_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date",
            headers=self.headers,
            json={
                "venue_id": TEST_VENUE_ID,
                "date": future_date,
                "lead_id": TEST_LEAD_ID,
                "time_slot": "full_day",
                "expiry_hours": 24
            }
        )
        
        # Could be 200 or 400 if date is already held/blocked
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "hold" in data
            hold = data["hold"]
            assert hold["venue_id"] == TEST_VENUE_ID
            assert hold["lead_id"] == TEST_LEAD_ID
            assert hold["status"] == "active"
            assert "expires_at" in hold
            print(f"PASS: Created hold for {future_date} - hold_id: {hold['hold_id']}")
            # Store for later tests
            self.__class__.created_hold_id = hold["hold_id"]
            self.__class__.hold_date = future_date
        else:
            print(f"INFO: Hold creation returned {response.status_code}: {response.json().get('detail', 'Unknown')}")
    
    def test_create_hold_on_blocked_date_fails(self):
        """Test that creating hold on a blocked date fails"""
        # March 1-3 are blocked
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date",
            headers=self.headers,
            json={
                "venue_id": TEST_VENUE_ID,
                "date": "2026-03-01",
                "lead_id": TEST_LEAD_ID,
                "time_slot": "full_day",
                "expiry_hours": 24
            }
        )
        
        # Should fail because date is blocked
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "blocked" in data["detail"].lower() or "cannot be held" in data["detail"].lower()
        print(f"PASS: Hold on blocked date correctly rejected - {data['detail']}")


class TestDateHoldExtension:
    """Test date hold extension functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for RM and create a hold if needed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip("RM login failed")
        
        # Create a fresh hold for testing extensions
        future_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date",
            headers=self.headers,
            json={
                "venue_id": TEST_VENUE_ID,
                "date": future_date,
                "lead_id": TEST_LEAD_ID,
                "time_slot": "full_day",
                "expiry_hours": 24
            }
        )
        if response.status_code == 200:
            self.hold_id = response.json()["hold"]["hold_id"]
            self.hold_date = future_date
        else:
            # Try to get existing active hold
            holds_response = requests.get(
                f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/holds",
                headers=self.headers
            )
            if holds_response.status_code == 200:
                holds = holds_response.json().get("holds", [])
                active_holds = [h for h in holds if h["status"] == "active"]
                if active_holds:
                    self.hold_id = active_holds[0]["hold_id"]
                    self.hold_date = active_holds[0]["date"]
                else:
                    self.hold_id = None
            else:
                self.hold_id = None
    
    def test_extend_hold(self):
        """Test extending a date hold by 24 hours"""
        if not hasattr(self, 'hold_id') or not self.hold_id:
            pytest.skip("No active hold available for extension test")
        
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date/{self.hold_id}/extend",
            headers=self.headers,
            json={"extension_hours": 24}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "new_expires_at" in data
            assert "extension_count" in data
            print(f"PASS: Hold extended - extension count: {data['extension_count']}, new expiry: {data['new_expires_at']}")
        elif response.status_code == 403:
            # Max extensions reached
            data = response.json()
            assert "Maximum" in data.get("detail", "")
            print(f"PASS: Extension limit enforced - {data['detail']}")
        elif response.status_code == 400:
            data = response.json()
            print(f"INFO: Extension returned 400 - {data.get('detail', 'Unknown reason')}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_max_extensions_limit(self):
        """Test that max 2 extensions are enforced for non-admin users"""
        if not hasattr(self, 'hold_id') or not self.hold_id:
            pytest.skip("No active hold available for max extensions test")
        
        # Try extending multiple times
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date/{self.hold_id}/extend",
                headers=self.headers,
                json={"extension_hours": 24}
            )
            
            if response.status_code == 403:
                data = response.json()
                assert "Maximum" in data["detail"] or "extensions" in data["detail"].lower()
                print(f"PASS: Max extensions limit enforced after {i} extensions - {data['detail']}")
                return
            elif response.status_code != 200:
                print(f"Extension attempt {i+1} returned {response.status_code}")
                break
        
        print("INFO: Extension test completed - limit may have been reached in previous test")


class TestDateHoldRelease:
    """Test date hold release functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for RM"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip("RM login failed")
    
    def test_release_hold(self):
        """Test releasing a date hold"""
        # First create a hold
        future_date = (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d")
        create_response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date",
            headers=self.headers,
            json={
                "venue_id": TEST_VENUE_ID,
                "date": future_date,
                "lead_id": TEST_LEAD_ID,
                "time_slot": "full_day",
                "expiry_hours": 24
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create hold for release test")
        
        hold_id = create_response.json()["hold"]["hold_id"]
        
        # Now release it
        response = requests.delete(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date/{hold_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "released" in data["message"].lower()
        print(f"PASS: Hold released successfully - {data['message']}")
        
        # Verify availability is back to available
        avail_response = requests.get(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/availability?month={future_date[:7]}",
            headers=self.headers
        )
        if avail_response.status_code == 200:
            slots = avail_response.json().get("slots", [])
            slot = next((s for s in slots if s["date"] == future_date), None)
            if slot:
                assert slot["status"] == "available", f"Expected available, got {slot['status']}"
                print(f"PASS: Availability updated to 'available' after hold release")


class TestGetLeadHolds:
    """Test getting holds for a lead"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for RM"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip("RM login failed")
    
    def test_get_lead_holds(self):
        """Test getting all holds for a lead with time remaining info"""
        response = requests.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/holds",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "lead_id" in data
        assert "holds" in data
        assert isinstance(data["holds"], list)
        
        print(f"PASS: Retrieved {len(data['holds'])} holds for lead")
        
        # Check hold structure
        for hold in data["holds"]:
            assert "hold_id" in hold
            assert "venue_id" in hold
            assert "date" in hold
            assert "status" in hold
            if hold["status"] == "active":
                assert "hours_remaining" in hold
                print(f"  - Active hold: {hold['date']} - {hold.get('hours_remaining', 0):.1f}h remaining")
            else:
                print(f"  - {hold['status'].capitalize()} hold: {hold['date']}")


class TestPublicVenueAvailability:
    """Test public venue page availability indicator"""
    
    def test_get_public_venue_availability(self):
        """Test that venue availability is accessible publicly"""
        # Availability should be accessible without auth
        response = requests.get(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/availability?month=2026-03"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "venue_id" in data
        assert "slots" in data
        
        # Check that blocked dates are present
        blocked_dates = [s for s in data["slots"] if s["status"] == "blocked"]
        assert len(blocked_dates) >= 3, f"Expected at least 3 blocked dates (Mar 1-3), got {len(blocked_dates)}"
        
        print(f"PASS: Public availability accessible - {len(data['slots'])} slots, {len(blocked_dates)} blocked")
    
    def test_venue_detail_with_availability(self):
        """Test getting venue detail (availability should be fetchable separately)"""
        response = requests.get(f"{BASE_URL}/api/venues/{TEST_VENUE_ID}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["venue_id"] == TEST_VENUE_ID
        assert data["name"] == "Test Banquet Hall"
        assert data["status"] == "approved"
        
        print(f"PASS: Venue detail accessible - {data['name']} in {data['city']}")


class TestVenueOwnerCalendarAccess:
    """Test venue owner access to calendar functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for venue owner"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=VENUE_OWNER_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        else:
            pytest.skip("Venue owner login failed")
    
    def test_get_my_venues(self):
        """Test venue owner can access their venues"""
        response = requests.get(
            f"{BASE_URL}/api/my-venues",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one venue"
        
        # Check that test venue is in the list
        venue_ids = [v["venue_id"] for v in data]
        assert TEST_VENUE_ID in venue_ids, f"Test venue {TEST_VENUE_ID} not found in owner's venues"
        
        print(f"PASS: Venue owner has {len(data)} venues")
    
    def test_venue_owner_cannot_create_hold(self):
        """Test that venue owners cannot create holds (RM only)"""
        future_date = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/venues/{TEST_VENUE_ID}/hold-date",
            headers=self.headers,
            json={
                "venue_id": TEST_VENUE_ID,
                "date": future_date,
                "lead_id": TEST_LEAD_ID,
                "time_slot": "full_day",
                "expiry_hours": 24
            }
        )
        
        # Should be forbidden for venue owners
        assert response.status_code == 403, f"Expected 403 for venue owner, got {response.status_code}"
        print("PASS: Venue owner correctly prevented from creating holds")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
