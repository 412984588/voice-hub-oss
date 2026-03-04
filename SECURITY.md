# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

如果你发现安全漏洞，请勿直接创建 Issue。

请发送邮件至：**github-security@412984588.me**

包含以下信息：

- 漏洞描述
- 影响版本
- 复现步骤
- 建议的修复方案

我们会在确认漏洞后尽快修复，并协调发布时间。

## Security Best Practices

### 1. BYOK (Bring Your Own Key) 模式

Voice Hub 使用 BYOK 模式，不内置任何密钥。所有服务密钥通过环境变量配置：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑并填入你的密钥
vim .env
```

### 2. 环境变量管理

- **切勿提交 `.env` 文件到版本控制**
- 使用 `.env.example` 作为模板
- 不同环境使用不同的密钥（开发/测试/生产）

### 3. Webhook 安全

生产环境配置 Webhook 时：

- 使用 HTTPS 端点
- 启用 HMAC 签名验证
- 设置合理的超时时间

### 4. CORS 配置

生产环境请配置正确的 CORS 白名单：

```typescript
// 仅允许可信域名
allowedOrigins: ["https://your-domain.com"];
```

### 5. 密钥轮换

建议定期轮换 API 密钥：

- 豆包 API Key
- Discord Bot Token
- Claude API Key
- Webhook Secret

## Security Scanning

项目内置密钥扫描工具：

```bash
# 扫描是否有泄露的凭证
pnpm secret-scan
```

在提交代码前，请务必运行此命令。

## Dependency Updates

定期更新依赖以获取安全补丁：

```bash
# 检查过期依赖
pnpm outdated

# 更新依赖
pnpm update
```

## Additional Resources

- [docs/security.md](docs/security.md) - 详细安全文档
- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南
- [GitHub Security Advisories](https://github.com/412984588/voice-hub/security/advisories)
