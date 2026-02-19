#!/usr/bin/env bash

set -e

root_dir=`git rev-parse --show-toplevel`
export STITCHERY_PORT="${STITCHERY_PORT:-6434}"

(cd $root_dir && docker-compose up -d)

# Start Stitchery for LLM editing
STITCHERY_PORT="$STITCHERY_PORT" pnpm dlx @aprovan/stitchery serve \
  >/tmp/kossabos-stitchery.log 2>&1 &

# Start local TURN server for WebRTC during dev
node $root_dir/scripts/start-turn.js >/tmp/kossabos-turn.log 2>&1 &
