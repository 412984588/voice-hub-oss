# Voice Hub - Claude Code 指南

> Voice Hub 全双工实时语音中间层 - Discord + OpenClaw + Claude Code

## 项目概述

pnpm monorepo 架构，11 个核心包 + 1 个主应用。状态机驱动、事件型、Provider 抽象。

### 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│  shared-types (共享类型)   ← 所有包依赖此                      │
├─────────────────────────────────────────────────────────────┤
│  provider / memory-bank (领域层)                             │
├─────────────────────────────────────────────────────────────┤
│  core-runtime (核心运行时)                                    │
├─────────────────────────────────────────────────────────────┤
│  apps / openclaw-plugin / claude-* (应用层)                  │
└─────────────────────────────────────────────────────────────┘
```

## 常用命令

### 根目录命令
```bash
# 全量构建
pnpm build

# 类型检查
pnpm typecheck

# 全量测试
pnpm test

# 单包测试
pnpm --filter <package-name> test

# 代码检查
pnpm lint

# 格式化
pnpm format

# 配置诊断
pnpm doctor

# 密钥扫描
pnpm secret-scan

# 清理
pnpm clean
```

### 包列表
| 包名 | 说明 |
|------|------|
| `shared-types` | 类型定义 - SessionState, ProviderEvent, VoiceHubEvent |
| `shared-config` | 配置验证 - Config 类型, 环境变量加载 |
| `provider` | Provider 抽象 - BaseProvider, 工厂方法 |
| `memory-bank` | 记忆存储 -坑点记录, 成功模式 |
| `core-runtime` | 运行时核心 - StateMachine, SessionManager, VoiceRuntime |
| `audio-engine` | 音频处理 - 编解码, 重采样 |
| `backend-dispatcher` | 后台任务分发 |
| `openclaw-plugin` | OpenClaw 插件 |
| `claude-mcp-server` | Claude MCP 服务器 |
| `claude-marketplace` | Claude Marketplace 包 |
| `voice-hub-app` | 主应用 |

## 架构要点

### 1. 状态机 (SessionState)
位于：`packages/core-runtime/src/state-machine.ts`

```
IDLE → CONNECTING → CONNECTED → LISTENING → PROCESSING → RESPONDING → LISTENING
  ↓                              ↓
DISCONNECTING → DISCONNECTED   ERROR → IDLE
```

10 种状态，严格转换规则。非法转换会触发 error 事件。

### 2. Provider 抽象 (BaseProvider)
位于：`packages/provider/src/base-provider.ts`

抽象类 `BaseProvider` 继承 `EventEmitter3`：

```typescript
abstract class BaseProvider {
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract startStream(): Promise<void>
  abstract stopStream(): Promise<void>
  abstract sendFrame(frame: AudioFrame): Promise<void>

  on(event: 'audio' | 'connected' | 'disconnected' | 'ready' | 'error', listener): this
}
```

支持类型：`disabled`, `local-mock`, `doubao`

### 3. 事件系统
位于：`packages/shared-types/src/events.ts`

联合类型 `VoiceHubEvent`：
- `AudioEvent` - 音频帧
- `SystemSessionEvent` - 会话状态变更
- `ProviderEvent` - Provider 连接/断开/错误
- `BackendTaskEvent` - 后台任务分发/完成/失败

### 4. Provider 工厂
位于：`packages/provider/src/factory.ts`

```typescript
function createProvider(config: Config, sessionId: string): IAudioProvider | null
function validateProviderConfig(config: Config): { valid: boolean; errors: string[] }
function isProviderAvailable(provider: IAudioProvider | null): boolean
```

## 开发注意事项

### 状态转换
- 使用 `stateMachine.canTransitionTo(newState)` 检查转换有效性
- 非法转换会触发 error 事件，返回 `false`
- 监听 `state_changed` 事件追踪状态变化

### Provider 事件
- `audio` - 音频帧到达
- `connected` - WebSocket 连接成功
- `ready` - 可以开始发送音频
- `disconnected` - 连接断开
- `error` - Provider 错误

### 类型导入
从 `@voice-hub/shared-types` 导入所有共享类型：
```typescript
import { SessionState, VoiceHubEvent, ProviderEvent } from '@voice-hub/shared-types'
```

### Provider 创建
使用工厂方法，不要直接 new：
```typescript
import { createProvider } from '@voice-hub/provider'
const provider = createProvider(config, sessionId)
```

### BYOK 配置
所有密钥通过环境变量配置，`.env.example` 是模板。项目不包含任何真实密钥。

## 调试技巧

1. **查看当前状态**：监听 `state_changed` 事件
2. **Provider 调试**：使用 `local-mock` provider 替代真实服务
3. **配置检查**：运行 `pnpm doctor` 验证环境变量
4. **密钥扫描**：运行 `pnpm secret-scan` 检查是否意外提交密钥

## 扩展新 Provider

1. 继承 `BaseProvider`：
```typescript
export class MyProvider extends BaseProvider {
  readonly capabilities = { sampleRates: [16000, 24000], ... }
  async connect() { ... }
  // 实现其他抽象方法
}
```

2. 在 `factory.ts` 添加 case：
```typescript
case 'my-provider':
  return new MyProvider({ ...baseConfig, ... })
```

3. 在 `shared-config` 中添加配置类型

## 参考文档

- [README.md](README.md) - 项目介绍
- [docs/architecture.md](docs/architecture.md) - 详细架构
- [docs/troubleshooting.md](docs/troubleshooting.md) - 故障排查
