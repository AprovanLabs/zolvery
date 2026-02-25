#!/usr/bin/env bash
#
# Bumps the mobile app version (versionCode & versionName in build.gradle,
# version in package.json) when staged changes touch apps/mobile/.
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
BUILD_GRADLE="$REPO_ROOT/apps/mobile/android/app/build.gradle"
PACKAGE_JSON="$REPO_ROOT/apps/mobile/package.json"

# Check if any staged files are under apps/mobile/
CHANGED=$(git diff --cached --name-only -- 'apps/mobile/' || true)

if [ -z "$CHANGED" ]; then
  exit 0
fi

# --- Read current values from build.gradle ---

CURRENT_CODE=$(sed -n 's/.*versionCode \([0-9]*\).*/\1/p' "$BUILD_GRADLE" | head -1)
CURRENT_NAME=$(sed -n 's/.*versionName "\([^"]*\)".*/\1/p' "$BUILD_GRADLE" | head -1)

if [ -z "$CURRENT_CODE" ] || [ -z "$CURRENT_NAME" ]; then
  echo "Error: Could not parse versionCode/versionName from build.gradle"
  exit 1
fi

# --- Increment patch version ---

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_NAME"
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
NEW_CODE=$((CURRENT_CODE + 1))

echo "Bumping mobile version: $CURRENT_NAME ($CURRENT_CODE) → $NEW_VERSION ($NEW_CODE)"

# --- Update build.gradle ---

sed -i '' "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" "$BUILD_GRADLE"
sed -i '' "s/versionName \"$CURRENT_NAME\"/versionName \"$NEW_VERSION\"/" "$BUILD_GRADLE"

# --- Update package.json ---

sed -i '' "s/\"version\": \"$CURRENT_NAME\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"

# --- Stage the bumped files ---

git add "$BUILD_GRADLE" "$PACKAGE_JSON"

echo "Staged updated build.gradle and package.json"
