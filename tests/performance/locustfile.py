"""
Doctify Performance Testing with Locust

This module contains Locust load testing scenarios for the Doctify application.
Simulates realistic user behavior patterns including authentication, document
upload, processing, and retrieval.

Usage:
    # Basic load test (Web UI)
    locust -f tests/performance/locustfile.py --host http://localhost:8000

    # Headless mode (100 users, 10/second spawn rate, 5 minutes)
    locust -f tests/performance/locustfile.py \
           --host http://localhost:8000 \
           --users 100 \
           --spawn-rate 10 \
           --run-time 5m \
           --headless

    # Distributed load test (master)
    locust -f tests/performance/locustfile.py \
           --host http://localhost:8000 \
           --master

    # Distributed load test (worker)
    locust -f tests/performance/locustfile.py \
           --worker --master-host=localhost
"""

import json
import random
import time
from typing import Optional

from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser


# ============================================================================
# Test Data
# ============================================================================

# Sample test users (create these in your test database)
TEST_USERS = [
    {"email": f"test_user_{i}@example.com", "password": "TestPassword123!"}
    for i in range(1, 11)
]

# Sample document metadata
SAMPLE_DOCUMENTS = [
    {"title": "Invoice 2024-001", "category": "invoice"},
    {"title": "Contract Agreement", "category": "contract"},
    {"title": "Receipt 2024-Q1", "category": "receipt"},
    {"title": "Business Proposal", "category": "proposal"},
    {"title": "Meeting Notes", "category": "notes"},
]

# Sample project data
SAMPLE_PROJECTS = [
    {"name": "Q1 Financial Documents", "description": "All Q1 invoices and receipts"},
    {"name": "Legal Contracts", "description": "Contract repository"},
    {"name": "Client Projects", "description": "Client-related documents"},
]


# ============================================================================
# Performance Metrics Collection
# ============================================================================

# Store custom metrics
request_times = []
error_count = 0
success_count = 0


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Track request metrics for analysis."""
    global error_count, success_count, request_times

    if exception:
        error_count += 1
    else:
        success_count += 1
        request_times.append(response_time)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Generate performance report on test completion."""
    if request_times:
        avg_response_time = sum(request_times) / len(request_times)
        p95_response_time = sorted(request_times)[int(len(request_times) * 0.95)]
        p99_response_time = sorted(request_times)[int(len(request_times) * 0.99)]

        print("\n" + "=" * 80)
        print("PERFORMANCE SUMMARY")
        print("=" * 80)
        print(f"Total Requests: {len(request_times)}")
        print(f"Successful: {success_count}")
        print(f"Failed: {error_count}")
        print(f"Average Response Time: {avg_response_time:.2f}ms")
        print(f"P95 Response Time: {p95_response_time:.2f}ms")
        print(f"P99 Response Time: {p99_response_time:.2f}ms")
        print(f"Success Rate: {(success_count / (success_count + error_count) * 100):.2f}%")
        print("=" * 80 + "\n")


# ============================================================================
# Base User Class
# ============================================================================

class DoctifyUser(FastHttpUser):
    """
    Base user class for Doctify performance testing.

    Uses FastHttpUser for better performance (uses geventhttpclient instead
    of requests library).
    """

    # Wait time between tasks (realistic user behavior)
    wait_time = between(1, 5)  # 1-5 seconds between actions

    # Session data
    access_token: Optional[str] = None
    user_id: Optional[str] = None
    document_ids: list = []
    project_ids: list = []

    def on_start(self):
        """
        Called when a user starts.
        Performs authentication to get access token.
        """
        # Select random test user
        self.user_data = random.choice(TEST_USERS)

        # Authenticate
        self.login()

    def login(self):
        """Authenticate and obtain access token."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": self.user_data["email"],
                "password": self.user_data["password"],
            },
            name="/api/v1/auth/login",
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get("access_token")
            self.user_id = data.get("user_id")

    def get_headers(self) -> dict:
        """Get authenticated request headers."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }


# ============================================================================
# User Behavior Scenarios
# ============================================================================

