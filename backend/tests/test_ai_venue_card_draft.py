"""
AI Venue Card Draft Feature Tests
Tests for POST /api/acquisitions/{acq_id}/ai-draft endpoint
- Role-based access (admin/data_team allowed, customer forbidden)
- AI draft response structure validation
- Draft caching on document
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "admin@venulock.in"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "democustomer@venulock.in"
CUSTOMER_PASSWORD = "password123"

# Test acquisition IDs from review request
FULL_DATA_ACQ_ID = "acq_c02044f87f88"  # Full data, status: under_data_refinement
SPARSE_DATA_ACQ_ID = "acq_6532e309d32a"  # Sparse data, status: under_data_refinement


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


class TestAIDraftEndpointAccess:
    """Test role-based access control for AI draft endpoint"""
    
    def test_admin_can_generate_ai_draft(self, admin_token):
        """Admin role should be able to generate AI draft"""
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should succeed (200) or already have draft
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "draft" in data, "Response should contain 'draft' field"
        assert "generated_at" in data, "Response should contain 'generated_at' field"
        print(f"PASS: Admin can generate AI draft - status {response.status_code}")
    
    def test_customer_cannot_generate_ai_draft(self, customer_token):
        """Customer role should be forbidden from generating AI draft"""
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403 Forbidden for customer, got {response.status_code}: {response.text}"
        print(f"PASS: Customer correctly forbidden from AI draft - status {response.status_code}")
    
    def test_unauthenticated_cannot_generate_ai_draft(self):
        """Unauthenticated request should be rejected"""
        response = requests.post(f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft")
        assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
        print(f"PASS: Unauthenticated request rejected - status {response.status_code}")


class TestAIDraftResponseStructure:
    """Test AI draft response contains all required fields"""
    
    REQUIRED_DRAFT_FIELDS = [
        "premium_title",
        "tagline", 
        "highlights",
        "description",
        "suggested_tags",
        "capacity_summary",
        "pricing_summary",
        "suitability",
        "amenities_summary",
        "missing_inputs",
        "contradictions",
        "readiness",
        "readiness_note"
    ]
    
    def test_full_data_acquisition_draft_structure(self, admin_token):
        """AI draft for full data acquisition should have all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to generate draft: {response.status_code} - {response.text}"
        
        data = response.json()
        draft = data.get("draft", {})
        
        missing_fields = []
        for field in self.REQUIRED_DRAFT_FIELDS:
            if field not in draft:
                missing_fields.append(field)
        
        assert len(missing_fields) == 0, f"Missing required fields in AI draft: {missing_fields}"
        print(f"PASS: All {len(self.REQUIRED_DRAFT_FIELDS)} required fields present in AI draft")
        
        # Validate field types
        assert isinstance(draft.get("premium_title"), str), "premium_title should be string"
        assert isinstance(draft.get("tagline"), str), "tagline should be string"
        assert isinstance(draft.get("highlights"), list), "highlights should be list"
        assert isinstance(draft.get("description"), str), "description should be string"
        assert isinstance(draft.get("suggested_tags"), list), "suggested_tags should be list"
        assert isinstance(draft.get("capacity_summary"), str), "capacity_summary should be string"
        assert isinstance(draft.get("pricing_summary"), str), "pricing_summary should be string"
        assert isinstance(draft.get("suitability"), list), "suitability should be list"
        assert isinstance(draft.get("amenities_summary"), str), "amenities_summary should be string"
        assert isinstance(draft.get("missing_inputs"), list), "missing_inputs should be list"
        assert isinstance(draft.get("contradictions"), list), "contradictions should be list"
        assert draft.get("readiness") in ["publish_ready", "needs_minor_edits", "needs_major_inputs"], \
            f"Invalid readiness value: {draft.get('readiness')}"
        assert isinstance(draft.get("readiness_note"), str), "readiness_note should be string"
        
        print("PASS: All field types validated correctly")
    
    def test_sparse_data_acquisition_shows_missing_inputs(self, admin_token):
        """Sparse acquisition should flag missing inputs and have needs_major_inputs readiness"""
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/{SPARSE_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to generate draft: {response.status_code} - {response.text}"
        
        data = response.json()
        draft = data.get("draft", {})
        
        # Sparse data should have missing_inputs populated
        missing_inputs = draft.get("missing_inputs", [])
        assert len(missing_inputs) > 0, "Sparse acquisition should have missing_inputs flagged"
        print(f"PASS: Sparse acquisition has {len(missing_inputs)} missing inputs flagged")
        
        # Readiness should indicate needs work
        readiness = draft.get("readiness")
        assert readiness in ["needs_minor_edits", "needs_major_inputs"], \
            f"Sparse acquisition should need edits/inputs, got: {readiness}"
        print(f"PASS: Sparse acquisition readiness is '{readiness}'")


class TestAIDraftCaching:
    """Test AI draft is cached on the document"""
    
    def test_draft_persists_on_get_acquisition(self, admin_token):
        """After generating draft, GET acquisition should return cached draft"""
        # First generate a draft
        gen_response = requests.post(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert gen_response.status_code == 200, f"Failed to generate draft: {gen_response.text}"
        
        # Now GET the acquisition and verify draft is cached
        get_response = requests.get(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200, f"Failed to get acquisition: {get_response.text}"
        
        acq_data = get_response.json()
        assert "ai_venue_card_draft" in acq_data, "Acquisition should have ai_venue_card_draft field"
        
        cached_draft = acq_data.get("ai_venue_card_draft", {})
        assert "draft" in cached_draft, "Cached draft should have 'draft' field"
        assert "generated_at" in cached_draft, "Cached draft should have 'generated_at' field"
        assert "generated_by" in cached_draft, "Cached draft should have 'generated_by' field"
        
        print("PASS: AI draft is correctly cached on acquisition document")
    
    def test_regenerate_updates_cached_draft(self, admin_token):
        """Regenerating draft should update the cached version"""
        # Generate first draft
        first_response = requests.post(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert first_response.status_code == 200
        first_timestamp = first_response.json().get("generated_at")
        
        # Wait a moment and regenerate
        import time
        time.sleep(1)
        
        second_response = requests.post(
            f"{BASE_URL}/api/acquisitions/{FULL_DATA_ACQ_ID}/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert second_response.status_code == 200
        second_timestamp = second_response.json().get("generated_at")
        
        # Timestamps should be different (regenerated)
        assert second_timestamp != first_timestamp, "Regenerated draft should have new timestamp"
        print("PASS: Regenerate updates cached draft with new timestamp")


class TestAIDraftEdgeCases:
    """Test edge cases for AI draft generation"""
    
    def test_nonexistent_acquisition_returns_404(self, admin_token):
        """Requesting draft for non-existent acquisition should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/acquisitions/acq_nonexistent123/ai-draft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent acquisition, got {response.status_code}"
        print("PASS: Non-existent acquisition returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
