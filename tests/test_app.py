"""
Unit tests for the Sprint 3 Flask application.

These tests are executed by the CI pipeline (Stage 2 — Test).
They must pass before the Docker image is built or any deployment occurs.
"""

import pytest
from app.main import app


@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


class TestHealthEndpoint:
    """Tests for the /health liveness probe endpoint."""

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_ok_status(self, client):
        response = client.get("/health")
        data = response.get_json()
        assert data["status"] == "ok"


class TestReadyEndpoint:
    """Tests for the /ready readiness probe endpoint."""

    def test_ready_returns_200(self, client):
        response = client.get("/ready")
        assert response.status_code == 200

    def test_ready_returns_ready_status(self, client):
        response = client.get("/ready")
        data = response.get_json()
        assert data["status"] == "ready"


class TestIndexEndpoint:
    """Tests for the root / endpoint."""

    def test_index_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_index_returns_message(self, client):
        response = client.get("/")
        data = response.get_json()
        assert "message" in data
        assert "Sprint 3" in data["message"]

    def test_index_returns_version(self, client):
        response = client.get("/")
        data = response.get_json()
        assert "version" in data
