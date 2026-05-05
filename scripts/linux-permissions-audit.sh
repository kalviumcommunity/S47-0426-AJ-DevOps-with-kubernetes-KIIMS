#!/usr/bin/env bash
# =============================================================================
# linux-permissions-audit.sh
#
# Purpose:
#   Demonstrate Linux filesystem navigation, permission management, and basic
#   system inspection as part of a DevOps workflow for this Flask/Kubernetes
#   project.
#
# Usage:
#   chmod +x scripts/linux-permissions-audit.sh
#   ./scripts/linux-permissions-audit.sh
#
# What this script covers:
#   1. Filesystem navigation & structure inspection
#   2. File permission auditing (read, write, execute bits)
#   3. Ownership inspection (user/group)
#   4. Fixing common permission problems safely
#   5. Process inspection (who is running what)
#   6. Network port inspection (is the app actually listening?)
#   7. Diagnosing a "permission denied" deployment failure scenario
#
# All commands are annotated so the script doubles as a reference guide.
# =============================================================================

set -euo pipefail   # Exit on error, treat unset vars as errors, propagate pipe failures
IFS=$'\n\t'         # Safer word splitting

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

section() { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════${RESET}"; \
            echo -e "${BOLD}${CYAN}  $1${RESET}"; \
            echo -e "${BOLD}${CYAN}══════════════════════════════════════════${RESET}"; }
info()    { echo -e "${GREEN}[INFO]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }
cmd_echo(){ echo -e "${YELLOW}\$${RESET} $*"; }

# ── Resolve project root (directory containing this script's parent) ───────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BOLD}Linux Filesystem & Permissions Audit${RESET}"
echo -e "Project root: ${PROJECT_ROOT}"
echo -e "Running as user: $(whoami)  |  UID=$(id -u)  GID=$(id -g)"
echo -e "Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"


# =============================================================================
# SECTION 1 — Filesystem Navigation & Structure Inspection
# =============================================================================
section "1. Filesystem Navigation & Structure Inspection"

info "Print working directory (pwd) — confirms where we are in the filesystem"
cmd_echo "pwd"
pwd

info "List project root with long format, hidden files, human-readable sizes"
info "  -l  long listing   -a  include hidden   -h  human-readable sizes"
cmd_echo "ls -lah ${PROJECT_ROOT}"
ls -lah "${PROJECT_ROOT}"

info "Recursive tree of the project (depth 3) — understand directory layout"
info "  find replaces 'tree' which may not be installed on all systems"
cmd_echo "find ${PROJECT_ROOT} -maxdepth 3 -not -path '*/.git/*' -not -path '*/__pycache__/*' | sort"
find "${PROJECT_ROOT}" -maxdepth 3 \
    -not -path '*/.git/*' \
    -not -path '*/__pycache__/*' \
    | sort

info "Show disk usage of each top-level directory (useful before a Docker build)"
info "  du -sh  summarise size in human-readable form"
cmd_echo "du -sh ${PROJECT_ROOT}/*/"
du -sh "${PROJECT_ROOT}"/*/  2>/dev/null || true

info "Check available disk space on the filesystem hosting the project"
cmd_echo "df -h ${PROJECT_ROOT}"
df -h "${PROJECT_ROOT}"


# =============================================================================
# SECTION 2 — File Permission Auditing
# =============================================================================
section "2. File Permission Auditing"

info "Show permissions of every file in app/ and scripts/ using stat"
info "  stat -c '%A %U %G %n'  → symbolic mode, owner, group, filename"
cmd_echo "stat -c '%A %U %G %n' \$(find ${PROJECT_ROOT}/app ${PROJECT_ROOT}/scripts -type f)"
find "${PROJECT_ROOT}/app" "${PROJECT_ROOT}/scripts" -type f \
    -exec stat -c '%A %U %G %n' {} \;

info "Identify files that are world-writable (a security risk in production)"
info "  -perm -o+w  matches any file where 'others' have write permission"
cmd_echo "find ${PROJECT_ROOT} -not -path '*/.git/*' -perm -o+w -type f"
WORLD_WRITABLE=$(find "${PROJECT_ROOT}" -not -path '*/.git/*' -perm -o+w -type f 2>/dev/null)
if [[ -z "${WORLD_WRITABLE}" ]]; then
    info "No world-writable files found — good."
else
    warn "World-writable files detected:"
    echo "${WORLD_WRITABLE}"
fi

info "Identify files with the SUID/SGID bit set (potential privilege escalation)"
cmd_echo "find ${PROJECT_ROOT} -not -path '*/.git/*' \\( -perm -4000 -o -perm -2000 \\) -type f"
SUID_FILES=$(find "${PROJECT_ROOT}" -not -path '*/.git/*' \( -perm -4000 -o -perm -2000 \) -type f 2>/dev/null || true)
if [[ -z "${SUID_FILES}" ]]; then
    info "No SUID/SGID files found — good."
else
    warn "SUID/SGID files detected:"
    echo "${SUID_FILES}"
fi

info "Check that the Dockerfile is NOT executable (it is a config file, not a script)"
DOCKERFILE="${PROJECT_ROOT}/Dockerfile"
if [[ -x "${DOCKERFILE}" ]]; then
    warn "Dockerfile has execute bit set — this is unusual and should be reviewed."
else
    info "Dockerfile is not executable — correct."
fi

info "Verify the entrypoint script IS executable (required for Docker CMD / ENTRYPOINT)"
ENTRYPOINT="${PROJECT_ROOT}/scripts/linux-permissions-audit.sh"
if [[ -x "${ENTRYPOINT}" ]]; then
    info "Audit script is executable — correct."
else
    warn "Audit script is NOT executable. Fix with: chmod +x ${ENTRYPOINT}"
fi


# =============================================================================
# SECTION 3 — Ownership Inspection
# =============================================================================
section "3. Ownership Inspection"

info "Show owner and group of all Python source files"
info "  In a container the owner should be 'appuser', not 'root'"
cmd_echo "find ${PROJECT_ROOT}/app -name '*.py' -exec stat -c '%U:%G  %n' {} \\;"
find "${PROJECT_ROOT}/app" -name '*.py' -exec stat -c '%U:%G  %n' {} \;

info "Show current user identity — critical when debugging 'permission denied' errors"
cmd_echo "id"
id

info "Show all groups the current user belongs to"
cmd_echo "groups"
groups

info "Check /etc/passwd entry for the current user (UID, GID, home dir, shell)"
cmd_echo "getent passwd \$(whoami)"
getent passwd "$(whoami)" 2>/dev/null || info "(getent not available on this system)"


# =============================================================================
# SECTION 4 — Fixing Common Permission Problems Safely
# =============================================================================
section "4. Fixing Common Permission Problems Safely"

info "Demonstrate safe permission patterns for a DevOps project"
echo ""

info "Pattern A — Make a script executable (owner only, not world-executable)"
info "  chmod u+x <file>  adds execute only for the file owner"
info "  Avoid 'chmod 777' — it grants write+execute to everyone on the system"
cmd_echo "chmod u+x scripts/linux-permissions-audit.sh   # owner-only execute"
echo "  (already applied — this script is running)"

info "Pattern B — Restrict a config file to owner read/write only"
info "  chmod 600 <file>  → rw-------  (owner rw, group none, others none)"
info "  Use this for .env files, private keys, kubeconfig"
cmd_echo "chmod 600 <secrets-file>   # example — not applied here"

info "Pattern C — Set directory permissions for a web app"
info "  chmod 755 <dir>  → rwxr-xr-x  (owner rwx, group rx, others rx)"
info "  Directories need execute bit for traversal (cd into them)"
cmd_echo "chmod 755 app/             # example — not applied here"

info "Pattern D — Recursively fix ownership after copying files as root"
info "  chown -R appuser:appuser /app  reassigns all files to the app user"
info "  Always scope chown to the specific directory, never run on /"
cmd_echo "chown -R appuser:appuser /app   # example — run inside container"

info "Pattern E — Use umask to set default permissions for new files"
info "  umask 022  → new files get 644, new dirs get 755"
cmd_echo "umask"
umask

info "Current umask value:"
UMASK_VAL=$(umask)
echo "  umask = ${UMASK_VAL}"
if [[ "${UMASK_VAL}" == "0022" || "${UMASK_VAL}" == "022" ]]; then
    info "umask 022 is set — new files will be 644, directories 755. Good."
else
    warn "Non-standard umask (${UMASK_VAL}). Verify this is intentional."
fi


# =============================================================================
# SECTION 5 — Process Inspection
# =============================================================================
section "5. Process Inspection"

info "List all running processes for the current user"
cmd_echo "ps aux --no-header | grep \$(whoami)"
ps aux --no-header 2>/dev/null | grep "$(whoami)" | grep -v grep || \
    ps -u "$(whoami)" 2>/dev/null || true

info "Check if a Python/Flask process is already running on port 8080"
cmd_echo "ps aux | grep 'python\\|gunicorn\\|flask' | grep -v grep"
ps aux 2>/dev/null | grep -E 'python|gunicorn|flask' | grep -v grep || \
    info "No Python/Flask process currently running."

info "Show process tree for the current shell (useful to see parent-child relationships)"
cmd_echo "pstree -p \$\$  (or ps --ppid \$\$)"
# pstree may not be available everywhere; fall back gracefully
if command -v pstree &>/dev/null; then
    pstree -p $$ 2>/dev/null || true
else
    ps --ppid $$ 2>/dev/null || true
fi


# =============================================================================
# SECTION 6 — Network Port Inspection
# =============================================================================
section "6. Network Port Inspection"

info "Check which process is listening on port 8080 (the Flask app port)"
info "  ss -tlnp  → TCP, listening, numeric, show process"
cmd_echo "ss -tlnp | grep ':8080'"
if command -v ss &>/dev/null; then
    SS_OUT=$(ss -tlnp 2>/dev/null | grep ':8080' || true)
    if [[ -n "${SS_OUT}" ]]; then
        info "Something is listening on port 8080:"
        echo "${SS_OUT}"
    else
        info "Nothing is currently listening on port 8080."
    fi
else
    warn "ss not available — try 'netstat -tlnp | grep :8080' instead"
fi

info "List all listening TCP ports (useful to verify no unexpected services are running)"
cmd_echo "ss -tlnp"
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true

info "Test HTTP connectivity to the app (if it is running)"
cmd_echo "curl -sf http://localhost:8080/health || echo 'App not reachable'"
curl -sf http://localhost:8080/health 2>/dev/null \
    && info "App is reachable at /health" \
    || info "App is not currently running — start it with: python -m app.main"


# =============================================================================
# SECTION 7 — Diagnosing a Deployment Failure: Permission Denied Scenario
# =============================================================================
section "7. Diagnosing a 'Permission Denied' Deployment Failure"

info "Scenario: A deployment or automation script fails because it cannot"
info "access or execute a required file, even though the file exists."
echo ""

info "Step 1 — Confirm the file exists and check its permissions"
info "  ls -l shows the permission string, owner, and group"
cmd_echo "ls -l scripts/linux-permissions-audit.sh"
ls -l "${SCRIPT_DIR}/linux-permissions-audit.sh"

info "Step 2 — Read the permission string"
info "  Example: -rwxr--r-- 1 appuser appgroup"
info "  Position 1    : file type (- = regular file, d = directory)"
info "  Positions 2-4 : owner permissions (r=read w=write x=execute)"
info "  Positions 5-7 : group permissions"
info "  Positions 8-10: others permissions"

info "Step 3 — Check who is trying to run the file"
cmd_echo "whoami && id"
whoami && id

info "Step 4 — Use stat for full detail (permissions in octal + symbolic)"
cmd_echo "stat scripts/linux-permissions-audit.sh"
stat "${SCRIPT_DIR}/linux-permissions-audit.sh"

info "Step 5 — Check if the file is on a noexec-mounted filesystem"
info "  A filesystem mounted with 'noexec' prevents execution of any binary"
cmd_echo "findmnt -T scripts/linux-permissions-audit.sh"
if command -v findmnt &>/dev/null; then
    findmnt -T "${SCRIPT_DIR}/linux-permissions-audit.sh" 2>/dev/null || true
else
    warn "findmnt not available — check /proc/mounts manually"
fi

info "Step 6 — Check for SELinux or AppArmor denials (if applicable)"
cmd_echo "getenforce 2>/dev/null || aa-status 2>/dev/null || echo 'No MAC framework detected'"
getenforce 2>/dev/null || aa-status 2>/dev/null || info "No SELinux/AppArmor detected on this system."

info "Step 7 — Fix: add execute permission for the owner only"
cmd_echo "chmod u+x scripts/linux-permissions-audit.sh"
info "  (already executable — no change needed)"

info "Step 8 — Fix: correct ownership if the file is owned by root but run as appuser"
cmd_echo "sudo chown appuser:appuser scripts/linux-permissions-audit.sh"
info "  (run this inside the container or as a privileged user)"

info "Step 9 — Verify the fix"
cmd_echo "ls -l scripts/linux-permissions-audit.sh"
ls -l "${SCRIPT_DIR}/linux-permissions-audit.sh"

echo ""
info "Summary of the diagnostic workflow:"
echo "  1. ls -l / stat   → see current permissions and ownership"
echo "  2. id / whoami    → confirm which user is running the process"
echo "  3. findmnt        → rule out noexec mount options"
echo "  4. getenforce     → rule out SELinux/AppArmor denials"
echo "  5. chmod u+x      → add execute bit (owner only, not 777)"
echo "  6. chown          → fix ownership if the wrong user owns the file"
echo "  7. ls -l          → verify the fix before re-running the deployment"


# =============================================================================
# SECTION 8 — Environment Variable Inspection
# =============================================================================
section "8. Environment Variable Inspection"

info "Print environment variables relevant to the Flask app"
info "  These are set in k8s/deployment.yaml and read by app/main.py"
cmd_echo "printenv APP_ENV PORT APP_VERSION 2>/dev/null || echo '(not set — using defaults)'"
for VAR in APP_ENV PORT APP_VERSION; do
    VAL=$(printenv "${VAR}" 2>/dev/null || true)
    if [[ -n "${VAL}" ]]; then
        info "${VAR}=${VAL}"
    else
        info "${VAR} is not set (app will use its default)"
    fi
done

info "Show PATH — ensures the correct Python/pip binaries are found"
cmd_echo "echo \$PATH"
echo "${PATH}"

info "Show Python interpreter location and version"
cmd_echo "which python3 && python3 --version"
which python3 2>/dev/null && python3 --version 2>/dev/null || \
    which python 2>/dev/null && python --version 2>/dev/null || \
    warn "Python not found in PATH"


# =============================================================================
# Done
# =============================================================================
section "Audit Complete"
info "All checks finished successfully."
info "Review any [WARN] lines above and address them before deploying to production."
echo ""
