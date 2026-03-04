# 故障排查

## 常见问题

### Bot 无法连接到 Discord

**症状**: `Error: An invalid token was provided`

**解决方案**:

1. 检查 `.env` 中的 `DISCORD_BOT_TOKEN` 是否正确
2. 确保没有多余的空格或引号
3. 在 Discord Developer Portal 重置 Token

### Bot 无法加入语音频道

**症状**: Bot 在服务器中但没有连接语音

**解决方案**:

1. 检查 Bot 的权限：需要 `Connect` 和 `Speak`
2. 检查 `DISCORD_VOICE_CHANNEL_ID` 是否正确
3. 确保频道是语音频道（不是文字频道）

### 音频无输出

**症状**: Bot 连接了但没有声音

**解决方案**:

1. 检查系统音频输出设置
2. 检查 `VOICE_PROVIDER` 配置
3. 查看日志是否有编码器错误

### 内存泄漏

**症状**: 长时间运行后内存占用过高

**解决方案**:

1. 重启服务：`pnpm restart`
2. 清空旧的会话数据
3. 检查 Memory Bank 是否有大量历史记录

### Webhook 不工作

**症状**: 后端没有收到事件

**解决方案**:

1. 检查 `BACKEND_DISPATCH_URL` 是否正确
2. 检查后端服务器是否运行
3. 检查网络连接和防火墙

### 数据库锁定

**症状**: `SQLITE_BUSY: database is locked`

**解决方案**:

1. 增加 `MEMORY_BUSY_TIMEOUT`
2. 确保 WAL 模式已启用：`MEMORY_WAL_ENABLED=true`
3. 关闭其他可能访问数据库的进程

## 调试命令

### 查看日志

```bash
# 启动时显示详细日志
LOG_LEVEL=debug pnpm start
```

### 运行诊断

```bash
pnpm doctor
```

### 扫描密钥

```bash
pnpm secret-scan
```

### 类型检查

```bash
pnpm typecheck
```

### 运行测试

```bash
pnpm test
```

## 获取帮助

如果问题仍未解决：

1. 检查 [GitHub Issues](https://github.com/your-org/clawdh/issues)
2. 搜索已有问题
3. 创建新 Issue 时提供：
   - Node.js 版本
   - pnpm 版本
   - 操作系统
   - 完整的错误日志
   - 重现步骤
