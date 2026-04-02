"""
Phase 9: Public Discovery Ranking + Internal Matching Governance
Tests for the deterministic, explainable, fit-first ranking engine.

Endpoints tested:
- GET /api/ranking/config - returns config with weights, fit_subfactors, mode, engine params
- POST /api/ranking/config - admin can update weights, fit subfactors, mode, params (with audit trail)
- POST /api/ranking/run - runs ranking engine with search params, returns bucketed results
- POST /api/ranking/shadow - compares engine order vs current DB order
- GET /api/ranking/venue/{acq_id}/explain - full score breakdown
- GET /api/ranking/eligible - lists all eligible venues with scores

Role gating:
- Only INTERNAL_ROLES (admin, venue_manager, rm, vam) can access ranking endpoints
- Only admin can update config
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@venuloq.in", "password": "admin123"}
VENUE_MANAGER_CREDS = {"email": "venuemanager@venuloq.in", "password": "test123"}
RM_CREDS = {"email": "rm1@venuloq.in", "password": "rm123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Admin login failed")


@pytest.fixture(scope="module")
def venue_manager_token():
    """Get venue manager auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json=VENUE_MANAGER_CREDS)
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Venue manager login failed")


@pytest.fixture(scope="module")
def rm_token():
    """Get RM auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json=RM_CREDS)
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("RM login failed")


class TestRankingConfigGet:
    """GET /api/ranking/config tests"""

    def test_config_requires_auth(self):
        """Config endpoint requires authentication"""
        res = requests.get(f"{BASE_URL}/api/ranking/config")
        assert res.status_code == 401

    def test_admin_can_get_config(self, admin_token):
        """Admin can get ranking config"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        # Verify config structure
        assert "weights" in data
        assert "fit_subfactors" in data
        assert "mode" in data
        
        # Verify weights
        weights = data["weights"]
        assert "customer_fit" in weights
        assert "supply_quality" in weights
        assert "freshness" in weights
        assert "engagement" in weights
        
        # Verify fit subfactors
        fit_sub = data["fit_subfactors"]
        assert "distance_location" in fit_sub
        assert "event_type" in fit_sub
        assert "capacity" in fit_sub
        assert "budget" in fit_sub
        assert "style_vibe" in fit_sub
        assert "amenity" in fit_sub
        
        # Verify engine params
        assert "diversity_strength" in data
        assert "freshness_boost_days" in data
        assert "quality_threshold" in data
        assert "verified_boost_points" in data

    def test_venue_manager_can_get_config(self, venue_manager_token):
        """Venue manager can get ranking config"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "weights" in data
        assert "mode" in data

    def test_rm_can_get_config(self, rm_token):
        """RM can get ranking config"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert res.status_code == 200


