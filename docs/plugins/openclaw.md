# OpenClaw 插件

> Voice Hub OpenClaw 插件 - 为 OpenClaw 系统提供实时语音中间层能力

## 概述

`@voice-hub/openclaw-plugin` 是 OpenClaw 系统的插件，允许 OpenClaw agents 通过简单的 API 进行实时语音交互。

## 安装

### 通过 npm 安装

```bash
pnpm add @voice-hub/openclaw-plugin
```

### 本地开发安装

```bash
# 从源码安装到本地 OpenClaw
./scripts/install-openclaw-local.sh
```

## 快速开始

### 基本用法

```typescript
import { createPlugin } from '@voice-hub/openclaw-plugin';

// 创建插件实例
const plugin = createPlugin('http://localhost:8848', 'optional-api-key');

// 创建语音会话
const sessionId = await plugin.createSession('user-123', 'channel-456');

// 开始监听语音输入
await plugin.startListening(sessionId);

// ... 交互过程 ...

// 停止监听
await plugin.stopListening(sessionId);

// 销毁会话
await plugin.destroySession(sessionId);
```

### 发送文本转语音

```typescript
// 通过 OpenClaw 发送待合成的文本
const audioData = new ArrayBuffer(1024);
await plugin.sendAudio(sessionId, audioData);
```

### 获取会话状态

```typescript
const status = await plugin.getSessionStatus(sessionId);
console.log(status.state);      // 'IDLE', 'LISTENING', 'PROCESSING', etc.
console.log(status.isActive);   // true/false
```

## API 参考

### createPlugin(runtimeUrl, apiKey?)

创建插件实例。

- **runtimeUrl**: `string` - Voice Hub 运行时 URL
- **apiKey**: `string` (可选) - API 认证密钥

返回 `OpenClawVoiceHubPlugin` 实例。

### OpenClawVoiceHubPlugin

#### createSession(userId?, channelId?)

创建新的语音会话。

- **userId**: `string` (可选) - 用户标识
- **channelId**: `string` (可选) - Discord 语音频道 ID

返回 `Promise<string>` - 会话 ID

#### destroySession(sessionId)

销毁指定会话。

- **sessionId**: `string` - 会话 ID

#### startListening(sessionId)

开始监听语音输入。

- **sessionId**: `string` - 会话 ID

#### stopListening(sessionId)

停止监听语音输入。

- **sessionId**: `string` - 会话 ID

#### sendAudio(sessionId, audioData)

发送音频数据到会话。

- **sessionId**: `string` - 会话 ID
- **audioData**: `ArrayBuffer` - 音频数据（自动 base64 编码）

#### getSessionStatus(sessionId)

获取会话当前状态。

- **sessionId**: `string` - 会话 ID

返回 `Promise<{ state: string, isActive: boolean }>`

## 配置

插件通过环境变量进行配置：

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `VOICE_PROVIDER` | 语音提供商（disabled/local-mock/doubao/qwen-dashscope） | `local-mock` | 否 |
| `DISCORD_BOT_TOKEN` | Discord 机器人令牌 | - | 是 |
| `DISCORD_GUILD_ID` | Discord 服务器 ID | - | 是 |
| `WEBHOOK_PORT` | Webhook 端口 | `8848` | 否 |
| `WEBHOOK_SECRET` | Webhook 签名密钥 | - | 是 |

## 能力

插件支持以下 OpenClaw 能力：

- `voice.input` - 接收语音输入（PCM16/Opus，16/24/48kHz）
- `voice.output` - 发送语音输出（PCM16/Opus，16/24/48kHz）
- `session.manage` - 会话管理
- `backend.dispatch` - 后台事件分发

## 测试

```bash
# 运行插件测试
pnpm --filter @voice-hub/openclaw-plugin test

# 运行 smoke test
./scripts/smoke-test.sh
```

## 故障排查

### 连接失败

确保 Voice Hub 运行时已启动：

```bash
# 检查运行时状态
curl http://localhost:8848/health
```

### 认证错误

检查 `WEBHOOK_SECRET` 是否正确配置，以及 API Key 是否有效。

## 开发

```bash
# 构建
pnpm --filter @voice-hub/openclaw-plugin build

# 类型检查
pnpm --filter @voice-hub/openclaw-plugin typecheck

# 格式化
pnpm --filter @voice-hub/openclaw-plugin format
```

## 许可证

MIT
