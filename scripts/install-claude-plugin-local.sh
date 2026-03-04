#!/bin/bash
# install-claude-plugin-local.sh
# 本地安装 Claude Code 插件到 Claude Code 系统

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$PROJECT_ROOT/packages/claude-marketplace"

echo "🔌 安装 Voice Hub Claude Code 插件..."

# 检查 Claude Code 插件目录
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
if [ ! -d "$CLAUDE_DIR" ]; then
  echo "❌ Claude Code 目录不存在: $CLAUDE_DIR"
  echo "   请设置 CLAUDE_DIR 环境变量或确认 Claude Code 已安装"
  exit 1
fi

PLUGINS_DIR="$CLAUDE_DIR/plugins/voice-hub"
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
cp "$PLUGIN_DIR/.claude-plugin/manifest.json" "$PLUGINS_DIR/"

# 创建插件入口点 (使用 CLAUDE_PLUGIN_ROOT 环境变量)
cat > "$PLUGINS_DIR/index.js" << 'EOF'
/**
 * Voice Hub Claude Code Plugin Entry Point
 *
 * 这个文件作为 Claude Code 插件的入口点
 * 实际实现在 dist/index.js 中
 */

import { VoiceHubPlugin } from './dist/index.js';

// 创建插件实例
const plugin = new VoiceHubPlugin({
  pluginRoot: process.env.CLAUDE_PLUGIN_ROOT,
});

// 导出 Claude Code 需要的接口
export const commands = plugin.getCommands();
export const settings = plugin.getSettings();
export const handlers = plugin.getHandlers();

export default plugin;
EOF

# 创建环境变量配置示例
cat > "$PLUGINS_DIR/.env.example" << 'EOF'
# Voice Hub Claude Code Plugin Configuration

# Discord Configuration (必需)
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_VOICE_CHANNEL_ID=your_voice_channel_id

# Voice Provider (disabled, local-mock, doubao)
VOICE_PROVIDER=local-mock

# Doubao Configuration (如果使用 doubao)
DOUBAO_REALTIME_WS_URL=wss://...
DOUBAO_APP_ID=your_app_id
DOUBAO_ACCESS_TOKEN=your_access_token

# Memory Storage
MEMORY_DB_PATH=./data/voice-hub.db

# Webhook Server
WEBHOOK_PORT=8848
WEBHOOK_SECRET=your_webhook_secret_here
EOF

# 注册到 Claude Code (如果支持)
REGISTRY_FILE="$CLAUDE_DIR/plugins/registry.json"
if [ -f "$REGISTRY_FILE" ]; then
  echo "📝 注册插件到 Claude Code..."
  if command -v jq &> /dev/null; then
    jq --arg id "voice-hub" --arg path "$PLUGINS_DIR" \
      '.plugins[$id] = {"path": $path, "enabled": true, "version": "0.1.0"}' \
      "$REGISTRY_FILE" > "$REGISTRY_FILE.tmp" && mv "$REGISTRY_FILE.tmp" "$REGISTRY_FILE"
  else
    echo "⚠️  jq 未安装，请手动注册插件"
  fi
fi

echo "✅ 安装完成！"
echo ""
echo "📌 下一步："
echo "   1. 配置环境变量: cp $PLUGINS_DIR/.env.example $CLAUDE_DIR/plugins/voice-hub/.env"
echo "   2. 编辑 .env 文件填入真实配置"
echo "   3. 重启 Claude Code"
echo "   4. 在 Claude Code 中启用插件: Settings > Plugins > Voice Hub"
