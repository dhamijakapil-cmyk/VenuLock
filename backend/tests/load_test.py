"""
VenuLoQ Load Test Plan — Phase 17
Run with: locust -f /app/backend/tests/load_test.py --headless -u 100 -r 10 -t 60s --host=http://localhost:8001

Scenarios:
1. Burst enquiry submission (100 concurrent)
2. RM availability checks (burst)
3. Customer case portal reads
4. Communication thread access
5. RM dashboard lead list
6. Payment request flow
"""
import random
import string
import json
from locust import HttpUser, task, between, tag


def random_phone():
    return f"9{''.join(random.choices(string.digits, k=9))}"


def random_email():
    return f"load_test_{''.join(random.choices(string.ascii_lowercase, k=6))}@test.com"


class EnquiryBurstUser(HttpUser):
    """Simulates burst enquiry submissions — target: 100 concurrent."""
    wait_time = between(0.1, 0.5)
    weight = 4

    @tag("enquiry")
    @task(10)
    def submit_enquiry(self):
        payload = {
            "customer_name": f"Load Test User {random.randint(1,10000)}",
            "customer_email": random_email(),
            "customer_phone": random_phone(),
            "city": random.choice(["Mumbai", "Delhi", "Bangalore", "Chennai"]),
            "event_type": random.choice(["Wedding", "Corporate Event", "Birthday", "Engagement"]),
            "guest_count": random.randint(50, 500),
            "source": "load_test",
        }
        self.client.post(
            "/api/leads",
            json=payload,
            headers={"Content-Type": "application/json"},
            name="/api/leads [POST]",
        )

    @tag("rm_availability")
    @task(8)
    def check_rm_availability(self):
        city = random.choice(["Mumbai", "Delhi", "Bangalore"])
        self.client.get(
            f"/api/rms/available?city={city}&limit=3",
            name="/api/rms/available [GET]",
        )

    @tag("rm_validate")
    @task(3)
    def validate_rm(self):
        self.client.post(
            "/api/rms/validate-selection",
            json={"rm_id": "user_nonexistent"},
            headers={"Content-Type": "application/json"},
            name="/api/rms/validate-selection [POST]",
        )


class CasePortalUser(HttpUser):
    """Simulates customer portal activity."""
    wait_time = between(1, 3)
    weight = 2
    token = None

    def on_start(self):
        # Login as customer
        resp = self.client.post("/api/auth/login", json={
            "email": "democustomer@venulock.in",
            "password": "password123",
        })
        if resp.status_code == 200:
            self.token = resp.json().get("token")

    def _headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @tag("case_list")
    @task(5)
    def get_cases(self):
        self.client.get("/api/case-portal/cases", headers=self._headers(), name="/api/case-portal/cases [GET]")

    @tag("case_detail")
    @task(3)
    def get_case_detail(self):
        # This will 404 with fake ID but measures route processing time
        self.client.get("/api/case-portal/cases/lead_test123", headers=self._headers(), name="/api/case-portal/cases/{id} [GET]")


class RMDashboardUser(HttpUser):
    """Simulates RM dashboard activity."""
    wait_time = between(1, 5)
    weight = 2
    token = None

    def on_start(self):
        resp = self.client.post("/api/auth/login", json={
            "email": "rm1@venulock.in",
            "password": "rm123",
        })
        if resp.status_code == 200:
            self.token = resp.json().get("token")

    def _headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @tag("rm_leads")
    @task(5)
    def get_leads(self):
        self.client.get("/api/leads", headers=self._headers(), name="/api/leads [GET]")

    @tag("rm_notifications")
    @task(3)
    def get_notifications(self):
        self.client.get("/api/notifications?limit=20", headers=self._headers(), name="/api/notifications [GET]")


# ════════════════════════════════════════════════════════
# LOAD TEST PLAN — Target Metrics
# ════════════════════════════════════════════════════════
#
# Scenario 1: 100 concurrent enquiry submissions
#   Target: All 100 complete within 5s
#   Pass: p95 < 2000ms, 0% 5xx errors
#   Bottleneck: MongoDB write throughput, RM availability query
#
# Scenario 2: Burst RM availability checks  
#   Target: 300 checks in 60s
#   Pass: p95 < 500ms
#   Bottleneck: leads.count_documents per RM (now indexed)
#
# Scenario 3: Customer case portal reads
#   Target: 50 concurrent reads
#   Pass: p95 < 1000ms
#   Bottleneck: case_shares + case_messages queries (now indexed + paginated)
#
# Scenario 4: RM dashboard lead list
#   Target: 20 concurrent RMs loading dashboard
#   Pass: p95 < 1500ms
#   Bottleneck: leads query with notification batch (N+1 fixed)
#
# Scenario 5: Payment request load
#   Target: 50 payment requests in 60s
#   Pass: p95 < 2000ms
#   Bottleneck: Razorpay API call (external dependency)
#
# Scenario 6: Communication thread load
#   Target: 100 thread reads in 60s
#   Pass: p95 < 500ms
#   Bottleneck: case_messages sort by created_at (now indexed)
