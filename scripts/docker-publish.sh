#!/bin/bash
set -e

# Provide defaults, but allow override
REGISTRY=${REGISTRY:-"ghcr.io"}
# Fallback to the current user's github namespace if possible, or kalviumcommunity
USERNAME=${USERNAME:-"kalviumcommunity"}
IMAGE_NAME="kiims-backend"

# Ensure we are in a git repository to get the sha
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  VERSION_TAG="sha-$(git rev-parse --short HEAD)"
else
  VERSION_TAG="v1.0.0"
fi
LATEST_TAG="latest"

FULL_IMAGE_NAME="$REGISTRY/$USERNAME/$IMAGE_NAME"

# Convert everything to lowercase as docker tags must be lowercase
FULL_IMAGE_NAME=$(echo "$FULL_IMAGE_NAME" | tr '[:upper:]' '[:lower:]')

echo "=== Docker Image Registry Workflow ==="
echo "Target Image: $FULL_IMAGE_NAME"
echo "Target Tag: $VERSION_TAG"

echo ""
echo "1. Building the Docker image..."
# Build with a specific version tag
docker build -t $FULL_IMAGE_NAME:$VERSION_TAG ./backend

echo ""
echo "2. Tagging the image..."
# Tag as latest as well for fallback
docker tag $FULL_IMAGE_NAME:$VERSION_TAG $FULL_IMAGE_NAME:$LATEST_TAG

echo ""
echo "3. Pushing the images to $REGISTRY..."
echo "(Note: You must be logged in via 'docker login $REGISTRY' before running this script if pushing to a remote registry)"
# Check if dry-run
if [ "$1" == "--dry-run" ]; then
    echo "[Dry Run] Would push $FULL_IMAGE_NAME:$VERSION_TAG"
    echo "[Dry Run] Would push $FULL_IMAGE_NAME:$LATEST_TAG"
else
    docker push $FULL_IMAGE_NAME:$VERSION_TAG || { echo "Failed to push image. Are you logged in?"; exit 1; }
    docker push $FULL_IMAGE_NAME:$LATEST_TAG
fi

echo ""
echo "4. Verifying image push by pulling it back..."
if [ "$1" == "--dry-run" ]; then
    echo "[Dry Run] Would remove local images and pull $FULL_IMAGE_NAME:$VERSION_TAG"
else
    # Remove local images to ensure a fresh pull
    docker rmi $FULL_IMAGE_NAME:$VERSION_TAG
    docker rmi $FULL_IMAGE_NAME:$LATEST_TAG

    # Pull the versioned tag
    docker pull $FULL_IMAGE_NAME:$VERSION_TAG
fi

echo ""
echo "✅ Successfully completed workflow for $FULL_IMAGE_NAME:$VERSION_TAG!"
