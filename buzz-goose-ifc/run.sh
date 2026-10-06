#!/usr/bin/env bash
# Run the Buzz desktop app (with local relay) against a goose build that
# supports the IFC hide directive, with Buzz's client-side IFC enabled.
#
#   goose: aaif-goose/goose      branch buzz-goose-ifc  (agentCapabilities._meta.goose.ifc.hideDirective)
#   buzz:  alexhancock/buzz      branch buzz-goose-ifc  (buzz-acp IFC + ifc-core, gated on BUZZ_ACP_IFC=1)
#
# Usage: ./run.sh [--no-build-goose] [-- extra args for `just dev`]
#
# Env overrides:
#   GOOSE_DIR   goose checkout   (default ~/Development/goose-ifc-demo)
#   BUZZ_DIR    buzz checkout    (default ~/Development/buzz)
#   BRANCH      branch to use    (default buzz-goose-ifc)
#   GOOSE_PROFILE  debug|release (default debug)
set -euo pipefail

GOOSE_DIR="${GOOSE_DIR:-$HOME/Development/goose-ifc-demo}"
BUZZ_DIR="${BUZZ_DIR:-$HOME/Development/buzz}"
BRANCH="${BRANCH:-buzz-goose-ifc}"
GOOSE_PROFILE="${GOOSE_PROFILE:-debug}"
GOOSE_REPO="git@github.com:aaif-goose/goose.git"
BUZZ_REPO="git@github.com:alexhancock/buzz.git"

BUILD_GOOSE=1
JUST_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build-goose) BUILD_GOOSE=0; shift ;;
    --) shift; JUST_ARGS=("$@"); break ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

log() { printf '\033[1;36m==> %s\033[0m\n' "$*"; }

# Ensure a checkout exists and is on $BRANCH. Clones if missing; switches
# branches only when the working tree is clean.
ensure_checkout() {
  local dir="$1" repo="$2" remote="$3"
  if [[ ! -d "$dir/.git" ]]; then
    log "cloning $repo ($BRANCH) into $dir"
    git clone --branch "$BRANCH" "$repo" "$dir"
    return
  fi
  local current
  current="$(git -C "$dir" rev-parse --abbrev-ref HEAD)"
  if [[ "$current" != "$BRANCH" ]]; then
    if [[ -n "$(git -C "$dir" status --porcelain)" ]]; then
      echo "error: $dir is on '$current' with uncommitted changes; switch to '$BRANCH' manually." >&2
      exit 1
    fi
    log "switching $dir to $BRANCH"
    git -C "$dir" fetch "$remote" "$BRANCH"
    git -C "$dir" switch "$BRANCH" 2>/dev/null \
      || git -C "$dir" switch --track -c "$BRANCH" "$remote/$BRANCH"
  fi
  log "$dir @ $(git -C "$dir" log --oneline -1)"
}

ensure_checkout "$GOOSE_DIR" "$GOOSE_REPO" "${GOOSE_REMOTE:-origin}"
ensure_checkout "$BUZZ_DIR" "$BUZZ_REPO" "${BUZZ_REMOTE:-alexhancock}"

# ── goose ────────────────────────────────────────────────────────────────
GOOSE_BIN_DIR="$GOOSE_DIR/target/$GOOSE_PROFILE"
if [[ "$BUILD_GOOSE" == 1 ]]; then
  log "building goose ($GOOSE_PROFILE)"
  (
    cd "$GOOSE_DIR"
    # shellcheck disable=SC1091
    [[ -f bin/activate-hermit ]] && . bin/activate-hermit
    if [[ "$GOOSE_PROFILE" == release ]]; then
      cargo build --release -p goose-cli --bin goose
    else
      cargo build -p goose-cli --bin goose
    fi
  )
fi
[[ -x "$GOOSE_BIN_DIR/goose" ]] || { echo "error: $GOOSE_BIN_DIR/goose not found" >&2; exit 1; }

# Buzz desktop resolves the bare `goose` command from PATH before falling
# back to the login shell / ~/.local/bin, so prepending wins over any
# installed goose. buzz-acp inherits this env when the desktop spawns it.
export PATH="$GOOSE_BIN_DIR:$PATH"
export BUZZ_ACP_IFC=1
log "goose on PATH: $(command -v goose)"

# ── buzz ─────────────────────────────────────────────────────────────────
cd "$BUZZ_DIR"
# shellcheck disable=SC1091
. bin/activate-hermit
# Hermit prepends its own bin; re-assert our goose first.
export PATH="$GOOSE_BIN_DIR:$PATH"
[[ -f .env ]] || { log "creating .env from .env.example"; cp .env.example .env; }

log "starting buzz (just dev) with BUZZ_ACP_IFC=1"
exec just dev ${JUST_ARGS[@]+"${JUST_ARGS[@]}"}
