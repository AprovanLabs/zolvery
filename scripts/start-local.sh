#!/usr/bin/env bash

set -e

root_dir=`git rev-parse --show-toplevel`

(cd $root_dir && docker-compose up -d)