class ReadOnlyUser(DoctifyUser):
    """
    User that only reads documents and projects.

    Simulates users who primarily view and search documents
    without creating or modifying them. (~60% of users)
    """

    weight = 6  # 60% of users

    @task(5)
    def list_documents(self):
        """List user's documents with pagination."""
        page = random.randint(1, 10)
        self.client.get(
            f"/api/v1/documents?page={page}&limit=20",
            headers=self.get_headers(),
            name="/api/v1/documents [list]",
        )

    @task(3)
    def get_document(self):
        """Get a specific document by ID."""
        if self.document_ids:
            doc_id = random.choice(self.document_ids)
            self.client.get(
                f"/api/v1/documents/{doc_id}",
                headers=self.get_headers(),
                name="/api/v1/documents/{id} [get]",
            )

    @task(2)
    def search_documents(self):
        """Search documents by query."""
        queries = ["invoice", "contract", "2024", "Q1", "receipt"]
        query = random.choice(queries)
        self.client.get(
            f"/api/v1/documents/search?q={query}",
            headers=self.get_headers(),
            name="/api/v1/documents/search",
        )

    @task(1)
    def list_projects(self):
        """List user's projects."""
        self.client.get(
            "/api/v1/projects",
            headers=self.get_headers(),
            name="/api/v1/projects [list]",
        )

    @task(1)
    def get_project(self):
        """Get a specific project."""
        if self.project_ids:
            project_id = random.choice(self.project_ids)
            self.client.get(
                f"/api/v1/projects/{project_id}",
                headers=self.get_headers(),
                name="/api/v1/projects/{id} [get]",
            )


class ActiveUser(DoctifyUser):
    """
    User that creates, modifies, and reads documents.

    Simulates users who actively manage documents including
    uploads, updates, and organization. (~30% of users)
    """

    weight = 3  # 30% of users

    @task(4)
    def list_documents(self):
        """List user's documents."""
        self.client.get(
            "/api/v1/documents?limit=20",
            headers=self.get_headers(),
            name="/api/v1/documents [list]",
        )

    @task(2)
    def create_document(self):
        """Upload a new document."""
        doc_data = random.choice(SAMPLE_DOCUMENTS)

        # Simulate file upload
        files = {
            "file": ("test_document.pdf", b"fake_pdf_content", "application/pdf")
        }
        data = {
            "title": doc_data["title"],
            "category": doc_data["category"],
        }

        response = self.client.post(
            "/api/v1/documents/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {self.access_token}"},
            name="/api/v1/documents/upload",
        )

        if response.status_code == 201:
            doc_id = response.json().get("id")
            if doc_id:
                self.document_ids.append(doc_id)

    @task(1)
    def update_document(self):
        """Update document metadata."""
        if self.document_ids:
            doc_id = random.choice(self.document_ids)
            self.client.patch(
                f"/api/v1/documents/{doc_id}",
                json={
                    "title": f"Updated Document {random.randint(1, 1000)}",
                },
                headers=self.get_headers(),
                name="/api/v1/documents/{id} [update]",
            )

    @task(1)
    def create_project(self):
        """Create a new project."""
        project_data = random.choice(SAMPLE_PROJECTS)

        response = self.client.post(
            "/api/v1/projects",
            json={
                "name": project_data["name"],
                "description": project_data["description"],
            },
            headers=self.get_headers(),
            name="/api/v1/projects [create]",
        )

        if response.status_code == 201:
            project_id = response.json().get("id")
            if project_id:
                self.project_ids.append(project_id)

    @task(1)
    def add_document_to_project(self):
        """Add document to project."""
        if self.document_ids and self.project_ids:
            doc_id = random.choice(self.document_ids)
            project_id = random.choice(self.project_ids)

            self.client.post(
                f"/api/v1/projects/{project_id}/documents",
                json={"document_id": doc_id},
                headers=self.get_headers(),
                name="/api/v1/projects/{id}/documents [add]",
            )


