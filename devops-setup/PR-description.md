# PR Description — Linux Filesystem Structure & Permissions for DevOps Workflows

## Summary

This pull request adds a practical Linux filesystem and permissions contribution
to the project. It includes an executable audit script and supporting
documentation that demonstrate how Linux commands are used in real DevOps
workflows — from navigating the filesystem and auditing permissions to
diagnosing deployment failures caused by permission or ownership problems.

---

## What Changed

| File | Type | Purpose |
|------|------|---------|
| `scripts/linux-permissions-audit.sh` | New | Executable shell script covering filesystem navigation, permission auditing, ownership inspection, process inspection, network inspection, and a full permission-denied diagnosis workflow |
| `docs/linux-filesystem-permissions.md` | New | Reference documentation explaining every command used, why it matters in a DevOps context, and how it maps to this project's CI/CD and Kubernetes setup |
| `devops-setup/PR-description.md` | New | This file — PR description and scenario-based question answer |

---

## Linux Commands Applied

### Filesystem Navigation
- `pwd` — confirm working directory before running scripts
- `ls -lah` — inspect file permissions, sizes, and hidden files
- `find` — locate files by name, type, modification time, or permission bits
- `du -sh` — check directory sizes before Docker builds
- `df -h` — verify available disk space before deployments

### Permission Management
- `chmod u+x` — make scripts executable (owner only, not world-executable)
- `chmod 644 / 600 / 755` — set appropriate permissions for source files, secrets, and directories
- `umask` — inspect and set default permissions for new files
- `stat` — read full file metadata including octal permission values

### Ownership
- `id` / `whoami` / `groups` — identify the current user and group memberships
- `chown -R appuser:appuser` — fix ownership after files are copied as root
- `getent passwd` — inspect user account details

### Process Inspection
- `ps aux` — list all running processes and filter for the Flask/Gunicorn app
- `pstree -p` — visualise parent-child process relationships
- `top -b -n 1` — one-shot resource snapshot for CPU and memory

### Network Inspection
- `ss -tlnp` — list all listening TCP ports with process names
- `curl -sf` — test HTTP endpoints (same checks as Kubernetes liveness probes)
- `findmnt -T` — check whether a file is on a `noexec`-mounted filesystem

### Security Auditing
- `find -perm -o+w` — detect world-writable files
- `find -perm -4000` — detect SUID binaries
- `getenforce` / `aa-status` — check SELinux and AppArmor status

---

## Why These Commands Are Necessary in a DevOps Workflow

**Permissions gate everything in Linux.** A CI/CD pipeline that builds a Docker
image, copies files, and runs a deployment script will fail silently or with
cryptic errors if permissions are wrong. Specifically:

1. **Scripts must be executable.** A deployment script without the `x` bit
   produces `Permission denied` even if the file exists and is readable.

2. **Ownership must match the running user.** Docker containers run as a
   non-root user (`appuser` in this project). Files copied into the image as
   `root` are inaccessible to `appuser` unless `chown` or `COPY --chown` is
   used.

3. **Directories need the execute bit for traversal.** A directory without `x`
   cannot be entered with `cd`, which breaks any script that uses relative paths.

4. **`noexec` mounts silently block execution.** Some hardened environments
   mount `/tmp` or application directories with `noexec`. The execute bit can
   be set correctly and the file still will not run.

5. **Process and network inspection confirm the deployment actually worked.**
   A successful `kubectl apply` does not mean the app is running. `ss -tlnp`
   and `curl` verify the process is alive and listening.

---

## How to Test the Changes

```bash
# 1. Clone the branch and navigate to the project root
git checkout feature/linux-permissions

# 2. Make the script executable (demonstrates chmod in practice)
chmod u+x scripts/linux-permissions-audit.sh

# 3. Run the audit script
./scripts/linux-permissions-audit.sh

# 4. Review the output — each section is labelled and annotated
# 5. Read docs/linux-filesystem-permissions.md for the full command reference
```

Expected output: all sections complete with `[INFO]` lines and no `[ERROR]`
lines. Any `[WARN]` lines indicate real issues to address.

