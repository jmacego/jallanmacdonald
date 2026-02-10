#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/../scripts/sanitize-runtime-env.sh" ]]; then
  # shellcheck source=/dev/null
  source "$ROOT_DIR/../scripts/sanitize-runtime-env.sh"
  sanitize_runtime_env
fi

log() {
  printf "\n[%s] %s\n" "$(date +"%H:%M:%S")" "$1"
}

export ASTRO_TELEMETRY_DISABLED=1
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/tmp}"
export CI="${CI:-1}"
export NPM_CONFIG_LOGLEVEL=error

unset NPM_CONFIG_GLOBALCONFIG
unset NPM_CONFIG_NPM_GLOBALCONFIG
unset NPM_CONFIG_VERIFY_DEPS_BEFORE_RUN
unset NPM_CONFIG__JSR_REGISTRY
unset NPM_CONFIG_DIR

export CDK_DEFAULT_REGION="${CDK_DEFAULT_REGION:-${AWS_REGION:-us-west-2}}"
export CDK_DEFAULT_ACCOUNT="${CDK_DEFAULT_ACCOUNT:-000000000000}"

QUICK=0
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=1
fi

if [[ "$QUICK" -eq 1 ]]; then
  log "Install site dependencies."
  pnpm --dir "$ROOT_DIR/apps/site" install --frozen-lockfile

  log "Build site."
  pnpm --dir "$ROOT_DIR/apps/site" run build

  log "Quick validation complete."
  exit 0
fi

log "Install site dependencies."
pnpm --dir "$ROOT_DIR/apps/site" install --frozen-lockfile

log "Lint site."
pnpm --dir "$ROOT_DIR/apps/site" run lint

log "Run site checks."
pnpm --dir "$ROOT_DIR/apps/site" run test

log "Build site."
pnpm --dir "$ROOT_DIR/apps/site" run build

log "Install infra dependencies."
pnpm --dir "$ROOT_DIR/infra" install --frozen-lockfile

log "Build infra."
pnpm --dir "$ROOT_DIR/infra" run build

log "Synth infra."
pnpm --dir "$ROOT_DIR/infra" run synth

log "Validation complete."
