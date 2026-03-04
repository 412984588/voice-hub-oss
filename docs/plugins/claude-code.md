# Claude Code 插件

> Voice Hub Claude Code 插件 - 在 Claude Code 中使用实时语音交互

## 概述

`@voice-hub/claude-marketplace` 是 Claude Code 的 Marketplace 插件，允许你通过简单的命令在 Claude Code 中进行实时语音交互。

## 安装

### 通过 Claude Code Marketplace 安装（推荐）

1. 打开 Claude Code
2. 进入 Settings > Plugins
3. 搜索 "Voice Hub"
4. 点击 Install

### 本地开发安装

```bash
# 从源码安装到本地 Claude Code
./scripts/install-claude-plugin-local.sh
```

## 快速开始

### 安装后配置

1. 在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

2. 编辑 `.env`，填入你的配置：

```env
# Discord 配置
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id
DISCORD_VOICE_CHANNEL_ID=your_voice_channel_id

# 语音提供商（disabled, local-mock, doubao, qwen-dashscope）
VOICE_PROVIDER=local-mock

# Doubao 配置（如果使用 doubao）
DOUBAO_REALTIME_WS_URL=wss://...
DOUBAO_APP_ID=your_app_id
DOUBAO_ACCESS_TOKEN=your_access_token

# Qwen DashScope 配置（如果使用 qwen-dashscope）
QWEN_REALTIME_WS_URL=wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime
QWEN_API_KEY=your_qwen_api_key
QWEN_MODEL=qwen3-omni-flash-realtime

# Webhook 配置
WEBHOOK_PORT=8848
WEBHOOK_SECRET=your_webhook_secret
```

## 命令

插件在 Claude Code 中注册以下命令：

### voice.start

启动新的语音会话。

```
voice.start
```

可选参数：
- `userId` - 用户标识符
- `channelId` - Discord 语音频道 ID

### voice.stop

停止当前语音会话。

```
voice.stop
```

可选参数：
- `sessionId` - 要停止的会话 ID（默认为当前会话）

### voice.status

获取当前语音会话状态。

```
voice.status
```

可选参数：
- `sessionId` - 会话 ID（默认为当前会话）

返回示例：
```json
{
  "state": "LISTENING",
  "isActive": true
}
```

### voice.text

发送文本进行语音合成。

```
voice.text "你好，世界"
```

必需参数：
- `text` - 要合成的文本

可选参数：
- `sessionId` - 会话 ID（默认为当前会话）

### voice.listen

开始/停止语音输入监听。

```
voice.listen true   # 开始监听
voice.listen false  # 停止监听
```

必需参数：
- `enabled` - `true` 开始监听，`false` 停止监听

可选参数：
- `sessionId` - 会话 ID（默认为当前会话）

## 设置

插件在 Claude Code 中提供以下设置项：

### voice.provider

选择语音服务提供商。

- `disabled` - 禁用语音功能
- `local-mock` - 本地模拟（用于测试）
- `doubao` - 豆包实时语音

默认：`local-mock`

### voice.autoStart

创建会话时自动开始监听。

- `true` - 自动开始
- `false` - 手动开始

默认：`false`

### voice.saveAudio

保存音频录制到磁盘（用于调试）。

- `true` - 保存音频
- `false` - 不保存

默认：`false`

### voice.sampleRate

音频采样率。

- `16000` - 16 kHz
- `24000` - 24 kHz
- `48000` - 48 kHz

默认：`24000`

## 通知

插件会发送以下通知：

| 事件 | 消息 | 类型 |
|------|------|------|
| `session.started` | Voice session started | info |
| `session.ended` | Voice session ended | info |
| `listening.started` | Now listening for voice input... | info |
| `listening.stopped` | Stopped listening | info |
| `error` | Voice error occurred | error |

## 编程接口

### TypeScript

```typescript
import { VoiceHub } from '@voice-hub/claude-marketplace';

const hub = new VoiceHub({
  runtimeUrl: 'http://localhost:8848',
});

// 创建会话
const sessionId = await hub.createSession();

// 开始监听
await hub.startListening(sessionId);

// ... 交互 ...

// 清理
await hub.destroySession(sessionId);
```

## 配置文件

插件在 `.claude-plugin/manifest.json` 中定义其能力和配置。

### 环境变量

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `VOICE_PROVIDER` | 语音提供商 | `local-mock` | 否 |
| `DISCORD_BOT_TOKEN` | Discord 机器人令牌 | - | 是 |
| `DISCORD_GUILD_ID` | Discord 服务器 ID | - | 是 |
| `DISCORD_VOICE_CHANNEL_ID` | 默认语音频道 ID | - | 否 |
| `DOUBAO_REALTIME_WS_URL` | 豆包 WebSocket URL | - | 否 |
| `DOUBAO_APP_ID` | 豆包应用 ID | - | 否 |
| `DOUBAO_ACCESS_TOKEN` | 豆包访问令牌 | - | 否 |
| `QWEN_REALTIME_WS_URL` | Qwen DashScope WebSocket URL | - | 否 |
| `QWEN_API_KEY` | Qwen DashScope API Key | - | 否 |
| `QWEN_MODEL` | Qwen Realtime 模型 | `qwen3-omni-flash-realtime` | 否 |
| `MEMORY_DB_PATH` | SQLite 数据库路径 | `./data/voice-hub.db` | 否 |
| `WEBHOOK_PORT` | Webhook 端口 | `8848` | 否 |
| `WEBHOOK_SECRET` | Webhook 签名密钥 | - | 是 |

## 测试

```bash
# 运行插件测试
pnpm --filter @voice-hub/claude-marketplace test

# 运行 smoke test
./scripts/smoke-test.sh
```

## 故障排查

### 插件无法加载

确保：
1. Voice Hub 运行时已启动
2. 环境变量已正确配置
3. `.env` 文件存在于项目根目录

### 语音无法工作

1. 检查 `VOICE_PROVIDER` 设置
2. 确认 Discord Bot 已加入语音频道
3. 查看运行时日志

## 开发

```bash
# 构建
pnpm --filter @voice-hub/claude-marketplace build

# 类型检查
pnpm --filter @voice-hub/claude-marketplace typecheck

# 格式化
pnpm --filter @voice-hub/claude-marketplace format
```

## 许可证

MIT
