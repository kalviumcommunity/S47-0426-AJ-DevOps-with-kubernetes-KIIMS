# Git Branching Strategy & Conflict Resolution

This document explains the branching model used in this repository, how to keep branches up to date, and how to resolve the parallel-feature conflict scenario described in the Sprint 3 assignment.

---

## Branching Model

This repository uses a **feature-branch workflow** with `main` as the single protected branch.

```
main  (protected — no direct commits)
 │
 ├── concept-1/anushka     ← merged via PR #1
 ├── concept-2/anushka     ← merged via PR #2
 ├── concept-3/anushka     ← merged via PR #3
 ├── workstation           ← merged via PR #4
 ├── feature/ci-cd-pipeline           ← merged via PR #5
 └── feature/git-workflow-improvements  ← this branch (PR #6)
```

### Why feature branches?

| Benefit | Explanation |
|---|---|
| Isolation | Each branch contains exactly one unit of work — changes cannot accidentally affect each other |
| Reviewability | A PR shows only the diff for that feature — reviewers see focused, understandable changes |
| Reversibility | A bad merge can be reverted without touching unrelated work |
| Parallel work | Multiple contributors can work simultaneously without blocking each other |

---

## The Parallel-Feature Conflict Scenario

> **Scenario:** Two developers branch from the same `main`. Developer A merges first. Developer B's branch is now behind `main` and has conflicts.

This is the most common situation in collaborative Git workflows. Here is exactly how to resolve it.

### Visual Representation

```
main:      A ── B ── C ── D (merged feature-A here)
                │
feature-A:      B ── X ── Y  (merged into main as D)
                │
feature-B:      B ── P ── Q  (still open — now behind main)
```

After feature-A merges, `main` has moved to commit D. Feature-B was branched from B and does not have commits X, Y, or D. If P or Q touched the same files as X or Y, there will be conflicts.

---

## Step-by-Step Resolution

### Step 1 — Fetch the latest state of `main`

```bash
git fetch origin
```

This downloads the latest commits from the remote without changing your working branch. Always fetch before rebasing.

### Step 2 — Rebase your branch on top of `main`

```bash
git rebase origin/main
```

Rebase replays your commits (P, Q) on top of the current tip of `main` (D). The result is a linear history:

```
Before rebase:   main: A─B─C─D
                 feature-B: B─P─Q

After rebase:    main: A─B─C─D
                 feature-B: A─B─C─D─P'─Q'
```

P' and Q' are your commits, replayed on top of D. They contain the same changes but have new commit hashes because their parent has changed.

### Step 3 — Resolve conflicts

If your commits touched the same lines as the merged feature-A commits, Git will pause the rebase and show:

```
CONFLICT (content): Merge conflict in app/main.py
error: could not apply P... your commit message
hint: Resolve all conflicts manually, mark them with `git add <conflicted_files>`
hint: and run `git rebase --continue`.
```

Open the conflicted file. Git marks the conflict like this:

```python
<<<<<<< HEAD
# This is the version from main (after feature-A merged)
return jsonify({"status": "ok", "version": "1.2"}), 200
=======
# This is your version from feature-B
return jsonify({"status": "ok", "env": os.getenv("APP_ENV")}), 200
>>>>>>> P: your commit message
```

**Resolve by editing the file to the correct final state** — usually combining both changes:

```python
# Resolved: include both version and env
return jsonify({
    "status": "ok",
    "version": "1.2",
    "env": os.getenv("APP_ENV"),
}), 200
```

Then mark the conflict as resolved and continue:

```bash
git add app/main.py
git rebase --continue
```

Repeat for each conflicting commit until the rebase completes.

### Step 4 — Force-push the rebased branch

Because rebase rewrites commit history (new hashes for P' and Q'), a normal push will be rejected. Use `--force-with-lease` — it is safer than `--force` because it refuses to push if someone else has pushed to the branch since your last fetch:

```bash
git push --force-with-lease origin feature/your-branch
```

### Step 5 — Verify and open the PR

Run tests locally to confirm nothing broke during conflict resolution:

```bash
pytest --cov=app --cov-report=term-missing tests/
```

Then open (or update) your Pull Request. The PR will now show your commits cleanly on top of the current `main`.

---

## Rebase vs Merge — Which to Use

| Situation | Recommended Approach | Why |
|---|---|---|
| Updating a feature branch with latest `main` | `git rebase origin/main` | Keeps history linear; cleaner PR diff |
| Merging a reviewed PR into `main` | Merge (via GitHub PR) | Preserves the PR merge commit as a record |
| Incorporating a dependency branch | `git merge` | Preserves the relationship between branches |

**Rule of thumb:** Rebase to update your own branch. Merge to integrate completed work into `main`.

---

## How Our Branching Practices Minimise Conflicts

The practices in this repository are specifically designed to reduce the frequency and severity of merge conflicts:

### 1. Short-lived branches

Each branch represents one focused unit of work and is merged quickly. The longer a branch lives, the more `main` moves ahead of it, and the more conflicts accumulate.

```
Bad:  feature-B open for 3 weeks → 40 commits behind main → many conflicts
Good: feature-B open for 2 days  → 3 commits behind main  → minimal conflicts
```

### 2. Single-responsibility branches

Each branch touches one area of the codebase. When two branches touch different files, there are no conflicts regardless of merge order.

```
feature/add-metrics-endpoint  → touches app/main.py, tests/test_app.py
feature/update-k8s-resources  → touches k8s/deployment.yaml only
→ No conflict possible between these two branches
```

### 3. Conventional Commits

Descriptive commit messages make it immediately clear what each commit changed. During a rebase conflict, you can read the commit message to understand the intent before resolving the conflict.

```
feat(app): add /metrics endpoint for Prometheus scraping
```
vs.
```
update stuff
```

The first message tells you exactly what the conflict is about.

### 4. CI gates on every PR

The CI pipeline runs lint and tests on every PR. After resolving conflicts and rebasing, CI re-runs automatically. If the conflict resolution introduced a bug, CI catches it before the code reaches `main`.

### 5. Protected `main` branch

No one pushes directly to `main`. Every change goes through a PR. This means `main` is always in a known-good state — a reliable base to branch from and rebase onto.

---

## Quick Reference Card

```bash
# Start new work
git checkout main
git pull origin main
git checkout -b feature/your-feature

# Keep your branch up to date
git fetch origin
git rebase origin/main

# Resolve a conflict
# 1. Edit the conflicted file
# 2. git add <file>
# 3. git rebase --continue

# Push after rebase
git push --force-with-lease origin feature/your-feature

# Run tests before opening PR
pytest --cov=app --cov-report=term-missing tests/
```

---

## Related Documents

- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — full contribution guide, commit conventions, PR process
- [`readme.md`](../readme.md) — project overview and pipeline documentation
- [`devops-setup/README.md`](../devops-setup/README.md) — local environment setup
