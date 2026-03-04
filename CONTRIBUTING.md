# Contributing to Voice Hub

感谢你考虑为 Voice Hub 做贡献！

## 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 代码规范

- 使用 TypeScript 编写
- 遵循现有 ESLint 配置
- 所有新功能需要编写测试
- 提交前运行 `pnpm release:gate` 确保质量门禁通过

## 报告 Bug

请使用 GitHub Issues 报告 bug，并附上：

- 复现步骤
- 预期行为
- 实际行为
- 环境信息（Node.js 版本、操作系统等）

## 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/412984588/voice-hub.git
cd voice-hub

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具链更新

示例：

```
feat(provider): add support for new audio codec
fix(runtime): resolve state transition race condition
docs(readme): update installation instructions
```

## 许可证

提交代码即表示你同意将代码以 MIT 许可证发布。
