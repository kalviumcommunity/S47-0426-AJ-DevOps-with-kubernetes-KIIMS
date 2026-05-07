# feat: Implement Docker Registry Workflow for Backend Image

## Description
This PR introduces a complete workflow for building, tagging, pushing, and verifying our Docker images using a container registry (GHCR/Docker Hub). Treating Docker images as versioned artifacts ensures that deployments are reproducible, traceable, and reliable across environments.

## Image Tagging Strategy
We employ a dual-tagging strategy:
1. **Git SHA Tag (e.g., `sha-a1b2c3d`)**: Every built image is tagged with the short Git commit SHA. This provides strict traceability, directly linking the running container back to the exact code commit that produced it. This is our primary tag for production deployments.
2. **`latest` Tag**: The default branch (e.g., `main`) builds are additionally tagged with `latest`. This acts as a convenient alias for local development and testing, but is explicitly avoided in production to prevent unexpected upgrades.

## Registry Used
- **GitHub Container Registry (GHCR)** (via GitHub Actions) 
- Can also be used with **Docker Hub** via the local script.

## Workflow Steps Executed
1. **Build**: The Dockerfile in `backend/` was built using `docker build -t <image-name>:<sha> ./backend`.
2. **Tag**: The image was tagged with both the specific Git SHA and `latest`.
3. **Push**: Both tags were pushed to the remote container registry.
4. **Pull & Verify**: To verify the push, local images were removed (`docker rmi`) and the SHA tag was pulled down directly from the registry (`docker pull <image-name>:<sha>`).

## Changes Included
- Added `.github/workflows/docker-publish.yml`: Automates the build, tag, push, and pull validation workflow using GitHub Actions for GHCR.
- Added `scripts/docker-publish.sh`: A shell script to easily demonstrate and replicate the process locally.

## Reviewer Notes
You can review the `docker-publish.yml` to see the automated CI process. Alternatively, you can run `./scripts/docker-publish.sh` after authenticating with a registry to test the local workflow.

## Video Demonstration
The screen-share video demo demonstrating this workflow has been recorded and uploaded to Google Drive.
[Link to Video] (To be added)

### Scenario Answer
**Assume that a CI pipeline pulls the latest tag of your image and unexpectedly deploys a breaking change to a downstream environment. Based on your tagging and registry practices, explain why this might happen, how proper tagging could prevent this issue, and what changes you would make to your image versioning strategy to support safe deployments and rollbacks.**

*Why this might happen:* Deploying the `latest` tag means the deployment always pulls whatever image was pushed most recently with that tag. If a developer merges a breaking change, the `latest` tag is overwritten. Any environment relying on `latest` will unexpectedly pull this breaking change on its next deployment or pod restart.

*How proper tagging prevents this issue:* By using specific version tags (like a Git SHA, e.g., `sha-1234abc`, or a semantic version like `v1.2.3`), the deployment configuration is locked to an exact, immutable image. The deployment environment won't update until the configuration is explicitly changed to point to a new tag.

*Changes to support safe deployments and rollbacks:* 
1. Never use the `latest` tag in production or staging environments.
2. Always deploy images using their unique Git SHA tag (`sha-xxxxxxx`) or a Semantic Version tag (`vX.Y.Z`).
3. Maintain an infrastructure-as-code (IaC) or GitOps setup (like Kubernetes manifests) where the image tag is explicitly defined. To rollback, simply revert the configuration to point to the previous, known-good tag.
