#!/usr/bin/env bash

set -e

root_dir=`git rev-parse --show-toplevel`
export STITCHERY_PORT="${STITCHERY_PORT:-6434}"

(cd $root_dir && docker-compose up -d)

# Start Stitchery for LLM editing (requires apprentice repo)
apprentice_dir="$root_dir/../apprentice"
if [ -d "$apprentice_dir" ]; then
  (cd "$apprentice_dir" && STITCHERY_PORT="$STITCHERY_PORT" pnpm stitchery serve) \
    >/tmp/kossabos-stitchery.log 2>&1 &
else
  echo "Warning: apprentice repo not found at $apprentice_dir; Stitchery not started."
fi

# Start local TURN server for WebRTC during dev
node $root_dir/scripts/start-turn.js >/tmp/kossabos-turn.log 2>&1 &
