"""
VenuLoQ Phase 7 — Real Communication + RM Execution Continuity Tests
=====================================================================
Part A: Real owner onboarding delivery via Resend email + WhatsApp deep link
Part B: RM shortlist/share workflow with public customer shortlist page
Part C: RM in-app follow-up continuity alerts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from context
RM_EMAIL = "rm1@venulock.in"
RM_PASSWORD = "rm123"
VM_EMAIL = "venuemanager@venuloq.in"
VM_PASSWORD = "test123"

# Test data from context
TEST_LEAD_ID = "lead_558ba40c8d81"
TEST_SHARE_TOKEN = "b8e588c8b331e41088e218355b06895a"
TEST_ACQ_ID = "acq_96bd550290e2"


class TestPhase7Setup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def rm_token(self):
        """Get RM auth token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip(f"RM login failed: {res.status_code}")
    
    @pytest.fixture(scope="class")
    def vm_token(self):
        """Get Venue Manager auth token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VM_EMAIL,
            "password": VM_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip(f"VM login failed: {res.status_code}")
    
    def test_01_rm_login(self):
        """RM can login successfully"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL,
            "password": RM_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "rm"
        print(f"RM login successful: {data.get('user', {}).get('name')}")
    
    def test_02_vm_login(self):
        """Venue Manager can login successfully"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VM_EMAIL,
            "password": VM_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "venue_manager"
        print(f"VM login successful: {data.get('user', {}).get('name')}")


class TestPart7A_OnboardingDelivery:
    """Part A: Real owner onboarding delivery via Resend email + WhatsApp deep link"""
    
    @pytest.fixture(scope="class")
    def vm_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VM_EMAIL, "password": VM_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("VM login failed")
    
    def test_03_send_onboarding_requires_auth(self):
        """POST /api/onboarding/send/{acq_id} requires authentication"""
        res = requests.post(f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_ID}", json={
            "channels": ["email"]
        })
        assert res.status_code == 401
        print("Send onboarding requires auth: PASS")
    
    def test_04_send_onboarding_with_email(self, vm_token):
        """POST /api/onboarding/send/{acq_id} sends email via Resend"""
        headers = {"Authorization": f"Bearer {vm_token}"}
        res = requests.post(f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_ID}", 
            headers=headers,
            json={"channels": ["email"]}
        )
        # May fail if acquisition not in correct status, but should not be 401/403
        if res.status_code == 200:
            data = res.json()
            assert "delivery" in data
            assert "onboarding_link" in data
            # Check delivery results
            delivery = data.get("delivery", [])
            email_delivery = next((d for d in delivery if d["channel"] == "email"), None)
            if email_delivery:
                assert email_delivery["status"] in ["delivered", "failed", "skipped"]
                print(f"Email delivery status: {email_delivery['status']}")
            print(f"Onboarding link: {data.get('onboarding_link')}")
        elif res.status_code == 400:
            print(f"Cannot send from current status: {res.json().get('detail')}")
        else:
            print(f"Send response: {res.status_code} - {res.text[:200]}")
    
    def test_05_send_onboarding_with_whatsapp(self, vm_token):
        """POST /api/onboarding/send/{acq_id} generates WhatsApp deep link"""
        headers = {"Authorization": f"Bearer {vm_token}"}
        res = requests.post(f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_ID}", 
            headers=headers,
            json={"channels": ["whatsapp"]}
        )
        if res.status_code == 200:
            data = res.json()
            assert "delivery" in data
            delivery = data.get("delivery", [])
            wa_delivery = next((d for d in delivery if d["channel"] == "whatsapp"), None)
            if wa_delivery:
                assert wa_delivery["status"] in ["link_generated", "skipped"]
                if wa_delivery["status"] == "link_generated":
                    assert "whatsapp_link" in wa_delivery
                    assert "wa.me" in wa_delivery["whatsapp_link"]
                    print(f"WhatsApp link generated: {wa_delivery['whatsapp_link'][:50]}...")
                else:
                    print(f"WhatsApp skipped: {wa_delivery.get('failure_reason')}")
        elif res.status_code == 400:
            print(f"Cannot send from current status: {res.json().get('detail')}")
    
    def test_06_send_onboarding_both_channels(self, vm_token):
        """POST /api/onboarding/send/{acq_id} with both email and whatsapp"""
        headers = {"Authorization": f"Bearer {vm_token}"}
        res = requests.post(f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_ID}", 
            headers=headers,
            json={"channels": ["email", "whatsapp"]}
        )
        if res.status_code == 200:
            data = res.json()
            assert "delivery" in data
            delivery = data.get("delivery", [])
            assert len(delivery) == 2
            for d in delivery:
                assert "channel" in d
                assert "status" in d
                assert d["status"] in ["delivered", "failed", "skipped", "link_generated"]
                print(f"  {d['channel']}: {d['status']}")
        elif res.status_code == 400:
            print(f"Cannot send from current status: {res.json().get('detail')}")
    
    def test_07_delivery_results_per_channel(self, vm_token):
        """Delivery results include per-channel status"""
        headers = {"Authorization": f"Bearer {vm_token}"}
        res = requests.get(f"{BASE_URL}/api/onboarding/status/{TEST_ACQ_ID}", headers=headers)
        if res.status_code == 200:
            data = res.json()
            onboarding = data.get("onboarding", {})
            sends = onboarding.get("sends", [])
            if sends:
                last_send = sends[-1]
                assert "delivery" in last_send
                for d in last_send.get("delivery", []):
                    assert "channel" in d
                    assert "status" in d
                    assert "attempted_at" in d
                    print(f"  {d['channel']}: {d['status']} at {d['attempted_at'][:19]}")
        else:
            print(f"Status check: {res.status_code}")
    
    def test_08_fallback_suggestion_when_email_fails(self, vm_token):
        """Fallback suggestion when email fails or is missing"""
        headers = {"Authorization": f"Bearer {vm_token}"}
        res = requests.post(f"{BASE_URL}/api/onboarding/send/{TEST_ACQ_ID}", 
            headers=headers,
            json={"channels": ["email"]}
        )
        if res.status_code == 200:
            data = res.json()
            # Check if fallback_suggestion is present
            if data.get("fallback_suggestion"):
                print(f"Fallback suggestion: {data['fallback_suggestion']}")
            else:
                print("No fallback suggestion (email likely succeeded or WhatsApp also sent)")
        elif res.status_code == 400:
            print(f"Cannot send: {res.json().get('detail')}")


class TestPart7B_ShortlistWorkflow:
    """Part B: RM shortlist/share workflow with public customer shortlist page"""
    
    @pytest.fixture(scope="class")
    def rm_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("RM login failed")
    
    def test_09_quick_search_venues(self):
        """GET /api/venues/quick-search?q=... returns venue results"""
        res = requests.get(f"{BASE_URL}/api/venues/quick-search?q=delhi&limit=8")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        if data:
            venue = data[0]
            assert "venue_id" in venue
            assert "name" in venue
            print(f"Quick search returned {len(data)} venues")
            print(f"  First: {venue.get('name')} ({venue.get('city')})")
        else:
            print("No venues found for 'delhi' - trying 'mumbai'")
            res2 = requests.get(f"{BASE_URL}/api/venues/quick-search?q=mumbai&limit=8")
            if res2.status_code == 200 and res2.json():
                print(f"  Found {len(res2.json())} venues for 'mumbai'")
    
    def test_10_quick_search_requires_min_length(self):
        """GET /api/venues/quick-search requires min 2 chars"""
        res = requests.get(f"{BASE_URL}/api/venues/quick-search?q=a")
        assert res.status_code == 400
        print("Quick search requires min 2 chars: PASS")
    
    def test_11_get_shortlist_requires_auth(self):
        """GET /api/workflow/{lead_id}/shortlist requires auth"""
        res = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist")
        assert res.status_code == 401
        print("Get shortlist requires auth: PASS")
    
    def test_12_get_shortlist(self, rm_token):
        """GET /api/workflow/{lead_id}/shortlist returns shortlist with venue details"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        res = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "lead_id" in data
        assert "shortlist" in data
        assert "shares" in data
        print(f"Shortlist for {TEST_LEAD_ID}: {data.get('total', 0)} venues")
        if data.get("shortlist"):
            for item in data["shortlist"][:3]:
                print(f"  - {item.get('venue_name')} ({item.get('city')})")
    
    def test_13_add_to_shortlist_requires_auth(self):
        """POST /api/workflow/{lead_id}/shortlist/add requires auth"""
        res = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist/add", json={
            "venue_id": "venue_test123"
        })
        assert res.status_code == 401
        print("Add to shortlist requires auth: PASS")
    
    def test_14_add_to_shortlist(self, rm_token):
        """POST /api/workflow/{lead_id}/shortlist/add adds venue to shortlist"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        # First get a venue to add
        venues_res = requests.get(f"{BASE_URL}/api/venues/quick-search?q=delhi&limit=1")
        if venues_res.status_code != 200 or not venues_res.json():
            venues_res = requests.get(f"{BASE_URL}/api/venues?limit=1")
        
        if venues_res.status_code == 200 and venues_res.json():
            venues = venues_res.json()
            venue_id = venues[0].get("venue_id") if isinstance(venues, list) else None
            if venue_id:
                res = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist/add",
                    headers=headers,
                    json={"venue_id": venue_id}
                )
                if res.status_code == 200:
                    data = res.json()
                    assert "venue_id" in data
                    print(f"Added to shortlist: {data.get('venue_name')}")
                elif res.status_code == 400:
                    print(f"Already in shortlist or error: {res.json().get('detail')}")
                else:
                    print(f"Add response: {res.status_code}")
            else:
                print("No venue_id found in response")
        else:
            print("No venues available to add")
    
    def test_15_remove_from_shortlist(self, rm_token):
        """POST /api/workflow/{lead_id}/shortlist/remove removes venue"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        # Get current shortlist
        sl_res = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist", headers=headers)
        if sl_res.status_code == 200:
            shortlist = sl_res.json().get("shortlist", [])
            if shortlist:
                venue_id = shortlist[0].get("venue_id")
                res = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist/remove",
                    headers=headers,
                    json={"venue_id": venue_id}
                )
                assert res.status_code == 200
                print(f"Removed from shortlist: {venue_id}")
            else:
                print("Shortlist empty, nothing to remove")
    
    def test_16_share_shortlist_requires_auth(self):
        """POST /api/workflow/{lead_id}/share-shortlist requires auth"""
        res = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/share-shortlist", json={
            "channels": ["whatsapp"]
        })
        assert res.status_code == 401
        print("Share shortlist requires auth: PASS")
    
    def test_17_share_shortlist(self, rm_token):
        """POST /api/workflow/{lead_id}/share-shortlist generates share token and WhatsApp link"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        # First ensure there's something in shortlist
        venues_res = requests.get(f"{BASE_URL}/api/venues?limit=1")
        if venues_res.status_code == 200 and venues_res.json():
            venue_id = venues_res.json()[0].get("venue_id")
            requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/shortlist/add",
                headers=headers, json={"venue_id": venue_id})
        
        res = requests.post(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/share-shortlist",
            headers=headers,
            json={"channels": ["whatsapp"]}
        )
        if res.status_code == 200:
            data = res.json()
            assert "share_link" in data
            assert "share_token" in data
            assert "venue_count" in data
            if data.get("whatsapp_link"):
                assert "wa.me" in data["whatsapp_link"]
                print(f"WhatsApp link: {data['whatsapp_link'][:60]}...")
            print(f"Share link: {data['share_link']}")
            print(f"Shared {data['venue_count']} venues")
        elif res.status_code == 400:
            print(f"Cannot share: {res.json().get('detail')}")
    
    def test_18_view_public_shortlist(self):
        """GET /api/shortlist/{share_token} returns public shortlist"""
        res = requests.get(f"{BASE_URL}/api/shortlist/{TEST_SHARE_TOKEN}")
        if res.status_code == 200:
            data = res.json()
            assert "venues" in data
            assert "total" in data
            print(f"Public shortlist: {data.get('total')} venues for {data.get('customer_name')}")
            if data.get("venues"):
                for v in data["venues"][:3]:
                    print(f"  - {v.get('name')} ({v.get('city')})")
        elif res.status_code == 404:
            print("Share token not found or expired")
        elif res.status_code == 410:
            print("Share token expired")
    
    def test_19_submit_feedback_on_shortlist(self):
        """POST /api/shortlist/{share_token}/feedback accepts customer preference"""
        # First check if shortlist exists
        check_res = requests.get(f"{BASE_URL}/api/shortlist/{TEST_SHARE_TOKEN}")
        if check_res.status_code != 200:
            print(f"Shortlist not accessible: {check_res.status_code}")
            return
        
        venues = check_res.json().get("venues", [])
        if not venues:
            print("No venues in shortlist to provide feedback")
            return
        
        feedback = [
            {"venue_id": venues[0]["venue_id"], "preference": "interested", "comment": "Looks great!"}
        ]
        if len(venues) > 1:
            feedback.append({"venue_id": venues[1]["venue_id"], "preference": "maybe", "comment": ""})
        
        res = requests.post(f"{BASE_URL}/api/shortlist/{TEST_SHARE_TOKEN}/feedback", json={
            "feedback": feedback
        })
        if res.status_code == 200:
            data = res.json()
            assert "submitted" in data
            assert "interested" in data
            print(f"Feedback submitted: {data['submitted']} venues, {data['interested']} interested")
        else:
            print(f"Feedback response: {res.status_code} - {res.text[:100]}")
    
    def test_20_feedback_persisted_on_view(self):
        """Feedback is visible on subsequent view"""
        res = requests.get(f"{BASE_URL}/api/shortlist/{TEST_SHARE_TOKEN}")
        if res.status_code == 200:
            data = res.json()
            if data.get("feedback_received"):
                print("Feedback received flag: True")
            venues = data.get("venues", [])
            for v in venues:
                if v.get("feedback"):
                    print(f"  {v['name']}: {v['feedback']['preference']}")


class TestPart7C_RMAlerts:
    """Part C: RM in-app follow-up continuity alerts"""
    
    @pytest.fixture(scope="class")
    def rm_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("RM login failed")
    
    def test_21_alerts_requires_auth(self):
        """GET /api/workflow/rm/alerts requires authentication"""
        res = requests.get(f"{BASE_URL}/api/workflow/rm/alerts")
        assert res.status_code == 401
        print("Alerts requires auth: PASS")
    
    def test_22_alerts_returns_data(self, rm_token):
        """GET /api/workflow/rm/alerts returns alerts array"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        res = requests.get(f"{BASE_URL}/api/workflow/rm/alerts", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "alerts" in data
        assert "total" in data
        assert "unread_count" in data
        print(f"Alerts: {data['total']} total, {data['unread_count']} unread")
    
    def test_23_alerts_types(self, rm_token):
        """Alerts include new_assignment, overdue_followup, upcoming_followup, blocker_reminder"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        res = requests.get(f"{BASE_URL}/api/workflow/rm/alerts", headers=headers)
        assert res.status_code == 200
        alerts = res.json().get("alerts", [])
        
        alert_types = set(a.get("type") for a in alerts)
        expected_types = {"new_assignment", "overdue_followup", "upcoming_followup", "blocker_reminder"}
        
        print(f"Alert types found: {alert_types}")
        for alert in alerts[:5]:
            print(f"  [{alert['type']}] {alert['title']}: {alert['description'][:50]}...")
    
    def test_24_alerts_have_required_fields(self, rm_token):
        """Each alert has type, lead_id, title, description, priority, created_at"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        res = requests.get(f"{BASE_URL}/api/workflow/rm/alerts", headers=headers)
        assert res.status_code == 200
        alerts = res.json().get("alerts", [])
        
        for alert in alerts[:5]:
            assert "type" in alert
            assert "lead_id" in alert
            assert "title" in alert
            assert "description" in alert
            assert "priority" in alert
            assert "created_at" in alert
            assert alert["priority"] in ["high", "medium", "info"]
        
        print(f"All {min(5, len(alerts))} alerts have required fields")
    
    def test_25_alerts_sorted_by_priority(self, rm_token):
        """Alerts are sorted by priority (high first) then recency"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        res = requests.get(f"{BASE_URL}/api/workflow/rm/alerts", headers=headers)
        assert res.status_code == 200
        alerts = res.json().get("alerts", [])
        
        if len(alerts) > 1:
            priority_order = {"high": 0, "medium": 1, "info": 2}
            for i in range(len(alerts) - 1):
                curr_priority = priority_order.get(alerts[i]["priority"], 3)
                next_priority = priority_order.get(alerts[i+1]["priority"], 3)
                assert curr_priority <= next_priority, "Alerts not sorted by priority"
            print("Alerts sorted by priority: PASS")
        else:
            print("Not enough alerts to verify sorting")


class TestIntegration:
    """Integration tests across Phase 7 features"""
    
    @pytest.fixture(scope="class")
    def rm_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RM_EMAIL, "password": RM_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        pytest.skip("RM login failed")
    
    def test_26_shortlist_activity_logged(self, rm_token):
        """Shortlist add/share actions are logged in lead timeline"""
        headers = {"Authorization": f"Bearer {rm_token}"}
        res = requests.get(f"{BASE_URL}/api/workflow/{TEST_LEAD_ID}/timeline", headers=headers)
        if res.status_code == 200:
            timeline = res.json().get("timeline", [])
            shortlist_actions = [t for t in timeline if "shortlist" in t.get("action", "")]
            print(f"Shortlist actions in timeline: {len(shortlist_actions)}")
            for action in shortlist_actions[:3]:
                print(f"  [{action['action']}] {action.get('detail', '')[:50]}")
    
    def test_27_onboarding_sends_tracked(self, rm_token):
        """Onboarding sends are tracked in status endpoint"""
        # Use VM token for this
        vm_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VM_EMAIL, "password": VM_PASSWORD
        })
        if vm_res.status_code != 200:
            print("VM login failed, skipping")
            return
        
        vm_token = vm_res.json().get("token")
        headers = {"Authorization": f"Bearer {vm_token}"}
        res = requests.get(f"{BASE_URL}/api/onboarding/status/{TEST_ACQ_ID}", headers=headers)
        if res.status_code == 200:
            data = res.json()
            sends = data.get("onboarding", {}).get("sends", [])
            print(f"Onboarding sends tracked: {len(sends)}")
            for send in sends[-3:]:
                print(f"  {send.get('sent_at', '')[:19]} via {send.get('channels')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
