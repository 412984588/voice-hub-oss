# 安全说明

## 密钥管理

Voice Hub 采用 **BYOK (Bring Your Own Key)** 模式：

- ❌ 仓库中不包含任何真实 API 密钥
- ✅ 用户自行配置所需密钥
- ✅ 密钥通过环境变量加载
- ✅ `.env` 文件在 `.gitignore` 中被忽略

## 敏感信息扫描

项目包含密钥扫描脚本，用于检测意外提交的敏感信息：

```bash
pnpm secret-scan
```

扫描器会检查以下模式：

- Discord Bot Token
- API Key
- Secret/Password
- Bearer Token
- JWT Token

## Webhook 安全

### 签名验证

后端分发器支持 Webhook 签名验证：

1. 在 `.env` 中配置 `WEBHOOK_SECRET`
2. 后端发送请求时需包含 `X-Webhook-Signature` 与 `X-Webhook-Timestamp` 头
3. 服务器会使用 `WEBHOOK_SECRET` 进行 HMAC-SHA256 签名验证
4. 默认拒绝旧版 `X-Webhook-Secret` 头，只有在 `WEBHOOK_LEGACY_SECRET_HEADER=true` 时才会临时放行
5. 可通过 `WEBHOOK_SHADOW_MODE=true` 启用影子执行，验证 webhook 处理逻辑但不重复发送音频副作用

### 时间戳验证

Webhook 请求包含时间戳，服务器会检查：

- 时间戳与服务器时间差不超过 5 分钟
- 防止重放攻击

## 数据库安全

### SQLite WAL 模式

Memory Bank 使用 SQLite WAL (Write-Ahead Logging) 模式：

- 读写并发性能更好
- 更好的崩溃恢复
- 自动检查点

### 访问控制

- 数据库文件存储在 `./data/` 目录
- 确保目录权限正确设置
- 生产环境建议使用加密文件系统

## Discord Bot 安全

### 权限最小化

只请求必要的 Discord 权限：

- `Connect`: 连接语音频道
- `Speak`: 在语音频道中发言
- `applications.commands`: 使用斜杠命令

### Token 安全

- Bot Token 应该定期轮换
- 如果 Token 泄露，立即在 Discord Developer Portal 重置
- 不要在日志中打印 Token

## 网络安全

### CORS 配置

Web 服务器默认只允许本地开发来源：

- `http://localhost:3000`
- `http://127.0.0.1:3000`

生产环境请显式配置 `CORS_ALLOWED_ORIGINS`（逗号分隔）：

```bash
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
```

### 速率限制

建议在生产环境添加速率限制：

```typescript
import rateLimit from "@fastify/rate-limit";

fastify.register(rateLimit, {
  max: 100, // 每个 IP 每 15 分钟最多 100 次请求
  timeWindow: "15 minutes",
});
```

## 日志安全

### 敏感信息脱敏

日志系统会自动脱敏以下关键字段：

- `token`
- `secret`
- `password`
- `apikey`
- `authorization`

### 日志级别

生产环境建议使用 `warn` 或 `error` 级别：

```bash
LOG_LEVEL=warn
```

## 安全最佳实践

1. **定期更新依赖**：`pnpm update`
2. **使用 HTTPS**：生产环境必须使用 TLS
3. **启用防火墙**：限制端口访问
4. **定期备份**：备份 Memory Bank 数据库
5. **监控异常**：设置错误监控和告警
