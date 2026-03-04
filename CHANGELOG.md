# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-03-03

### Added

- Initial open-source release
- Full-duplex real-time voice conversation support
- Discord voice bot integration
- OpenClaw / Claude Code plugin support
- Memory Bank for persistent conversation memory
- Webhook secure dispatch with HMAC signature verification
- Doubao (豆包) real-time voice provider
- Local Mock provider for development and testing
- State machine driven session management
- Provider abstraction layer for extensibility

### Architecture

- Monorepo structure with pnpm workspaces
- 11 core packages + 1 main application
- TypeScript strict mode enabled
- ESLint + Prettier for code quality
- Comprehensive test coverage with Vitest
- Security scanning for leaked credentials

### Documentation

- README with quick start guide
- Architecture documentation
- Installation guide
- Security best practices
- Troubleshooting guide
