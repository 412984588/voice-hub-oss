#!/bin/bash
# Codex 代码审查脚本
# 用法: ./scripts/codex-review.sh [full|quick]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="${1:-full}"

case "$MODE" in
  full)
    echo "🔍 启动全量代码审查..."
    exec codex exec --dangerously-bypass-approvals-and-sandbox -f "$PROJECT_ROOT/docs/prompts/codex-full-review.txt"
    ;;
  quick)
    echo "⚡ 启动快速代码审查..."
    exec codex exec --dangerously-bypass-approvals-and-sandbox -f "$PROJECT_ROOT/docs/prompts/codex-quick-review.txt"
    ;;
  *)
    echo "用法: $0 [full|quick]"
    echo ""
    echo "  full  - 全量审查（涵盖所有维度）"
    echo "  quick - 快速审查（仅关键问题）"
    exit 1
    ;;
esac
