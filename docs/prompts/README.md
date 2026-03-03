# Codex 代码审查提示词

Voice Hub 项目专用的 Codex 代码审查提示词集合。

## 提示词列表

| 文件 | 说明 | 用途 |
|------|------|------|
| `codex-full-review.txt` | 全量审查 | 全面扫描所有维度的问题 |
| `codex-quick-review.txt` | 快速审查 | 仅检查关键问题 |

## 使用方法

### 方式 1：使用脚本（推荐）

```bash
# 全量审查
./scripts/codex-review.sh full

# 快速审查
./scripts/codex-review.sh quick
```

### 方式 2：直接使用 Codex

```bash
# 全量审查
codex exec --dangerously-bypass-approvals-and-sandbox -f docs/prompts/codex-full-review.txt

# 快速审查
codex exec --dangerously-bypass-approvals-and-sandbox -f docs/prompts/codex-quick-review.txt
```

## 审查维度

### [CRITICAL] 必须修复
- **Bug 与错误**：类型错误、空值引用、未处理的异常、边界条件、逻辑错误、资源泄漏
- **安全问题**：硬编码凭证、敏感信息泄露、输入验证、注入风险

### [HIGH] 应该修复
- **性能问题**：重复计算、不必要的循环、大对象拷贝、内存泄漏风险、异步处理

### [MEDIUM] 建议修复
- **代码质量**：重复代码、命名不规范、注释缺失、函数过长、嵌套过深、魔法数字

### [LOW] 可选修复
- **代码风格**：一致性、简化、格式问题

## 执行后验证

审查完成后，运行完整验证：

```bash
pnpm typecheck      # 类型检查
pnpm test           # 所有测试
pnpm build          # 构建
```

## 注意事项

1. **自动化执行**：使用 `--dangerously-bypass-approvals-and-sandbox` 标志让 Codex 自动执行修复
2. **测试验证**：每次修复后会自动运行 `pnpm test` 验证
3. **失败回滚**：如果测试失败，会自动回滚修改并尝试其他方案
4. **最多 3 次尝试**：每个问题最多尝试 3 次修复方案
