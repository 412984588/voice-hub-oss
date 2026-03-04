#!/bin/bash
# install-openclaw-local.sh
# 本地安装 OpenClaw 插件到 OpenClaw 系统

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$PROJECT_ROOT/packages/openclaw-plugin"

echo "🔌 安装 Voice Hub OpenClaw 插件..."

# 检查 OpenClaw 安装目录
OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
if [ ! -d "$OPENCLAW_DIR" ]; then
  echo "❌ OpenClaw 目录不存在: $OPENCLAW_DIR"
  echo "   请设置 OPENCLAW_DIR 环境变量或确认 OpenClaw 已安装"
  exit 1
fi

PLUGINS_DIR="$OPENCLAW_DIR/plugins/voice-hub"
echo "📁 目标目录: $PLUGINS_DIR"

# 创建插件目录
mkdir -p "$PLUGINS_DIR"

# 构建插件
echo "🔨 构建插件..."
cd "$PLUGIN_DIR"
pnpm build

# 复制文件
echo "📋 复制插件文件..."
cp -r "$PLUGIN_DIR/dist" "$PLUGINS_DIR/"
cp "$PLUGIN_DIR/package.json" "$PLUGINS_DIR/"
cp "$PLUGIN_DIR/openclaw.plugin.json" "$PLUGINS_DIR/"
cp "$PLUGIN_DIR/tsconfig.json" "$PLUGINS_DIR/" 2>/dev/null || true

# 创建符号链接到 node_modules（如果使用 workspace）
if [ -L "$PROJECT_ROOT/node_modules/@voice-hub/openclaw-plugin" ]; then
  echo "🔗 检测到 workspace，创建引用..."
  echo "@voice-hub/openclaw-plugin=file:$PROJECT_ROOT/packages/openclaw-plugin" > "$PLUGINS_DIR/package.json"
fi

# 注册到 OpenClaw
MANIFEST_FILE="$OPENCLAW_DIR/plugins/manifest.json"
if [ -f "$MANIFEST_FILE" ]; then
  echo "📝 注册插件到 OpenClaw..."
  # 使用 jq 添加插件，如果不存在则创建
  if command -v jq &> /dev/null; then
    jq --arg id "voice-hub" --arg path "$PLUGINS_DIR" \
      '.plugins[$id] = {"path": $path, "enabled": true}' \
      "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"
  else
    echo "⚠️  jq 未安装，请手动注册插件到 $MANIFEST_FILE"
  fi
fi

echo "✅ 安装完成！"
echo ""
echo "📌 下一步："
echo "   1. 配置环境变量 (见 .env.example)"
echo "   2. 重启 OpenClaw: openclaw restart"
echo "   3. 验证: openclaw plugin list"
