# Linux Filesystem Structure & Permissions for DevOps Workflows

This document explains the Linux commands used in this project's DevOps workflow,
why each one matters, and how they map to real operational tasks like running the
Flask app, building Docker images, and deploying to Kubernetes.

---

## Table of Contents

1. [Project Filesystem Layout](#1-project-filesystem-layout)
2. [Filesystem Navigation Commands](#2-filesystem-navigation-commands)
3. [Understanding Linux Permissions](#3-understanding-linux-permissions)
4. [Permission Management Commands](#4-permission-management-commands)
5. [Ownership Commands](#5-ownership-commands)
6. [Process Inspection Commands](#6-process-inspection-commands)
7. [Network Inspection Commands](#7-network-inspection-commands)
8. [Scenario: Diagnosing a Permission-Denied Deployment Failure](#8-scenario-diagnosing-a-permission-denied-deployment-failure)
9. [Quick Reference Cheat Sheet](#9-quick-reference-cheat-sheet)

---

## 1. Project Filesystem Layout

```
sprint3-project/
├── app/
│   ├── __init__.py          # Python package marker
│   └── main.py              # Flask application source
├── scripts/
│   └── linux-permissions-audit.sh   # ← this assignment's audit script
├── tests/
│   └── test_app.py
├── k8s/
│   ├── deployment.yaml
│   └── service.yaml
├── docs/
│   └── linux-filesystem-permissions.md   # ← this file
├── Dockerfile
└── requirements.txt
```

In Linux, **everything is a file** — regular files, directories, sockets, and
devices all share the same permission model. Understanding this model is
essential for running containers and automation scripts safely.

---

## 2. Filesystem Navigation Commands

### `pwd` — Print Working Directory

```bash
pwd
# /home/appuser/sprint3-project
```

Confirms your current location in the filesystem. Always run this first when
debugging a script that uses relative paths — a wrong working directory is a
common cause of "file not found" errors.

### `ls -lah` — List Files with Full Detail

```bash
ls -lah app/
# drwxr-xr-x 2 appuser appuser 4.0K May  5 10:00 .
# -rw-r--r-- 1 appuser appuser 2.1K May  5 10:00 main.py
```

| Flag | Meaning |
|------|---------|
| `-l` | Long format — shows permissions, owner, size, date |
| `-a` | Include hidden files (names starting with `.`) |
| `-h` | Human-readable sizes (KB, MB instead of bytes) |

**DevOps use:** Verify that the files the CI pipeline copies into a Docker image
have the correct permissions before the image is pushed.

### `find` — Locate Files by Criteria

```bash
# Find all Python files in the project
find . -name "*.py" -type f

# Find files modified in the last 24 hours (useful after a deployment)
find . -mtime -1 -type f

# Find world-writable files (security audit)
find . -perm -o+w -type f
```

**DevOps use:** Audit the filesystem for unexpected files, stale build artefacts,
or insecure permissions before a release.

### `du -sh` — Disk Usage Summary

```bash
du -sh */
# 4.0K    app/
# 8.0K    k8s/
# 12K     docs/
```

**DevOps use:** Check directory sizes before a Docker build to avoid bloated
images. If `du` shows an unexpectedly large directory, add it to `.dockerignore`.

### `df -h` — Disk Free Space

```bash
df -h .
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   12G   36G  25% /
```

**DevOps use:** A full disk (`Use% = 100%`) causes Docker builds, log writes,
and database writes to fail silently or with cryptic errors. Always check `df`
when a deployment fails unexpectedly.

---

## 3. Understanding Linux Permissions

Every file and directory has a **permission string** with 10 characters:

```
-rwxr-xr--
│└──┘└──┘└──┘
│ owner group others
│
└─ file type: - = regular file, d = directory, l = symlink
```

### Permission Bits

| Symbol | Octal | Meaning on a file | Meaning on a directory |
|--------|-------|-------------------|------------------------|
| `r`    | 4     | Read the file     | List directory contents |
| `w`    | 2     | Write to the file | Create/delete files inside |
| `x`    | 1     | Execute the file  | Enter (cd into) the directory |
| `-`    | 0     | Permission denied | Permission denied |

### Common Permission Patterns

| Octal | Symbolic   | Typical use |
|-------|------------|-------------|
| `600` | `rw-------` | Private keys, `.env` files — owner read/write only |
| `644` | `rw-r--r--` | Source code, config files — owner writes, others read |
| `700` | `rwx------` | Private scripts — owner executes, no one else |
| `755` | `rwxr-xr-x` | Public scripts, directories — owner writes, others execute |
| `777` | `rwxrwxrwx` | **Avoid** — grants full access to everyone |

### Why `chmod 777` is Dangerous

Setting `777` on a script means any user on the system can overwrite it. If an
attacker gains access to any account, they can replace your deployment script
with malicious code that runs with elevated privileges. Always use the minimum
permissions required.

---

## 4. Permission Management Commands

### `chmod` — Change File Mode

```bash
# Make the audit script executable by its owner only
chmod u+x scripts/linux-permissions-audit.sh

# Set exact permissions using octal notation
chmod 644 app/main.py        # owner rw, group r, others r
chmod 755 scripts/           # owner rwx, group rx, others rx
chmod 600 .env               # owner rw only — for secrets

# Recursive — apply to all files in a directory
chmod -R 755 app/
```

**Symbolic vs octal:**

```bash
chmod u+x file    # add execute for owner (u=user/owner, g=group, o=others, a=all)
chmod go-w file   # remove write from group and others
chmod a=r file    # set read-only for everyone
```

### `umask` — Default Permission Mask

```bash
umask          # show current mask
umask 022      # set mask: new files get 644, new dirs get 755
```

`umask` subtracts permissions from the default (`666` for files, `777` for
directories). A `umask` of `022` means:

```
666 - 022 = 644   (new files)
777 - 022 = 755   (new directories)
```

**DevOps use:** Set `umask 022` in CI runner environments to ensure build
artefacts have predictable permissions.

### `stat` — Detailed File Metadata

```bash
stat scripts/linux-permissions-audit.sh
# File: scripts/linux-permissions-audit.sh
# Size: 8192      Blocks: 16     IO Block: 4096  regular file
# Device: 8,1     Inode: 131073  Links: 1
# Access: (0755/-rwxr-xr-x)  Uid: (1000/appuser)  Gid: (1000/appuser)
# Access: 2026-05-05 10:00:00
# Modify: 2026-05-05 10:00:00
```

`stat` shows the **octal permission value** alongside the symbolic string, which
is useful when writing `find -perm` queries or Dockerfile `RUN chmod` commands.

---

## 5. Ownership Commands

### `chown` — Change Owner

```bash
# Change owner to appuser, group to appuser
chown appuser:appuser app/main.py

# Recursive — fix ownership of all files after copying as root
chown -R appuser:appuser /app

# Change group only
chown :appgroup app/main.py
```

**DevOps use in Docker:** The `Dockerfile` in this project creates a non-root
`appuser` and switches to it before running the app. If files are copied into
the image as `root` and not reassigned, the app process cannot read them:

```dockerfile
RUN useradd --create-home --shell /bin/bash appuser
COPY --chown=appuser:appuser app/ ./app/   # fix ownership at copy time
USER appuser
```

### `id` — Show User Identity

```bash
id
# uid=1000(appuser) gid=1000(appuser) groups=1000(appuser),4(adm),27(sudo)
```

**DevOps use:** When a script fails with "permission denied", run `id` first to
confirm which user the process is running as. The UID/GID must match the file's
owner for the permissions to apply.

### `whoami` — Current Username

```bash
whoami
# appuser
```

Quick sanity check — especially useful in CI pipelines where the runner user
may differ from your local user.

### `groups` — Group Memberships

```bash
groups
# appuser adm sudo docker
```

**DevOps use:** If a user needs to run Docker commands without `sudo`, they must
be in the `docker` group. `groups` confirms this without needing to log out and
back in.

---

## 6. Process Inspection Commands

### `ps aux` — List All Processes

```bash
ps aux
# USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
# appuser   1234  0.5  1.2  45678  9876 ?        Ss   10:00   0:01 python -m app.main

# Filter for the Flask app
ps aux | grep 'python\|gunicorn' | grep -v grep
```

**DevOps use:** Verify the app process is running after a deployment. Check the
PID to send signals (`kill -HUP <pid>` for graceful reload).

### `pstree` — Process Tree

```bash
pstree -p
# systemd(1)─┬─gunicorn(1234)─┬─gunicorn(1235)
#             │                └─gunicorn(1236)
#             └─sshd(789)
```

**DevOps use:** Understand parent-child relationships. Gunicorn spawns worker
processes — `pstree` shows how many workers are running and their PIDs.

### `top` / `htop` — Real-Time Process Monitor

```bash
top -b -n 1   # single snapshot (batch mode, non-interactive)
```

**DevOps use:** Identify CPU or memory spikes during load testing. If the app
is being OOMKilled in Kubernetes, `top` inside the container shows memory
consumption before the kill.

---

## 7. Network Inspection Commands

### `ss` — Socket Statistics (modern replacement for `netstat`)

```bash
# Show all listening TCP ports with process names
ss -tlnp

# Check if the Flask app is listening on port 8080
ss -tlnp | grep ':8080'
# LISTEN  0  128  0.0.0.0:8080  0.0.0.0:*  users:(("python",pid=1234,fd=5))
```

| Flag | Meaning |
|------|---------|
| `-t` | TCP sockets only |
| `-l` | Listening sockets only |
| `-n` | Numeric addresses (no DNS lookup) |
| `-p` | Show process name and PID |

**DevOps use:** After deploying the app, confirm it is actually listening on the
expected port before running health checks. A common mistake is the app binding
to `127.0.0.1` instead of `0.0.0.0`, making it unreachable from outside the
container.

### `curl` — HTTP Request from the Command Line

```bash
# Test the liveness probe endpoint
curl -sf http://localhost:8080/health
# {"status": "ok"}

# Verbose output for debugging headers and TLS
curl -v http://localhost:8080/ready

# Check HTTP status code only
curl -o /dev/null -w "%{http_code}" http://localhost:8080/
```

**DevOps use:** Manually trigger the same HTTP checks that Kubernetes liveness
and readiness probes perform. If `curl` succeeds but the probe fails, the issue
is in the probe configuration (wrong port, wrong path, timeout too short).

### `findmnt` — Show Filesystem Mount Points

```bash
findmnt -T /app
# TARGET SOURCE    FSTYPE OPTIONS
# /      /dev/sda1 ext4   rw,relatime

# Check for noexec mounts
findmnt | grep noexec
```

**DevOps use:** A filesystem mounted with `noexec` prevents any binary or script
from being executed, even if it has the execute bit set. This is a common
surprise in hardened environments and container runtimes.

---

## 8. Scenario: Diagnosing a Permission-Denied Deployment Failure

> **Scenario:** A deployment or automation script fails because it cannot access
> or execute a required file, even though the file exists on the system.

### Step-by-Step Diagnosis

**Step 1 — Confirm the file exists and read its permissions**

```bash
ls -l scripts/linux-permissions-audit.sh
# -rw-r--r-- 1 root root 8192 May 5 10:00 scripts/linux-permissions-audit.sh
```

The permission string `-rw-r--r--` shows no execute bit (`x`) for anyone.
The owner is `root`.

**Step 2 — Confirm which user is running the deployment**

```bash
whoami && id
# appuser
# uid=1000(appuser) gid=1000(appuser) groups=1000(appuser)
```

The deployment runs as `appuser`, but the file is owned by `root`.

**Step 3 — Identify the exact problem**

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing execute bit | `Permission denied` when running the script | `chmod u+x <file>` |
| Wrong owner | Script owned by `root`, run as `appuser` | `chown appuser:appuser <file>` |
| `noexec` mount | Execute bit set but still denied | Remount without `noexec` or move the file |
| SELinux denial | `Permission denied` despite correct bits | `getenforce` → `audit2allow` or relabel |

**Step 4 — Use `stat` for full detail**

```bash
stat scripts/linux-permissions-audit.sh
# Access: (0644/-rw-r--r--)  Uid: (0/root)  Gid: (0/root)
```

Octal `0644` confirms no execute bit. UID `0` confirms root ownership.

**Step 5 — Check for `noexec` mount**

```bash
findmnt -T scripts/linux-permissions-audit.sh
# TARGET SOURCE    FSTYPE OPTIONS
# /      /dev/sda1 ext4   rw,relatime,noexec
```

If `noexec` appears in OPTIONS, the execute bit is irrelevant — the kernel
refuses to execute any file on that mount regardless of permissions.

**Step 6 — Check SELinux / AppArmor**

```bash
getenforce          # Enforcing / Permissive / Disabled
aa-status           # AppArmor profiles
dmesg | grep -i 'avc\|apparmor'   # kernel audit log for denials
```

**Step 7 — Apply the fix safely**

```bash
# Fix 1: Add execute bit for the owner only (not 777)
chmod u+x scripts/linux-permissions-audit.sh

# Fix 2: Correct ownership so appuser can execute it
sudo chown appuser:appuser scripts/linux-permissions-audit.sh

# Fix 3: If the file must be executable by the CI runner group
chmod g+x scripts/linux-permissions-audit.sh
```

**Step 8 — Verify before re-running the deployment**

```bash
ls -l scripts/linux-permissions-audit.sh
# -rwxr--r-- 1 appuser appuser 8192 May 5 10:00 scripts/linux-permissions-audit.sh
```

The `x` in position 4 confirms the owner can now execute the file.

**Step 9 — Re-run the deployment**

```bash
./scripts/linux-permissions-audit.sh
```

### Why This Matters in a DevOps Context

In CI/CD pipelines, files are often created by one user (e.g., the CI runner as
`root`) and executed by another (e.g., the app container as `appuser`). Without
explicit `chown` and `chmod` steps in the pipeline, permission mismatches are
inevitable. The `Dockerfile` in this project addresses this by:

1. Creating a dedicated `appuser` with `useradd`
2. Switching to `USER appuser` before the `CMD`
3. Using `COPY --chown=appuser:appuser` to set ownership at copy time

This ensures the running process never has more privileges than it needs
(principle of least privilege).

---

## 9. Quick Reference Cheat Sheet

```bash
# ── Navigation ──────────────────────────────────────────────────────────────
pwd                          # where am I?
ls -lah                      # list files with permissions and sizes
find . -name "*.py"          # find files by name
du -sh */                    # directory sizes
df -h .                      # free disk space

# ── Permissions ─────────────────────────────────────────────────────────────
ls -l <file>                 # view permissions
stat <file>                  # detailed metadata including octal mode
chmod u+x <script>           # make executable by owner
chmod 644 <config>           # owner rw, others r
chmod 600 <secret>           # owner rw only
chmod -R 755 <dir>           # recursive directory permissions
umask                        # show default permission mask

# ── Ownership ───────────────────────────────────────────────────────────────
id                           # current user UID/GID/groups
whoami                       # current username
groups                       # group memberships
chown user:group <file>      # change owner and group
chown -R user:group <dir>    # recursive ownership change

# ── Security Audits ─────────────────────────────────────────────────────────
find . -perm -o+w -type f    # world-writable files (risk)
find . -perm -4000 -type f   # SUID files (risk)
getenforce                   # SELinux status
aa-status                    # AppArmor status

# ── Processes ───────────────────────────────────────────────────────────────
ps aux                       # all running processes
ps aux | grep python         # filter for Python processes
pstree -p                    # process tree with PIDs
top -b -n 1                  # one-shot resource snapshot

# ── Network ─────────────────────────────────────────────────────────────────
ss -tlnp                     # listening TCP ports with process names
ss -tlnp | grep ':8080'      # check if app is listening
curl -sf http://localhost:8080/health   # test health endpoint
findmnt -T <file>            # check mount options for a path
```

---

*This document is part of the Linux Filesystem & Permissions assignment
contribution for the DevOps with Kubernetes & CI/CD sprint.*