---

## Scenario-Based Question Answer

> **Scenario:** A deployment or automation script fails because it cannot access
> or execute a required file, even though the file exists on the system. How
> would you identify the root cause, what permission or ownership issues might
> be involved, and how would you fix the problem safely?

### Identification

```bash
# Step 1 — Confirm the file exists and read its permissions
ls -l scripts/linux-permissions-audit.sh
# -rw-r--r-- 1 root root 8192 May 5 10:00 scripts/linux-permissions-audit.sh
#  ^^^ no execute bit    ^^^^ owned by root, not appuser

# Step 2 — Confirm which user the deployment process runs as
whoami && id
# appuser
# uid=1000(appuser) gid=1000(appuser) groups=1000(appuser)

# Step 3 — Get full metadata including octal mode
stat scripts/linux-permissions-audit.sh
# Access: (0644/-rw-r--r--)  Uid: (0/root)  Gid: (0/root)

# Step 4 — Rule out noexec mount
findmnt -T scripts/linux-permissions-audit.sh
# Check OPTIONS column for 'noexec'

# Step 5 — Rule out SELinux/AppArmor
getenforce          # should be Permissive or Disabled for dev
dmesg | grep avc    # kernel audit log for SELinux denials
```

### Root Causes

| Root Cause | How to Spot It | Fix |
|------------|---------------|-----|
| Missing execute bit | `ls -l` shows `-rw-r--r--` (no `x`) | `chmod u+x <file>` |
| Wrong owner (root vs appuser) | `stat` shows `Uid: 0/root` | `chown appuser:appuser <file>` |
| `noexec` filesystem mount | `findmnt` shows `noexec` in OPTIONS | Move file to an `exec`-mounted path |
| SELinux denial | `getenforce` = Enforcing; `dmesg` shows AVC denial | `audit2allow` or relabel with `chcon` |
| AppArmor profile | `aa-status` shows profile in enforce mode | Adjust profile or use complain mode |

### Safe Fix

```bash
# Fix the execute bit — owner only, not world-executable (never chmod 777)
chmod u+x scripts/linux-permissions-audit.sh

# Fix ownership so the app user can execute it
sudo chown appuser:appuser scripts/linux-permissions-audit.sh

# Verify before re-running the deployment
ls -l scripts/linux-permissions-audit.sh
# -rwxr--r-- 1 appuser appuser 8192 May 5 10:00 scripts/linux-permissions-audit.sh
```

### Why Not `chmod 777`?

`chmod 777` grants write and execute permission to every user on the system.
If any account is compromised, an attacker can overwrite the deployment script
with malicious code that runs with the privileges of the CI runner or container
process. The correct approach is to grant only the minimum permissions required:

- `u+x` if only the owner needs to execute
- `g+x` if the CI runner group also needs to execute
- Never `o+w` (others write) on scripts or config files

### Prevention in the Dockerfile

This project's `Dockerfile` prevents this class of problem by:

```dockerfile
# Create a dedicated non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Set ownership at copy time — no separate chown step needed
COPY --chown=appuser:appuser app/ ./app/

# Switch to non-root before CMD — process never runs as root
USER appuser
```

And in the CI pipeline, scripts should be committed with the execute bit already
set (`git update-index --chmod=+x scripts/linux-permissions-audit.sh`) so the
bit is preserved when the runner checks out the repository.

---

## Known Limitations

- The audit script uses `bash`-specific features (`set -euo pipefail`,
  `[[ ]]` conditionals) and requires bash 4.0+.
- `pstree`, `findmnt`, and `ss` may not be available on all minimal container
  images. The script falls back gracefully with a warning.
- SELinux and AppArmor checks are informational only — fixing MAC policy
  denials requires system-level access beyond the scope of this script.

---

## Follow-Up Work

- Add a `pre-commit` hook that runs `find . -perm -o+w` to catch world-writable
  files before they are committed.
- Add a CI step that verifies all scripts in `scripts/` have the execute bit
  set using `git ls-files --stage scripts/`.
