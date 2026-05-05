# =============================================================================
# Multi-Stage Dockerfile — Flask Application
# =============================================================================
#
# LAYER ORDERING STRATEGY (cache optimisation):
#
#   Layers are ordered from least-frequently-changed to most-frequently-changed.
#   Docker invalidates a layer's cache the moment any instruction in that layer
#   changes — and every layer AFTER it is also invalidated.
#
#   Change frequency (slowest → fastest):
#     1. Base image          — almost never changes
#     2. System packages     — rarely changes
#     3. requirements.txt    — changes when a dependency is added/updated
#     4. Application code    — changes on every commit
#
#   By copying requirements.txt BEFORE copying application code, a code-only
#   change does NOT invalidate the pip install layer. Dependencies are served
#   from cache, and only the COPY app/ layer and below are rebuilt.
#
# MULTI-STAGE BUILD:
#   Stage 1 (builder) — installs ALL dependencies (including dev/test tools)
#                        into an isolated prefix directory.
#   Stage 2 (runtime) — copies ONLY the runtime packages from the builder.
#                        Dev tools (pytest, flake8, pylint) are never present
#                        in the final image, keeping it small and secure.
# =============================================================================


# -----------------------------------------------------------------------------
# Stage 1 — Builder
#
# Purpose: install Python dependencies in an isolated layer.
# This stage is discarded after the build; none of its tools reach production.
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

# Set a working directory for the build stage
WORKDIR /build

# ── System-level build dependencies ──────────────────────────────────────────
# Install any C-extension build tools here (none needed for this project, but
# the pattern is shown for reference). Combining apt-get update + install in a
# single RUN keeps them in one layer and avoids stale package-list caches.
# `--no-install-recommends` skips optional packages to reduce layer size.
# `rm -rf /var/lib/apt/lists/*` removes the package index after installation
# so it does not bloat the image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
    && rm -rf /var/lib/apt/lists/*

# ── Dependency installation (cache-optimised) ─────────────────────────────────
# CRITICAL CACHE RULE: Copy requirements.txt BEFORE copying application code.
#
# Why this matters:
#   If application code (app/) were copied first, any code change would
#   invalidate this layer and force a full `pip install` on every build.
#   By copying only requirements.txt here, Docker can reuse this cached layer
#   on every build where requirements.txt has NOT changed — even if app/ has.
#
# --prefix=/install  → installs packages into /install instead of the system
#                      Python, making it easy to COPY just this directory into
#                      the runtime stage without carrying over build tools.
# --no-cache-dir     → pip's HTTP cache is not useful inside a Docker build
#                      (each build starts fresh); skipping it saves disk space.
COPY requirements.txt .

RUN pip install --upgrade pip --no-cache-dir \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# -----------------------------------------------------------------------------
# Stage 2 — Runtime image
#
# Purpose: produce the smallest possible image that can run the application.
# Starts from the same slim base — no build tools, no pip cache, no dev deps.
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# ── Non-root user ─────────────────────────────────────────────────────────────
# Running as root inside a container is a security risk. If the process is
# compromised, an attacker gains root-level access to the container filesystem.
# Creating a dedicated user limits the blast radius of any exploit.
RUN useradd --create-home --shell /bin/bash appuser

# Set the working directory for the application
WORKDIR /app

# ── Copy runtime packages from the builder stage ──────────────────────────────
# Only the packages installed under /install are copied — NOT pip itself,
# NOT the build tools (gcc), and NOT dev/test packages (pytest, flake8, pylint).
# This is the key benefit of multi-stage builds: the final image contains only
# what is needed to run the application.
COPY --from=builder /install /usr/local

# ── Copy application source code ──────────────────────────────────────────────
# --chown=appuser:appuser sets ownership at copy time, avoiding a separate
# `RUN chown -R appuser:appuser /app` layer (which would double the layer size
# because Docker stores both the old and new ownership in the layer diff).
#
# This COPY is intentionally placed LAST among the COPY instructions.
# Application code changes on every commit; placing it last means only this
# layer and the layers below it are invalidated on a code change — the
# dependency layer above is served from cache.
COPY --chown=appuser:appuser app/ ./app/

# ── Switch to non-root user ───────────────────────────────────────────────────
# All instructions after this line run as appuser, including CMD.
# The USER instruction itself does not create a new filesystem layer of
# significance — it only changes the metadata for subsequent instructions.
USER appuser

# ── Expose the application port ───────────────────────────────────────────────
# EXPOSE is documentation — it tells Docker (and humans) which port the
# container listens on. It does NOT publish the port to the host; that is done
# with `docker run -p 8080:8080` or via the Kubernetes Service manifest.
EXPOSE 8080

# ── Health check ──────────────────────────────────────────────────────────────
# Docker's built-in health check polls the /health endpoint every 30 seconds.
# A container is marked "unhealthy" after 3 consecutive failures.
# Kubernetes uses its own liveness/readiness probes (defined in deployment.yaml)
# but this HEALTHCHECK is useful for `docker run` and docker-compose workflows.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

# ── Start the application with Gunicorn ───────────────────────────────────────
# Gunicorn is a production-grade WSGI server. Flask's built-in dev server
# (`python -m flask run`) is single-threaded and not suitable for production.
#
# Flags:
#   --workers 2          → 2 worker processes (rule of thumb: 2 × CPU cores + 1;
#                          kept low here to match the 250m CPU limit in k8s)
#   --bind 0.0.0.0:8080  → listen on all interfaces on port 8080
#   --access-logfile -   → write access logs to stdout (captured by Docker/k8s)
#   --error-logfile -    → write error logs to stderr
#   app.main:app         → the WSGI callable: module `app.main`, variable `app`
CMD ["gunicorn", \
     "--workers", "2", \
     "--bind", "0.0.0.0:8080", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app.main:app"]
