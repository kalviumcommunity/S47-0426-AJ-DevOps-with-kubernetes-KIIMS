"""
Sprint 3 — Sample Flask application.

This is a minimal application used to demonstrate the CI/CD pipeline.
It exposes two endpoints that the Kubernetes health probes check:
  /health  — liveness probe target
  /ready   — readiness probe target
"""

import os
from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/health")
def health():
    """Liveness probe endpoint. Returns 200 as long as the process is alive."""
    return jsonify({"status": "ok"}), 200


@app.route("/ready")
def ready():
    """
    Readiness probe endpoint.
    In a real application this would check database connectivity,
    cache availability, or any other dependency required to serve traffic.
    """
    return jsonify({"status": "ready"}), 200


@app.route("/")
def index():
    """Root endpoint — returns a simple greeting."""
    return jsonify({
        "message": "Sprint 3 — DevOps with Kubernetes & CI/CD",
        "version": os.getenv("APP_VERSION", "dev"),
    }), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
