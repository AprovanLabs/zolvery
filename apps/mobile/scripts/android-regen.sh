#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${root_dir}/android.bak"

cd "$root_dir"

if [ -d "${root_dir}/android" ]; then
  rm -rf "$backup_dir"
  mv "${root_dir}/android" "$backup_dir"
fi

pnpm exec cap add android

if [ -d "$backup_dir" ]; then
  # Restore customized build.gradle
  if [ -f "$backup_dir/app/build.gradle" ]; then
    cp "$backup_dir/app/build.gradle" "${root_dir}/android/app/build.gradle"
  fi
  # Restore customized AndroidManifest.xml
  if [ -f "$backup_dir/app/src/main/AndroidManifest.xml" ]; then
    cp "$backup_dir/app/src/main/AndroidManifest.xml" "${root_dir}/android/app/src/main/AndroidManifest.xml"
  fi
  # Restore customized res files
  if [ -d "$backup_dir/app/src/main/res" ]; then
    cp -r "$backup_dir/app/src/main/res/values" "${root_dir}/android/app/src/main/res/" 2>/dev/null || true
    cp -r "$backup_dir/app/src/main/res/xml" "${root_dir}/android/app/src/main/res/" 2>/dev/null || true
  fi
  rm -rf "$backup_dir"
fi

# Regenerate assets if assets directory exists
if [ -d "${root_dir}/assets" ]; then
  echo "Regenerating Android assets..."
  pnpm run assets
fi
