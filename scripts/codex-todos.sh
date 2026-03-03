#!/bin/bash
# Codex TODO 实现脚本
# 用途: 继续完成项目剩余的 TODO 项

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📋 启动 TODO 实现工作流..."
echo ""
echo "第一步：提交已完成的修复"
echo "第二步：扫描并实现剩余 TODO"
echo ""

exec codex exec --dangerously-bypass-approvals-and-sandbox -f "$PROJECT_ROOT/docs/prompts/codex-next-todos.txt"
