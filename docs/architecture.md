# Voice Hub 架构说明

## 系统概述

Voice Hub 是一个模块化的实时语音中间层系统，采用 Monorepo 结构管理多个 npm 包。

```
clawdh/
├── packages/           # 核心库
│   ├── shared-types/   # 共享类型定义
│   ├── shared-config/  # 共享配置管理
│   ├── audio-engine/   # 音频处理引擎
│   ├── provider/       # 语音提供商抽象层
│   ├── memory-bank/    # 会话记忆存储
│   ├── backend-dispatcher/ # 后端分发器
│   ├── core-runtime/   # 核心运行时
│   ├── openclaw-plugin/    # OpenClaw 插件壳
│   ├── claude-mcp-server/  # Claude MCP Server
│   └── claude-marketplace/ # Claude Code Marketplace
└── apps/
    └── voice-hub-app/  # 主应用
```

## 核心组件

### 1. Audio Engine (`@voice-hub/audio-engine`)

负责 Discord 音频的收发、编解码、重采样等。

- **AudioIngressPump**: 接收 Discord 音频流
- **AudioEgressPump**: 发送音频到 Discord
- **Packetizer**: 将音频帧分割为 UDP 数据包
- **Resampler**: 采样率和声道转换
- **JitterBuffer**: 网络抖动缓冲

### 2. Provider (`@voice-hub/provider`)

语音提供商抽象层，支持多种实时语音服务。

- **IAudioProvider**: 提供商接口
- **DoubaoProvider**: 豆包实时语音实现
- **QwenDashscopeProvider**: Qwen DashScope 实时语音实现
- **LocalMockProvider**: 本地 Mock（测试用）
- **createProvider()**: 提供商工厂函数

### 3. Memory Bank (`@voice-hub/memory-bank`)

基于 SQLite + WAL 模式的会话记忆存储。

- **MemoryStore**: 记忆存储 API
- **DatabaseManager**: 数据库连接管理
- 支持会话管理、对话历史、事件记录

### 4. Backend Dispatcher (`@voice-hub/backend-dispatcher`)

后端分发器，将事件分发到 OpenClaw/Claude-Code Webhook。

- **Dispatcher**: 单个后端分发
- **LoadBalancedDispatcher**: 负载均衡分发
- 支持重试、超时、指数退避

### 5. Core Runtime (`@voice-hub/core-runtime`)

核心运行时，整合所有组件。

- **VoiceRuntime**: 主运行时类
- **SessionManager**: 会话管理
- **StateMachine**: 会话状态机

### 6. Plugins

- **OpenClaw Plugin**: OpenClaw 系统集成
- **Claude MCP Server**: Model Context Protocol 服务器
- **Claude Marketplace**: Claude Code 插件清单

## 数据流

```
Discord Voice Channel
       ↓
AudioEngine (收发/编解码)
       ↓
Provider (实时语音处理)
       ↓
CoreRuntime (会话管理/状态机)
       ↓
BackendDispatcher (分发到后端)
       ↓
OpenClaw / Claude Code / Workers
       ↓
MemoryBank (存储会话记忆)
```

## 状态机

```
┌─────────┐
│  IDLE   │ ← 会话创建
└────┬────┘
     │
     ↓
┌───────────┐
│ LISTENING │ ← 开始监听
└─────┬─────┘
      │
      ↓ (收到用户语音)
┌──────────────┐
│  PROCESSING  │ ← 处理中
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  RESPONDING  │ ← 返回响应
└──────┬───────┘
       │
       ↓
┌─────────┐
│  IDLE   │ ← 回到空闲
└─────────┘
```

## 配置系统

所有配置通过环境变量加载，由 `@voice-hub/shared-config` 统一管理：

```bash
# Discord 配置
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_VOICE_CHANNEL_ID=

# 语音提供商
VOICE_PROVIDER=disabled|local-mock|doubao|qwen-dashscope

# 豆包配置
DOUBAO_REALTIME_WS_URL=
DOUBAO_APP_ID=
DOUBAO_ACCESS_TOKEN=

# Qwen DashScope 配置
QWEN_REALTIME_WS_URL=
QWEN_API_KEY=
QWEN_MODEL=qwen3-omni-flash-realtime

# 记忆存储
MEMORY_DB_PATH=./data/memory_bank.db
MEMORY_WAL_ENABLED=true

# Webhook 安全与调试
WEBHOOK_SECRET=
WEBHOOK_LEGACY_SECRET_HEADER=false
WEBHOOK_SHADOW_MODE=false

# CORS 允许列表（逗号分隔）
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```
