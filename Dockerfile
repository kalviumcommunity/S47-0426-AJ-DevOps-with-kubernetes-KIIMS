# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder
# Installs dependencies in an isolated layer so they are cached separately
# from application code. Rebuilds only when requirements.txt changes.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Copy only the dependency manifest first — Docker layer cache means this
# layer is only invalidated when requirements.txt actually changes.
COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime image
# Copies only the installed packages and application code into a clean image.
# The builder stage is discarded — no build tools or pip cache in the final image.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Run as a non-root user — principle of least privilege
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Copy installed packages from the builder stage
COPY --from=builder /install /usr/local

# Copy application source code
COPY app/ ./app/

# Switch to non-root user before starting the process
USER appuser

# Expose the port the application listens on
EXPOSE 8080

# Health check — Kubernetes liveness/readiness probes can also use this endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

# Start the application
CMD ["python", "-m", "app.main"]