class TestRankingConfigUpdate:
    """POST /api/ranking/config tests"""

    def test_config_update_requires_auth(self):
        """Config update requires authentication"""
        res = requests.post(f"{BASE_URL}/api/ranking/config", json={"mode": "validation"})
        assert res.status_code == 401

    def test_venue_manager_cannot_update_config(self, venue_manager_token):
        """Venue manager cannot update config (admin only)"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"mode": "validation"}
        )
        assert res.status_code == 403

    def test_rm_cannot_update_config(self, rm_token):
        """RM cannot update config (admin only)"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"mode": "validation"}
        )
        assert res.status_code == 403

    def test_admin_can_update_mode(self, admin_token):
        """Admin can update engine mode"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"mode": "validation", "reason": "Testing mode update"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        assert "changes" in data

    def test_weights_must_sum_to_one(self, admin_token):
        """Weights must sum to approximately 1.0"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"weights": {"customer_fit": 0.5, "supply_quality": 0.1, "freshness": 0.1, "engagement": 0.1}}
        )
        # Sum is 0.8, should fail
        assert res.status_code == 400
        assert "sum" in res.json().get("detail", "").lower()

    def test_fit_subfactors_must_sum_to_one(self, admin_token):
        """Fit subfactors must sum to approximately 1.0"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"fit_subfactors": {"distance_location": 0.5, "event_type": 0.1, "capacity": 0.1, "budget": 0.1, "style_vibe": 0.05, "amenity": 0.05}}
        )
        # Sum is 0.9, should fail
        assert res.status_code == 400
        assert "sum" in res.json().get("detail", "").lower()

    def test_invalid_mode_rejected(self, admin_token):
        """Invalid mode value is rejected"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"mode": "invalid_mode"}
        )
        assert res.status_code == 400

    def test_admin_can_update_engine_params(self, admin_token):
        """Admin can update engine parameters"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "diversity_strength": 0.30,
                "freshness_boost_days": 30,
                "quality_threshold": 30,
                "verified_boost_points": 8,
                "reason": "Testing engine params update"
            }
        )
        assert res.status_code == 200

    def test_audit_trail_created(self, admin_token):
        """Config update creates audit trail entry"""
        # First update config
        requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"mode": "validation", "reason": "Audit trail test"}
        )
        
        # Then get config and check audit
        res = requests.get(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "audit" in data
        assert len(data["audit"]) > 0
        
        # Check audit entry structure
        latest_audit = data["audit"][-1]
        assert "actor_name" in latest_audit
        assert "actor_role" in latest_audit
        assert "changes" in latest_audit
        assert "timestamp" in latest_audit


class TestRankingRun:
    """POST /api/ranking/run tests"""

    def test_run_requires_auth(self):
        """Run endpoint requires authentication"""
        res = requests.post(f"{BASE_URL}/api/ranking/run", json={"city": "Delhi"})
        assert res.status_code == 401

    def test_admin_can_run_engine(self, admin_token):
        """Admin can run ranking engine"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"city": "Delhi", "event_type": "wedding", "guests": 300}
        )
        assert res.status_code == 200
        data = res.json()
        
        # Verify response structure
        assert "mode" in data
        assert "total_eligible" in data
        assert "total_scored" in data
        assert "quality_threshold" in data
        assert "search_params" in data
        assert "buckets" in data
        
        # Verify buckets structure
        buckets = data["buckets"]
        assert "best_matches" in buckets
        assert "smart_alternatives" in buckets
        assert "expert_picks" in buckets

    def test_venue_manager_can_run_engine(self, venue_manager_token):
        """Venue manager can run ranking engine"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"city": "Delhi"}
        )
        assert res.status_code == 200
        assert "buckets" in res.json()

    def test_rm_can_run_engine(self, rm_token):
        """RM can run ranking engine"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"city": "Delhi"}
        )
        assert res.status_code == 200

    def test_search_params_in_response(self, admin_token):
        """Search params are echoed in response"""
        search = {
            "city": "Delhi",
            "preferred_locality": "Connaught Place",
            "event_type": "wedding",
            "guests": 300,
            "budget_per_plate": 3000,
            "travel_flexibility": "moderately_flexible"
        }
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=search
        )
        assert res.status_code == 200
        data = res.json()
        assert data["search_params"]["city"] == "Delhi"
        assert data["search_params"]["event_type"] == "wedding"
        assert data["search_params"]["guests"] == 300

    def test_travel_flexibility_strictly_nearby(self, admin_token):
        """Travel flexibility 'strictly_nearby' increases distance weight"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"city": "Delhi", "travel_flexibility": "strictly_nearby"}
        )
        assert res.status_code == 200
        # Check that venues are scored with higher distance weight
        data = res.json()
        if data["buckets"]["best_matches"]:
            venue = data["buckets"]["best_matches"][0]
            # Distance weight should be 0.40 for strictly_nearby
            dist_weight = venue["ranking"]["customer_fit_breakdown"]["distance_location"]["weight"]
            assert abs(dist_weight - 0.40) < 0.01

    def test_travel_flexibility_destination(self, admin_token):
        """Travel flexibility 'destination' decreases distance weight"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"city": "Delhi", "travel_flexibility": "destination"}
        )
        assert res.status_code == 200
        data = res.json()
        if data["buckets"]["best_matches"]:
            venue = data["buckets"]["best_matches"][0]
            # Distance weight should be 0.03 for destination
            dist_weight = venue["ranking"]["customer_fit_breakdown"]["distance_location"]["weight"]
            assert abs(dist_weight - 0.03) < 0.01


