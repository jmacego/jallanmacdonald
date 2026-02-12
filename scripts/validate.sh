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

check_duplicate_content_ids() {
  local content_dir="$1"
  local label="$2"

  if [[ ! -d "$content_dir" ]]; then
    return 0
  fi

  local duplicates
  duplicates="$(
    find "$content_dir" -type f \
      \( -name "*.md" -o -name "*.mdx" -o -name "*.markdown" -o -name "*.markdoc" \) \
      -printf "%P\n" \
      | awk '
          {
            stem = $0
            sub(/\.[^.]+$/, "", stem)
            id = tolower(stem)
            count[id]++
            files[id] = files[id] sprintf("  - %s\n", $0)
          }
          END {
            for (id in count) {
              if (count[id] > 1) {
                printf "id: %s\n%s", id, files[id]
              }
            }
          }
        '
  )"

  if [[ -n "$duplicates" ]]; then
    printf "\n[%s] Duplicate content IDs detected in %s.\n" "$(date +"%H:%M:%S")" "$label" >&2
    printf "Rename one of the conflicting files so each stem is unique.\n\n" >&2
    printf "%s\n" "$duplicates" >&2
    return 1
  fi
}

check_site_content_ids() {
  check_duplicate_content_ids "$ROOT_DIR/apps/site/src/content/posts" "posts"
  check_duplicate_content_ids "$ROOT_DIR/apps/site/src/content/projects" "projects"
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

  log "Check content IDs."
  check_site_content_ids

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

log "Check content IDs."
check_site_content_ids

log "Build site."
pnpm --dir "$ROOT_DIR/apps/site" run build

log "Install infra dependencies."
pnpm --dir "$ROOT_DIR/infra" install --frozen-lockfile

log "Build infra."
pnpm --dir "$ROOT_DIR/infra" run build

log "Synth infra."
pnpm --dir "$ROOT_DIR/infra" run synth

log "Validation complete."
