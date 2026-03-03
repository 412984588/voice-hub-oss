#!/bin/bash
# Voice Hub Smoke Test - 快速验证插件可用性
#
# 用法: ./scripts/smoke-test.sh
#
# 验证项目:
#   1. TypeScript 编译通过
#   2. 测试文件存在并可运行
#   3. 插件配置文件有效
#   4. 安装脚本有可执行权限

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# 测试函数
test_step() {
  local name="$1"
  local command="$2"

  echo -n "Testing: $name ... "

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS_COUNT++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ((FAIL_COUNT++))
    return 1
  fi
}

echo "=========================================="
echo "Voice Hub Smoke Test"
echo "=========================================="
echo ""

# 1. 检查项目结构
test_step "Project structure exists" "[ -d packages ] && [ -f package.json ]"
test_step "openclaw-plugin package exists" "[ -d packages/openclaw-plugin ]"
test_step "claude-marketplace package exists" "[ -d packages/claude-marketplace ]"

# 2. 检查源文件
test_step "openclaw-plugin source exists" "[ -f packages/openclaw-plugin/src/index.ts ]"
test_step "claude-marketplace source exists" "[ -f packages/claude-marketplace/src/index.ts ]"

# 3. 检查测试文件
test_step "openclaw-plugin test exists" "[ -f packages/openclaw-plugin/test/index.test.ts ]"
test_step "claude-marketplace test exists" "[ -f packages/claude-marketplace/test/index.test.ts ]"

# 4. 检查插件配置
test_step "openclaw.plugin.json is valid JSON" "jq empty packages/openclaw-plugin/openclaw.plugin.json > /dev/null"
test_step "claude-plugin manifest is valid JSON" "jq empty packages/claude-marketplace/.claude-plugin/manifest.json > /dev/null"

# 5. 检查安装脚本
test_step "install-openclaw-local.sh is executable" "[ -x scripts/install-openclaw-local.sh ]"
test_step "install-claude-plugin-local.sh is executable" "[ -x scripts/install-claude-plugin-local.sh ]"
test_step "smoke-test.sh is executable" "[ -x scripts/smoke-test.sh ]"

# 6. TypeScript 类型检查
echo ""
echo -e "${YELLOW}Running TypeScript type checks...${NC}"
if pnpm typecheck > /dev/null 2>&1; then
  echo -e "TypeScript: ${GREEN}PASS${NC}"
  ((PASS_COUNT++))
else
  echo -e "TypeScript: ${RED}FAIL${NC}"
  ((FAIL_COUNT++))
fi

# 7. 运行测试
echo ""
echo -e "${YELLOW}Running test suite...${NC}"
if pnpm test > /dev/null 2>&1; then
  echo -e "Tests: ${GREEN}PASS${NC}"
  ((PASS_COUNT++))
else
  echo -e "Tests: ${RED}FAIL${NC}"
  ((FAIL_COUNT++))
fi

# 8. 检查构建
echo ""
echo -e "${YELLOW}Running build...${NC}"
if pnpm build > /dev/null 2>&1; then
  echo -e "Build: ${GREEN}PASS${NC}"
  ((PASS_COUNT++))
else
  echo -e "Build: ${RED}FAIL${NC}"
  ((FAIL_COUNT++))
fi

# 总结
echo ""
echo "=========================================="
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=========================================="

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please check the output above.${NC}"
  exit 1
fi
