# Voice Hub - 全双工语音中间层

> Discord + OpenClaw + Claude Code 双插件实时语音系统

## 简介

Voice Hub 是一个可安装、可本地联调、可开源分发的实时语音中间层系统。它实现了：

- **前台**：Discord 语音机器人
- **实时语音**：火山引擎豆包端到端实时语音模型（Omni 方向）
- **后台执行**：OpenClaw / Claude Code / 外部 worker
- **核心体验**：像打电话一样实时对话，支持打断

## 特性

- ✅ 全双工实时语音对话
- ✅ 支持用户打断（Barge-in）
- ✅ 异步后台任务分发
- ✅ Memory Bank 记录坑点与成功模式
- ✅ BYOK（Bring Your Own Key）- 无内置密钥
- ✅ OpenClaw 插件支持
- ✅ Claude Code 插件支持
- ✅ Webhook 安全验签
- ✅ 会话隔离与防串台

## 快速开始

### 前置要求

- Node.js >= 22.12.0
- pnpm >= 9.0.0
- Discord Bot Token

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-org/clawdh.git
cd clawdh

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的密钥

# 构建
pnpm build

# 运行测试
pnpm test
```

### 本地开发

```bash
# 启动开发服务器
pnpm --filter @voice-hub/app dev

# 或者使用 doctor 检查配置
pnpm doctor

# 发布前门禁检查
pnpm release:gate
```

## 插件

Voice Hub 提供两个插件，分别用于 OpenClaw 和 Claude Code 集成：

### OpenClaw 插件

位于 `packages/openclaw-plugin/`，提供 OpenClaw 系统的语音中间层接口。

```bash
# 本地安装到 OpenClaw
./scripts/install-openclaw-local.sh
```

**功能**：
- 会话管理（创建/销毁）
- 语音输入/输出
- 音频数据传输
- 状态查询

详见：[OpenClaw 插件文档](docs/plugins/openclaw.md)

### Claude Code 插件

位于 `packages/claude-marketplace/`，提供 Claude Code Marketplace 集成。

```bash
# 本地安装到 Claude Code
./scripts/install-claude-plugin-local.sh
```

**功能**：
- `voice.start` - 启动语音会话
- `voice.stop` - 停止语音会话
- `voice.status` - 获取会话状态
- `voice.text` - 发送文本转语音
- `voice.listen` - 开始/停止监听

详见：[Claude Code 插件文档](docs/plugins/claude-code.md)

## 文档

- [架构说明](docs/architecture.md)
- [安装指南](docs/install.md)
- [安全说明](docs/security.md)
- [插件开发](docs/plugins/)
- [故障排查](docs/troubleshooting.md)

## BYOK 声明

本项目采用 **BYOK (Bring Your Own Key)** 模式：

- ❌ 仓库中不包含任何真实 API 密钥
- ✅ 用户自行配置所需密钥
- ✅ 支持 `.env` 文件配置
- ✅ 支持 provider 切换（disabled, local-mock, doubao, qwen-dashscope）

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
