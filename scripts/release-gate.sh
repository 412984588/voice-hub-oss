#!/bin/bash
# Release Gate - 发布前统一门禁检查

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

run_step() {
  local name="$1"
  shift
  echo -e "${BLUE}==>${NC} $name"
  "$@"
}

ensure_no_matches() {
  local name="$1"
  local command="$2"
  local tmp_file
  tmp_file="$(mktemp)"

  echo -e "${BLUE}==>${NC} $name"
  if bash -lc "$command" >"$tmp_file" 2>&1; then
    echo -e "${RED}FAIL${NC}: $name"
    cat "$tmp_file"
    rm -f "$tmp_file"
    exit 1
  fi

  rm -f "$tmp_file"
  echo -e "${GREEN}PASS${NC}: $name"
}

echo "=========================================="
echo "Voice Hub Release Gate"
echo "=========================================="

run_step "pnpm typecheck" pnpm typecheck
run_step "pnpm test" pnpm test
run_step "pnpm build" pnpm build
run_step "pnpm lint" pnpm lint
run_step "pnpm secret-scan" pnpm secret-scan
run_step "./scripts/smoke-test.sh" ./scripts/smoke-test.sh

ensure_no_matches \
  "No TODO/FIXME/XXX in TypeScript sources" \
  "grep -rn \"TODO\\|FIXME\\|XXX\" --include=\"*.ts\" --include=\"*.tsx\" packages/ apps/"

ensure_no_matches \
  "No ': any' in non-test TypeScript sources" \
  "grep -rn \": any\" --include=\"*.ts\" --include=\"*.tsx\" packages/ apps/ | grep -v \"test\\|spec\""

ensure_no_matches \
  "No console.* in non-test TypeScript sources" \
  "grep -rn \"console\\.\" --include=\"*.ts\" --include=\"*.tsx\" packages/ apps/ | grep -v \"test\\|spec\""

ensure_no_matches \
  "No bare catch blocks in non-test TypeScript sources" \
  "grep -rn \"catch[[:space:]]*{\" --include=\"*.ts\" --include=\"*.tsx\" packages/ apps/ | grep -v \"test\\|spec\""

echo ""
echo -e "${GREEN}Release gate passed.${NC}"
