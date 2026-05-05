"""
Sprint 3 — Sample Flask application.

This is a minimal application used to demonstrate the CI/CD pipeline.
It exposes endpoints that the Kubernetes health probes check:
  /health  — liveness probe target
  /ready   — readiness probe target
  /        — root endpoint

Structured JSON logging is used so log aggregation tools (e.g. Loki,
CloudWatch, Datadog) can parse and index log fields without regex.
"""

import logging
import os
import sys
from flask import Flask, jsonify

# ── Structured logging setup ──────────────────────────────────────────────────
# Emit JSON-formatted log lines so log aggregators can parse fields directly.
# Format: {"level": "INFO", "message": "...", "logger": "app.main"}
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='{"level": "%(levelname)s", "message": "%(message)s", "logger": "%(name)s"}',
)
logger = logging.getLogger(__name__)

app = Flask(__name__)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health")
def health():
    """Liveness probe endpoint. Returns 200 as long as the process is alive."""
    logger.info("liveness probe called")
    return jsonify({"status": "ok"}), 200


@app.route("/ready")
def ready():
    """
    Readiness probe endpoint.
    In a real application this would check database connectivity,
    cache availability, or any other dependency required to serve traffic.
    """
    logger.info("readiness probe called")
    return jsonify({"status": "ready"}), 200


@app.route("/")
def index():
    """Root endpoint — returns a simple greeting."""
    version = os.getenv("APP_VERSION", "dev")
    logger.info("index endpoint called, version=%s", version)
    return jsonify({
        "message": "Sprint 3 — DevOps with Kubernetes & CI/CD",
        "version": version,
    }), 200


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(error):  # pylint: disable=unused-argument
    """Return a JSON 404 instead of Flask's default HTML page."""
    logger.warning("404 not found: %s", error)
    return jsonify({"error": "not found"}), 404


@app.errorhandler(405)
def method_not_allowed(error):  # pylint: disable=unused-argument
    """Return a JSON 405 instead of Flask's default HTML page."""
    logger.warning("405 method not allowed: %s", error)
    return jsonify({"error": "method not allowed"}), 405


@app.errorhandler(500)
def internal_error(error):  # pylint: disable=unused-argument
    """Return a JSON 500 and log the exception for observability."""
    logger.error("500 internal server error: %s", error)
    return jsonify({"error": "internal server error"}), 500


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    logger.info("starting app on port %d", port)
    app.run(host="0.0.0.0", port=port)
