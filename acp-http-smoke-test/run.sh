#!/usr/bin/env bash
# Single-command smoke test: build, start server, run client, tear down.
#
# Usage:
#   ./run.sh                  # default host/port (127.0.0.1:3284)
#   ACP_SMOKE_PORT=4000 ./run.sh
#
# Env vars:
#   ACP_SMOKE_HOST   default 127.0.0.1
#   ACP_SMOKE_PORT   default 3284
#   GOOSE_BIN        default ../goose-worktrees/acp-http-from-sdk/target/debug/goose

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

export ACP_SMOKE_HOST="${ACP_SMOKE_HOST:-127.0.0.1}"
export ACP_SMOKE_PORT="${ACP_SMOKE_PORT:-3284}"
export GOOSE_BIN="${GOOSE_BIN:-$SCRIPT_DIR/../../goose-worktrees/acp-http-from-sdk/target/debug/goose}"

if [[ ! -x "$GOOSE_BIN" ]]; then
  echo "ERROR: goose binary not found or not executable: $GOOSE_BIN" >&2
  echo "       Build it with:" >&2
  echo "         (cd $(dirname "$GOOSE_BIN")/../.. && cargo build -p goose-cli --bin goose)" >&2
  echo "       Or set GOOSE_BIN to a different path." >&2
  exit 1
fi

echo "▶ building smoke-test binaries..."
cargo build --quiet --bins

echo "▶ starting server (goose serve on $ACP_SMOKE_HOST:$ACP_SMOKE_PORT)..."
./target/debug/server &
SERVER_PID=$!

cleanup() {
  echo
  echo "▶ shutting down server (pid $SERVER_PID)..."
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Give the server binary a moment to spawn its child; the client itself
# polls /health for up to 30s before giving up.
sleep 1

echo "▶ running client..."
./target/debug/client
CLIENT_EXIT=$?

exit "$CLIENT_EXIT"
