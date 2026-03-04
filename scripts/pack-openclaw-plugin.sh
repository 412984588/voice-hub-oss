#!/bin/bash
# pack-openclaw-plugin.sh
# 打包 OpenClaw 插件为 .tar.gz

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$PROJECT_ROOT/packages/openclaw-plugin"
DIST_DIR="$PROJECT_ROOT/dist"

echo "📦 打包 OpenClaw 插件..."

# 确保构建产物存在
cd "$PLUGIN_DIR"
if [ ! -d "dist" ]; then
  echo "⚠️  dist 目录不存在，先构建..."
  pnpm build
fi

# 创建输出目录
mkdir -p "$DIST_DIR"

# 版本号
VERSION=$(node -p "require('$PLUGIN_DIR/package.json').version")
PKG_NAME="voice-hub-openclaw-plugin-v${VERSION}"

# 创建临时打包目录
TMP_DIR="$DIST_DIR/$PKG_NAME"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# 复制必要文件
echo "📋 复制文件..."
cp -r "$PLUGIN_DIR/dist" "$TMP_DIR/"
cp "$PLUGIN_DIR/package.json" "$TMP_DIR/"
cp "$PLUGIN_DIR/openclaw.plugin.json" "$TMP_DIR/"
cp "$PLUGIN_DIR/README.md" "$TMP_DIR/" 2>/dev/null || echo "# Voice Hub OpenClaw Plugin" > "$TMP_DIR/README.md"

# 创建打包
echo "🗜️  压缩..."
cd "$DIST_DIR"
tar -czf "${PKG_NAME}.tar.gz" "$PKG_NAME"
rm -rf "$TMP_DIR"

echo "✅ 打包完成: $DIST_DIR/${PKG_NAME}.tar.gz"
ls -lh "$DIST_DIR/${PKG_NAME}.tar.gz"
