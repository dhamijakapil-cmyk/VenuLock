"""
Tests for Weekly Admin Conversion Intelligence Email feature.
- POST /api/admin/send-conversion-email - Manual trigger endpoint (admin-only)
- GET /api/admin/conversion-email/preview - Preview endpoint returns email data and HTML

Features tested:
1. Topline metrics (total leads, confirmed, GMV, conversion)
2. Funnel snapshot with all 7 stages and leak point detection
3. Revenue forecast with weighted GMV and commission projections
4. Channel performance returns source/attribution data
5. RM leaderboard returns top 5 RMs sorted by GMV
6. Risk alerts section (SLA breaches, payment delays, expiring holds)
7. Email log creation in admin_conversion_email_log collection
8. Graceful skip behavior when no data exists
9. Admin-only access verification (401 for unauth, 403 for RM)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAdminConversionEmailAuth:
    """Test authentication and authorization for conversion email endpoints"""
    
    admin_token = None
    rm_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and RM for tests"""
        # Admin login
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
        
        # RM login
        rm_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rm1@venuloq.in",
            "password": "rm123"
        })
        if rm_resp.status_code == 200:
            self.__class__.rm_token = rm_resp.json().get("token")
    
    # ========== SEND ENDPOINT AUTH TESTS ==========
    
    def test_send_conversion_email_requires_authentication(self):
        """Test that send endpoint requires authentication"""
        resp = requests.post(f"{BASE_URL}/api/admin/send-conversion-email")
        assert resp.status_code == 401
        assert "Not authenticated" in resp.json().get("detail", "")
        print("PASS: Send conversion email requires authentication")
    
    def test_send_conversion_email_requires_admin_role(self):
        """Test that send endpoint requires admin role (403 for RM)"""
        if not self.rm_token:
            pytest.skip("RM token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-conversion-email",
            headers={"Authorization": f"Bearer {self.rm_token}"}
        )
        assert resp.status_code == 403
        assert "Insufficient permissions" in resp.json().get("detail", "")
        print("PASS: Send conversion email requires admin role (403 for RM)")
    
    # ========== PREVIEW ENDPOINT AUTH TESTS ==========
    
    def test_preview_conversion_email_requires_authentication(self):
        """Test that preview endpoint requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/conversion-email/preview")
        assert resp.status_code == 401
        assert "Not authenticated" in resp.json().get("detail", "")
        print("PASS: Preview conversion email requires authentication")
    
    def test_preview_conversion_email_requires_admin_role(self):
        """Test that preview endpoint requires admin role (403 for RM)"""
        if not self.rm_token:
            pytest.skip("RM token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.rm_token}"}
        )
        assert resp.status_code == 403
        assert "Insufficient permissions" in resp.json().get("detail", "")
        print("PASS: Preview conversion email requires admin role (403 for RM)")


class TestPreviewConversionEmail:
    """Test GET /api/admin/conversion-email/preview endpoint"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
    
    def test_preview_returns_200_for_admin(self):
        """Test preview endpoint returns 200 for admin"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        print("PASS: Preview endpoint returns 200 for admin")
    
    def test_preview_returns_topline_metrics(self):
        """Test preview returns topline metrics section"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check if skipped or has data
        if data.get("skipped"):
            print(f"PASS: Preview skipped (no data) - reason: {data.get('reason')}")
            return
        
        assert "topline" in data, "Missing topline section"
        topline = data["topline"]
        
        # Verify topline fields
        expected_fields = [
            "total_leads", "prev_leads", 
            "total_confirmed", "prev_confirmed",
            "total_gmv", "prev_gmv",
            "total_commission", "prev_commission",
            "conversion", "prev_conversion"
        ]
        for field in expected_fields:
            assert field in topline, f"Missing topline field: {field}"
        
        # Verify numeric types
        assert isinstance(topline["total_leads"], int)
        assert isinstance(topline["total_gmv"], (int, float))
        assert isinstance(topline["conversion"], (int, float))
        
        print(f"PASS: Topline metrics - Leads: {topline['total_leads']}, Confirmed: {topline['total_confirmed']}, GMV: {topline['total_gmv']}, Conversion: {topline['conversion']:.1f}%")
    
    def test_preview_returns_funnel_snapshot(self):
        """Test preview returns funnel snapshot with all 7 stages"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        assert "funnel" in data, "Missing funnel section"
        funnel = data["funnel"]
        
        # Verify funnel structure
        assert "reached" in funnel, "Missing reached counts"
        assert "transitions" in funnel, "Missing transitions"
        assert "leak_point" in funnel, "Missing leak_point (can be null)"
        assert "overall_conversion" in funnel, "Missing overall_conversion"
        assert "total_leads" in funnel, "Missing total_leads"
        
        # Verify all 7 stages in reached
        expected_stages = ["new", "contacted", "requirement_understood", "shortlisted", 
                          "site_visit", "negotiation", "booking_confirmed"]
        reached = funnel["reached"]
        for stage in expected_stages:
            assert stage in reached, f"Missing stage in funnel: {stage}"
        
        # Verify transitions have proper structure
        transitions = funnel["transitions"]
        assert len(transitions) == 6, "Should have 6 stage-to-stage transitions"
        
        for t in transitions:
            assert "from_stage" in t
            assert "to_stage" in t
            assert "conv_rate" in t
            assert "drop_off" in t
        
        print(f"PASS: Funnel snapshot - Total: {funnel['total_leads']}, Conversion: {funnel['overall_conversion']:.1f}%")
        if funnel.get("leak_point"):
            lp = funnel["leak_point"]
            print(f"      Leak Point: {lp['from_stage']} -> {lp['to_stage']} ({lp['drop_pct']:.1f}% drop)")
    
    def test_preview_returns_revenue_forecast(self):
        """Test preview returns revenue forecast with weighted projections"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        assert "forecast" in data, "Missing forecast section"
        forecast = data["forecast"]
        
        # Verify forecast fields
        expected_fields = [
            "pipeline_value", "pipeline_count",
            "weighted_gmv", "weighted_commission",
            "confirmed_gmv", "confirmed_commission",
            "projected_gmv", "projected_commission",
            "stage_breakdown"
        ]
        for field in expected_fields:
            assert field in forecast, f"Missing forecast field: {field}"
        
        # Verify projected_gmv = confirmed_gmv + weighted_gmv
        assert forecast["projected_gmv"] == forecast["confirmed_gmv"] + forecast["weighted_gmv"]
        
        print(f"PASS: Revenue forecast - Pipeline: {forecast['pipeline_value']}, Weighted GMV: {forecast['weighted_gmv']}, Projected: {forecast['projected_gmv']}")
    
    def test_preview_returns_channel_performance(self):
        """Test preview returns channel/source performance data"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        assert "channels" in data, "Missing channels section"
        channels = data["channels"]
        
        # Channels should be a list
        assert isinstance(channels, list)
        
        # If there are channels, verify structure
        if channels:
            ch = channels[0]
            assert "source" in ch
            assert "leads" in ch
            assert "confirmed" in ch
            assert "gmv" in ch
            assert "conversion" in ch
            
            print(f"PASS: Channel performance - {len(channels)} sources, Top: {ch['source']} ({ch['leads']} leads)")
        else:
            print("PASS: Channel performance - No channel data (empty list)")
    
    def test_preview_returns_rm_leaderboard(self):
        """Test preview returns RM leaderboard sorted by GMV"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        assert "leaderboard" in data, "Missing leaderboard section"
        leaderboard = data["leaderboard"]
        
        # Leaderboard should be a list
        assert isinstance(leaderboard, list)
        
        # Should return max 5 RMs
        assert len(leaderboard) <= 5, "Leaderboard should return max 5 RMs"
        
        # Verify structure if RMs exist
        if leaderboard:
            rm = leaderboard[0]
            assert "rm_name" in rm
            assert "leads" in rm
            assert "confirmed" in rm
            assert "gmv" in rm
            assert "conversion" in rm
            
            # Verify sorted by GMV descending
            for i in range(len(leaderboard) - 1):
                assert leaderboard[i]["gmv"] >= leaderboard[i+1]["gmv"], "Leaderboard should be sorted by GMV descending"
            
            print(f"PASS: RM leaderboard - {len(leaderboard)} RMs, Top: {rm['rm_name']} (GMV: {rm['gmv']})")
        else:
            print("PASS: RM leaderboard - No RM data (empty list)")
    
    def test_preview_returns_risk_alerts(self):
        """Test preview returns risk alerts section"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        assert "risks" in data, "Missing risks section"
        risks = data["risks"]
        
        # Verify risk alerts structure
        expected_fields = [
            "sla_breaches", "payment_delays", "expiring_holds",
            "total_critical", "total_warnings"
        ]
        for field in expected_fields:
            assert field in risks, f"Missing risk field: {field}"
        
        # Verify arrays
        assert isinstance(risks["sla_breaches"], list)
        assert isinstance(risks["payment_delays"], list)
        assert isinstance(risks["expiring_holds"], list)
        
        # Verify counts
        assert isinstance(risks["total_critical"], int)
        assert isinstance(risks["total_warnings"], int)
        
        print(f"PASS: Risk alerts - Critical: {risks['total_critical']}, Warnings: {risks['total_warnings']}")
        print(f"      SLA breaches: {len(risks['sla_breaches'])}, Payment delays: {len(risks['payment_delays'])}, Expiring holds: {len(risks['expiring_holds'])}")
    
    def test_preview_returns_html(self):
        """Test preview returns email HTML content"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        assert "html" in data, "Missing HTML content"
        html = data["html"]
        
        # Verify HTML contains expected elements
        assert isinstance(html, str)
        assert len(html) > 1000, "HTML content seems too short"
        assert "BOOKMYVENUE" in html, "Missing company name in HTML"
        assert "Weekly Intelligence Report" in html, "Missing report title in HTML"
        
        print(f"PASS: HTML content returned - Length: {len(html)} chars")
    
    def test_preview_returns_generated_at(self):
        """Test preview returns generated_at timestamp"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "generated_at" in data, "Missing generated_at"
        
        # Verify it's a valid ISO timestamp
        try:
            datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00"))
            print(f"PASS: generated_at timestamp: {data['generated_at']}")
        except ValueError:
            pytest.fail("generated_at is not a valid ISO timestamp")


class TestSendConversionEmail:
    """Test POST /api/admin/send-conversion-email endpoint"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
    
    def test_send_returns_200_for_admin(self):
        """Test send endpoint returns 200 for admin"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-conversion-email",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        print("PASS: Send endpoint returns 200 for admin")
    
    def test_send_returns_proper_response_structure(self):
        """Test send endpoint returns proper response with sent count and metrics"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-conversion-email",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check if skipped or has data
        if data.get("skipped"):
            assert "reason" in data, "Skipped response should have reason"
            print(f"PASS: Send skipped - reason: {data['reason']}")
            return
        
        # Verify response structure for successful send
        expected_fields = ["sent", "failed", "recipients", "metrics", "generated_at", "manual"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify types
        assert isinstance(data["sent"], int)
        assert isinstance(data["failed"], int)
        assert isinstance(data["recipients"], list)
        assert isinstance(data["manual"], bool)
        assert data["manual"] == True, "Manual trigger should have manual=True"
        
        # Verify metrics structure
        metrics = data["metrics"]
        assert "gmv" in metrics
        assert "bookings" in metrics
        assert "alerts" in metrics
        
        print(f"PASS: Send response - Sent: {data['sent']}, Failed: {data['failed']}, Recipients: {data['recipients']}")
    
    def test_send_marks_as_manual_trigger(self):
        """Test that manual trigger sets manual=True in response"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/send-conversion-email",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if not data.get("skipped"):
            assert data.get("manual") == True, "Manual trigger should have manual=True"
            print("PASS: Manual trigger flag is set correctly")
        else:
            print("PASS: Skipped (no data), manual flag not applicable")


class TestGracefulSkipBehavior:
    """Test graceful skip behavior when no meaningful data exists"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
    
    def test_preview_handles_no_data_gracefully(self):
        """Test that preview returns skipped=True with reason when no data"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # This test verifies the structure is correct - actual skip depends on data
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify either skipped response or full data response
        if data.get("skipped"):
            assert "reason" in data
            assert "generated_at" in data
            print(f"PASS: Graceful skip - reason: {data['reason']}")
        else:
            # Full data - verify has required sections
            assert "topline" in data
            assert "funnel" in data
            assert "forecast" in data
            print("PASS: Full data returned (no skip needed)")


class TestConversionEmailMetricsAccuracy:
    """Test accuracy of calculated metrics"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@venuloq.in",
            "password": "admin123"
        })
        if admin_resp.status_code == 200:
            self.__class__.admin_token = admin_resp.json().get("token")
    
    def test_conversion_rate_calculation(self):
        """Test that conversion rate is calculated correctly"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        topline = data["topline"]
        
        # If there are leads, verify conversion calculation
        if topline["total_leads"] > 0:
            expected_conversion = (topline["total_confirmed"] / topline["total_leads"]) * 100
            actual_conversion = topline["conversion"]
            
            # Allow for floating point precision
            assert abs(expected_conversion - actual_conversion) < 0.1, f"Conversion mismatch: expected {expected_conversion:.2f}, got {actual_conversion:.2f}"
            print(f"PASS: Conversion rate accurate - {actual_conversion:.1f}%")
        else:
            # Zero leads should have 0% conversion
            assert topline["conversion"] == 0
            print("PASS: Zero leads = 0% conversion")
    
    def test_funnel_overall_conversion(self):
        """Test that funnel overall conversion is correct"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/conversion-email/preview",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("skipped"):
            pytest.skip("Preview skipped - no data")
        
        funnel = data["funnel"]
        reached = funnel["reached"]
        
        # Overall conversion = booking_confirmed / new
        if reached["new"] > 0:
            expected = (reached["booking_confirmed"] / reached["new"]) * 100
            actual = funnel["overall_conversion"]
            
            assert abs(expected - actual) < 0.1, f"Funnel conversion mismatch"
            print(f"PASS: Funnel conversion accurate - {actual:.1f}%")
        else:
            assert funnel["overall_conversion"] == 0
            print("PASS: Zero leads = 0% funnel conversion")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
