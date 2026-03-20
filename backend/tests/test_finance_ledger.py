"""
Finance Ledger API Tests
Tests for /api/payments/ledger and /api/payments/ledger/export endpoints

Features:
- Paginated ledger with total, page, pages fields
- Status filtering (payment_released, created, etc.)
- Search by customer name, email, payment_id, lead_id
- Export all payments for CSV
- Role-based access (admin, finance only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFinanceLedgerAuth:
    """Test authentication and authorization for ledger endpoints"""

    def get_admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    def test_ledger_requires_auth(self):
        """Test that ledger endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/ledger")
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}"
        print("✓ Ledger endpoint requires authentication")

    def test_ledger_export_requires_auth(self):
        """Test that ledger export endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/ledger/export")
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}"
        print("✓ Ledger export endpoint requires authentication")

    def test_ledger_admin_access(self):
        """Test admin can access ledger"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/payments/ledger", headers=headers)
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        print("✓ Admin can access ledger endpoint")

    def test_ledger_export_admin_access(self):
        """Test admin can access ledger export"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/payments/ledger/export", headers=headers)
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        print("✓ Admin can access ledger export endpoint")


class TestFinanceLedgerPagination:
    """Test ledger pagination and data structure"""

    def get_admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    def test_ledger_response_structure(self):
        """Test ledger returns correct fields: payments, total, page, pages"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/payments/ledger", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "payments" in data, "Response missing 'payments' field"
        assert "total" in data, "Response missing 'total' field"
        assert "page" in data, "Response missing 'page' field"
        assert "pages" in data, "Response missing 'pages' field"
        assert "limit" in data, "Response missing 'limit' field"
        
        assert isinstance(data["payments"], list), "payments should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["page"], int), "page should be an integer"
        assert isinstance(data["pages"], int), "pages should be an integer"
        
        print(f"✓ Ledger response structure valid - {data['total']} total payments, page {data['page']} of {data['pages']}")

    def test_ledger_pagination_default(self):
        """Test default pagination (page 1, limit 25)"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/payments/ledger", headers=headers)
        data = response.json()
        
        assert data["page"] == 1, f"Default page should be 1, got {data['page']}"
        assert data["limit"] == 25, f"Default limit should be 25, got {data['limit']}"
        assert len(data["payments"]) <= data["limit"], "Payments count exceeds limit"
        
        print(f"✓ Default pagination works: page={data['page']}, limit={data['limit']}, returned {len(data['payments'])} payments")

    def test_ledger_pagination_custom(self):
        """Test custom pagination parameters"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/payments/ledger?page=1&limit=5", headers=headers)
        data = response.json()
        
        assert data["page"] == 1, f"Page should be 1, got {data['page']}"
        assert data["limit"] == 5, f"Limit should be 5, got {data['limit']}"
        assert len(data["payments"]) <= 5, "Payments count exceeds custom limit"
        
        print(f"✓ Custom pagination works: limit=5, returned {len(data['payments'])} payments")


class TestFinanceLedgerFilters:
    """Test ledger filtering by status and search"""

    def get_admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    def test_ledger_filter_by_status_payment_released(self):
        """Test filtering by status=payment_released"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/payments/ledger?status=payment_released", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        payments = data.get("payments", [])
        
        # Verify all returned payments have the correct status
        for payment in payments:
            assert payment.get("status") == "payment_released", f"Expected status 'payment_released' but got '{payment.get('status')}'"
        
        print(f"✓ Status filter 'payment_released' works - returned {len(payments)} payments")

    def test_ledger_filter_by_status_created(self):
        """Test filtering by status=created"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/payments/ledger?status=created", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        payments = data.get("payments", [])
        
        # Verify all returned payments have the correct status
        for payment in payments:
            assert payment.get("status") == "created", f"Expected status 'created' but got '{payment.get('status')}'"
        
        print(f"✓ Status filter 'created' works - returned {len(payments)} payments")

    def test_ledger_filter_all_status(self):
        """Test that status=all returns all payments"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all payments
        response_all = requests.get(f"{BASE_URL}/api/payments/ledger?status=all", headers=headers)
        data_all = response_all.json()
        
        # Get without filter
        response_none = requests.get(f"{BASE_URL}/api/payments/ledger", headers=headers)
        data_none = response_none.json()
        
        assert data_all["total"] == data_none["total"], "status=all should return same as no filter"
        print(f"✓ Status filter 'all' returns all payments: {data_all['total']} total")

    def test_ledger_search_by_name(self):
        """Test search by customer name"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get all payments to find a customer name to search
        response = requests.get(f"{BASE_URL}/api/payments/ledger", headers=headers)
        data = response.json()
        
        if data["payments"]:
            # Get first customer name to search
            first_payment = data["payments"][0]
            search_term = first_payment.get("customer_name", "Demo")
            if search_term:
                # Search using that name
                search_response = requests.get(
                    f"{BASE_URL}/api/payments/ledger?search={search_term[:4]}", 
                    headers=headers
                )
                search_data = search_response.json()
                assert search_response.status_code == 200
                print(f"✓ Search by name works - searched '{search_term[:4]}', found {search_data['total']} payments")
            else:
                print("⚠ No customer names in payments to test search")
        else:
            print("⚠ No payments found to test search")


class TestFinanceLedgerExport:
    """Test ledger export endpoint"""

    def get_admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venulock.in",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    def test_ledger_export_returns_all(self):
        """Test export returns all payments for CSV"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get paginated count
        ledger_response = requests.get(f"{BASE_URL}/api/payments/ledger", headers=headers)
        ledger_data = ledger_response.json()
        total_count = ledger_data.get("total", 0)
        
        # Get export (should return all)
        export_response = requests.get(f"{BASE_URL}/api/payments/ledger/export", headers=headers)
        assert export_response.status_code == 200
        
        export_data = export_response.json()
        assert isinstance(export_data, list), "Export should return a list"
        assert len(export_data) == total_count, f"Export should return all {total_count} payments, got {len(export_data)}"
        
        print(f"✓ Export endpoint returns all {len(export_data)} payments")

    def test_ledger_export_with_status_filter(self):
        """Test export with status filter"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/payments/ledger/export?status=payment_released", headers=headers)
        assert response.status_code == 200
        
        export_data = response.json()
        assert isinstance(export_data, list), "Export should return a list"
        
        # Verify all have correct status
        for payment in export_data:
            assert payment.get("status") == "payment_released"
        
        print(f"✓ Export with status filter works - {len(export_data)} payments with status 'payment_released'")

    def test_ledger_export_payment_fields(self):
        """Test export contains required fields for CSV"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/payments/ledger/export", headers=headers)
        export_data = response.json()
        
        if export_data:
            payment = export_data[0]
            
            # Check for expected fields (at minimum)
            expected_fields = ["payment_id", "amount", "status", "created_at", "lead_id"]
            for field in expected_fields:
                assert field in payment, f"Missing expected field: {field}"
            
            print(f"✓ Export contains required fields for CSV generation")
        else:
            print("⚠ No payments to verify export fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
