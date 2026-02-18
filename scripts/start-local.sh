#!/usr/bin/env bash

set -e

root_dir=`git rev-parse --show-toplevel`

(cd $root_dir && docker-compose up -d)

# Start local TURN server for WebRTC during dev
node $root_dir/scripts/start-turn.js >/tmp/kossabos-turn.log 2>&1 &
