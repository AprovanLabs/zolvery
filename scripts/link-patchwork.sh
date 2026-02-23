#!/bin/bash
# Links local patchwork packages for development
# Run after pnpm install

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ZOLVERY_ROOT="$(dirname "$SCRIPT_DIR")"
PATCHWORK_ROOT="$ZOLVERY_ROOT/../patchwork"

if [ ! -d "$PATCHWORK_ROOT" ]; then
  echo "Patchwork not found at $PATCHWORK_ROOT"
  exit 1
fi

# Packages to link
declare -A PACKAGES=(
  ["@aprovan/patchwork-compiler"]="packages/compiler"
  ["@aprovan/patchwork-editor"]="packages/editor"
  ["@aprovan/bobbin"]="packages/bobbin"
  ["@aprovan/patchwork-image-shadcn"]="packages/images/shadcn"
)

echo "Linking patchwork packages..."

for pkg in "${!PACKAGES[@]}"; do
  src="$PATCHWORK_ROOT/${PACKAGES[$pkg]}"
  # Find and replace in node_modules
  find "$ZOLVERY_ROOT" -path "*/node_modules/$pkg" -type l -o -path "*/node_modules/$pkg" -type d 2>/dev/null | while read dest; do
    if [ -e "$src" ]; then
      rm -rf "$dest"
      ln -s "$src" "$dest"
      echo "Linked $pkg -> $src"
    fi
  done
done

echo "Done. Restart Vite to pick up changes."