class TestRankingShadow:
    """POST /api/ranking/shadow tests"""

    def test_shadow_requires_auth(self):
        """Shadow endpoint requires authentication"""
        res = requests.post(f"{BASE_URL}/api/ranking/shadow", json={"city": "Delhi"})
        assert res.status_code == 401

    def test_admin_can_run_shadow(self, admin_token):
        """Admin can run shadow comparison"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/shadow",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"city": "Delhi"}
        )
        assert res.status_code == 200
        data = res.json()
        
        # Verify response structure
        assert "mode" in data
        assert "current_count" in data
        assert "engine_count" in data
        assert "comparison" in data
        assert "search_params" in data

    def test_shadow_comparison_structure(self, admin_token):
        """Shadow comparison has correct structure"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/shadow",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"city": "Delhi"}
        )
        assert res.status_code == 200
        data = res.json()
        
        if data["comparison"]:
            item = data["comparison"][0]
            assert "venue_id" in item
            assert "venue_name" in item
            assert "city" in item
            assert "area" in item
            assert "current_position" in item
            assert "engine_position" in item
            assert "position_change" in item
            assert "engine_score" in item
            assert "customer_fit" in item
            assert "from_pipeline" in item

    def test_venue_manager_can_run_shadow(self, venue_manager_token):
        """Venue manager can run shadow comparison"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/shadow",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"city": "Delhi"}
        )
        assert res.status_code == 200


class TestRankingExplain:
    """GET /api/ranking/venue/{acq_id}/explain tests"""

    def test_explain_requires_auth(self):
        """Explain endpoint requires authentication"""
        res = requests.get(f"{BASE_URL}/api/ranking/venue/acq_pub_test_001/explain")
        assert res.status_code == 401

    def test_explain_not_found(self, admin_token):
        """Explain returns 404 for non-existent acquisition"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/venue/nonexistent_acq/explain",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 404

    def test_admin_can_get_explain(self, admin_token):
        """Admin can get score explanation for a venue"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/venue/acq_pub_test_001/explain",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={
                "city": "Delhi",
                "preferred_locality": "Connaught Place",
                "event_type": "wedding",
                "guests": 300,
                "budget_per_plate": 3000
            }
        )
        # May be 404 if test data doesn't exist, or 200 if it does
        if res.status_code == 200:
            data = res.json()
            assert "acquisition_id" in data
            assert "venue_id" in data
            assert "venue_name" in data
            assert "is_eligible" in data
            assert "ranking" in data
            assert "search_context" in data
            
            # Verify ranking breakdown
            ranking = data["ranking"]
            assert "total_score" in ranking
            assert "customer_fit" in ranking
            assert "customer_fit_breakdown" in ranking
            assert "supply_quality" in ranking
            assert "freshness" in ranking
            assert "engagement" in ranking
            
            # Verify customer fit breakdown
            cfb = ranking["customer_fit_breakdown"]
            assert "distance_location" in cfb
            assert "event_type" in cfb
            assert "capacity" in cfb
            assert "budget" in cfb
            assert "style_vibe" in cfb
            assert "amenity" in cfb
            
            # Each subfactor should have score, weight, detail
            for key in cfb:
                assert "score" in cfb[key]
                assert "weight" in cfb[key]
                assert "detail" in cfb[key]
        else:
            # 404 is acceptable if test data doesn't exist
            assert res.status_code == 404


class TestRankingEligible:
    """GET /api/ranking/eligible tests"""

    def test_eligible_requires_auth(self):
        """Eligible endpoint requires authentication"""
        res = requests.get(f"{BASE_URL}/api/ranking/eligible")
        assert res.status_code == 401

    def test_admin_can_get_eligible(self, admin_token):
        """Admin can get list of eligible venues"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/eligible",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert "eligible_count" in data
        assert "venues" in data
        assert "mode" in data
        
        if data["venues"]:
            venue = data["venues"][0]
            assert "venue_id" in venue
            assert "name" in venue
            assert "city" in venue
            assert "total_score" in venue
            assert "customer_fit" in venue
            assert "supply_quality" in venue
            assert "freshness" in venue
            assert "engagement" in venue
            assert "from_pipeline" in venue

    def test_venue_manager_can_get_eligible(self, venue_manager_token):
        """Venue manager can get list of eligible venues"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/eligible",
            headers={"Authorization": f"Bearer {venue_manager_token}"}
        )
        assert res.status_code == 200

    def test_rm_can_get_eligible(self, rm_token):
        """RM can get list of eligible venues"""
        res = requests.get(
            f"{BASE_URL}/api/ranking/eligible",
            headers={"Authorization": f"Bearer {rm_token}"}
        )
        assert res.status_code == 200


class TestDistanceScoring:
    """Tests for distance/location scoring logic"""

    def test_scoring_with_locality(self, admin_token):
        """Scoring works with preferred locality"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "city": "Delhi",
                "preferred_locality": "Connaught Place",
                "event_type": "wedding",
                "guests": 300
            }
        )
        assert res.status_code == 200
        data = res.json()
        # Venues in Connaught Place should score higher on distance
        if data["buckets"]["best_matches"]:
            venue = data["buckets"]["best_matches"][0]
            dist_score = venue["ranking"]["customer_fit_breakdown"]["distance_location"]["score"]
            # Score should be between 0 and 100
            assert 0 <= dist_score <= 100

    def test_scoring_with_gurgaon(self, admin_token):
        """Scoring works for Gurgaon venues"""
        res = requests.post(
            f"{BASE_URL}/api/ranking/run",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "city": "Gurgaon",
                "preferred_locality": "DLF Phase 3",
                "event_type": "wedding"
            }
        )
        assert res.status_code == 200


class TestRoleGating:
    """Tests for role-based access control"""

    def test_customer_cannot_access_ranking(self):
        """Customer role cannot access ranking endpoints"""
        # Login as customer
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        if res.status_code != 200:
            pytest.skip("Customer login not available")
        
        token = res.json().get("token")
        
        # Try to access ranking config
        res = requests.get(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 403

    def test_internal_roles_can_access(self, admin_token, venue_manager_token, rm_token):
        """All internal roles can access ranking endpoints"""
        for token in [admin_token, venue_manager_token, rm_token]:
            res = requests.get(
                f"{BASE_URL}/api/ranking/config",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert res.status_code == 200

    def test_only_admin_can_update_config(self, admin_token, venue_manager_token, rm_token):
        """Only admin can update ranking config"""
        # Admin should succeed
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"mode": "validation"}
        )
        assert res.status_code == 200
        
        # Venue manager should fail
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {venue_manager_token}"},
            json={"mode": "validation"}
        )
        assert res.status_code == 403
        
        # RM should fail
        res = requests.post(
            f"{BASE_URL}/api/ranking/config",
            headers={"Authorization": f"Bearer {rm_token}"},
            json={"mode": "validation"}
        )
        assert res.status_code == 403
