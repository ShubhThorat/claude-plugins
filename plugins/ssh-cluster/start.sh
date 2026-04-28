#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/server"
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
exec node index.js