class PowerUser(DoctifyUser):
    """
    User that performs intensive operations.

    Simulates users who perform bulk operations, exports,
    and advanced features. (~10% of users)
    """

    weight = 1  # 10% of users

    @task(3)
    def list_documents(self):
        """List documents with large page size."""
        self.client.get(
            "/api/v1/documents?limit=100",
            headers=self.get_headers(),
            name="/api/v1/documents [list large]",
        )

    @task(2)
    def export_document(self):
        """Export document to different format."""
        if self.document_ids:
            doc_id = random.choice(self.document_ids)
            export_format = random.choice(["pdf", "docx", "txt"])

            self.client.post(
                f"/api/v1/documents/{doc_id}/export",
                json={"format": export_format},
                headers=self.get_headers(),
                name="/api/v1/documents/{id}/export",
            )

    @task(1)
    def bulk_process_documents(self):
        """Process multiple documents."""
        if len(self.document_ids) >= 3:
            doc_ids = random.sample(self.document_ids, 3)

            self.client.post(
                "/api/v1/documents/bulk-process",
                json={"document_ids": doc_ids},
                headers=self.get_headers(),
                name="/api/v1/documents/bulk-process",
            )

    @task(1)
    def advanced_search(self):
        """Perform advanced search with filters."""
        self.client.post(
            "/api/v1/documents/search/advanced",
            json={
                "query": "invoice",
                "filters": {
                    "date_from": "2024-01-01",
                    "date_to": "2024-12-31",
                    "category": "invoice",
                },
            },
            headers=self.get_headers(),
            name="/api/v1/documents/search/advanced",
        )


# ============================================================================
# Stress Test Scenario
# ============================================================================

class StressTestUser(DoctifyUser):
    """
    User for stress testing - hits all endpoints rapidly.

    Use this class separately for stress testing to identify
    system breaking points.
    """

    wait_time = between(0.1, 0.5)  # Very short wait time

    @task(10)
    def rapid_list_requests(self):
        """Rapid-fire list requests."""
        self.client.get(
            "/api/v1/documents?limit=10",
            headers=self.get_headers(),
            name="/api/v1/documents [stress]",
        )

    @task(5)
    def rapid_get_requests(self):
        """Rapid-fire get requests."""
        if self.document_ids:
            doc_id = random.choice(self.document_ids)
            self.client.get(
                f"/api/v1/documents/{doc_id}",
                headers=self.get_headers(),
                name="/api/v1/documents/{id} [stress]",
            )

    @task(3)
    def rapid_search_requests(self):
        """Rapid-fire search requests."""
        query = random.choice(["test", "document", "2024"])
        self.client.get(
            f"/api/v1/documents/search?q={query}",
            headers=self.get_headers(),
            name="/api/v1/documents/search [stress]",
        )


# ============================================================================
# Health Check User (for smoke testing)
# ============================================================================

class HealthCheckUser(HttpUser):
    """
    Simple health check user for smoke testing.

    Use this to verify the application is responding before
    running full load tests.
    """

    wait_time = between(1, 2)

    @task
    def health_check(self):
        """Check application health endpoint."""
        self.client.get("/health", name="/health")

    @task
    def root_endpoint(self):
        """Check root endpoint."""
        self.client.get("/", name="/")


# ============================================================================
# Custom Shape Classes (for advanced load patterns)
# ============================================================================

from locust import LoadTestShape


class StepLoadShape(LoadTestShape):
    """
    Step load pattern - gradually increases load in steps.

    Useful for finding the breaking point by incrementally
    increasing the number of users.
    """

    step_time = 60  # Each step lasts 60 seconds
    step_load = 10  # Increase by 10 users each step
    spawn_rate = 5
    time_limit = 600  # Total test duration: 10 minutes

    def tick(self):
        run_time = self.get_run_time()

        if run_time > self.time_limit:
            return None

        current_step = run_time // self.step_time
        return (current_step + 1) * self.step_load, self.spawn_rate


class SpikeLoadShape(LoadTestShape):
    """
    Spike load pattern - simulates sudden traffic spikes.

    Useful for testing how the system handles sudden load increases.
    """

    time_limit = 300  # 5 minutes total

    def tick(self):
        run_time = self.get_run_time()

        if run_time > self.time_limit:
            return None

        # Spike pattern: low -> high -> low
        if run_time < 60:
            return 10, 5  # Baseline: 10 users
        elif run_time < 120:
            return 100, 20  # Spike: 100 users
        elif run_time < 180:
            return 10, 5  # Back to baseline
        elif run_time < 240:
            return 150, 30  # Larger spike
        else:
            return 10, 5  # Back to baseline
