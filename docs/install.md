# 安装指南

## 系统要求

- **Node.js**: >= 22.12.0
- **pnpm**: >= 9.0.0
- **Discord Bot**: 需要创建 Discord 应用并获取 Bot Token
- **操作系统**: Linux / macOS / Windows (WSL2)

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/clawdh.git
cd clawdh
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```bash
# Discord Bot 配置
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_VOICE_CHANNEL_ID=your_voice_channel_id

# 语音提供商选择
VOICE_PROVIDER=local-mock  # 测试用本地 Mock

# 如果使用豆包实时语音
DOUBAO_REALTIME_WS_URL=wss://...
DOUBAO_APP_ID=your_app_id
DOUBAO_ACCESS_TOKEN=your_access_token

# 如果使用 Qwen DashScope 实时语音
QWEN_REALTIME_WS_URL=wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime
QWEN_API_KEY=your_qwen_api_key
QWEN_MODEL=qwen3-omni-flash-realtime

# Webhook 安全（建议）
WEBHOOK_SECRET=replace_with_a_random_secret
WEBHOOK_LEGACY_SECRET_HEADER=false
WEBHOOK_SHADOW_MODE=false

# CORS 允许列表（逗号分隔）
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 4. 构建

```bash
pnpm build
```

### 5. 运行测试

```bash
pnpm test
```

### 6. 启动服务

```bash
pnpm --filter @voice-hub/app start
```

## Discord Bot 配置

### 创建 Discord 应用

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 "New Application" 创建应用
3. 在 "Bot" 页面创建 Bot 并复制 Token
4. 在 "OAuth2" 页面生成邀请 URL，需要以下权限：
   - `bot`
   - `applications.commands`
   - `Connect`
   - `Speak`

### 获取 Guild ID 和 Channel ID

1. 在 Discord 设置中启用 "Developer Mode"
2. 右键点击服务器 → "Copy ID" 获取 Guild ID
3. 右键点击语音频道 → "Copy ID" 获取 Channel ID

## 豆包实时语音配置

### 获取豆包凭证

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 开通"实时语音"服务
3. 创建应用获取 AppID
4. 生成访问令牌 (Access Token)

### 配置 WebSocket URL

豆包实时语音 WebSocket URL 格式：

```
wss://openspeech.bytedance.com/api/v1/asr
```

## 验证安装

运行诊断命令：

```bash
pnpm doctor
```

服务健康检查：

```bash
curl http://127.0.0.1:8911/health
curl http://127.0.0.1:8911/ready
```

检查输出，确保所有项目都显示 ✓

## 故障排查

### 端口被占用

修改 `.env` 中的 `WEBHOOK_PORT`：

```bash
WEBHOOK_PORT=8911  # 改为其他端口
```

### 依赖安装失败

尝试清理缓存：

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Discord Bot 无法连接

- 检查 Bot Token 是否正确
- 检查 Bot 是否被邀请到服务器
- 检查 Bot 是否有连接语音权限
