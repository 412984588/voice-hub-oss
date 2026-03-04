/**
 * @voice-hub/claude-marketplace
 *
 * Claude Code Marketplace 集成
 * 提供插件元数据和安装配置
 */

/** 插件清单 */
export const MANIFEST = {
  id: 'voice-hub',
  name: 'Voice Hub',
  version: '0.1.0',
  description: 'Real-time voice interaction middleware for Claude Code and OpenClaw',
  author: 'Voice Hub Team',
  license: 'MIT',
  homepage: 'https://github.com/voice-hub/voice-hub',
  repository: 'https://github.com/voice-hub/voice-hub',
  keywords: [
    'voice',
    'audio',
    'discord',
    'realtime',
    'openclaw',
    'claude-code',
    'mcp',
  ],

  capabilities: {
    voiceInput: true,
    voiceOutput: true,
    sessionManagement: true,
    memoryStorage: true,
    backendDispatch: true,
  },

  compatibility: {
    claudeCode: '>=1.0.0',
    openclaw: '>=0.1.0',
    node: '>=22.12.0',
  },

  dependencies: {
    runtime: ['@voice-hub/core-runtime'],
    optional: [
      '@voice-hub/openclaw-plugin',
      '@voice-hub/claude-mcp-server',
    ],
  },

  installation: {
    type: 'npm',
    package: '@voice-hub/claude-marketplace',
  },

  configuration: {
    env: [
      'DISCORD_BOT_TOKEN',
      'DISCORD_GUILD_ID',
      'DISCORD_VOICE_CHANNEL_ID',
      'VOICE_PROVIDER', // 'disabled' | 'local-mock' | 'doubao'
      'DOUBAO_REALTIME_WS_URL',
      'DOUBAO_APP_ID',
      'DOUBAO_ACCESS_TOKEN',
      'MEMORY_DB_PATH',
      'WEBHOOK_PORT',
      'WEBHOOK_SECRET',
    ],
    configFiles: ['.env'],
  },
} as const;

/** Claude Code 插件配置 */
export const CLAUDE_CODE_PLUGIN = {
  name: 'Voice Hub',
  id: 'voice-hub',

  commands: [
    {
      name: 'voice.start',
      description: 'Start a new voice session',
      handler: 'handleVoiceStart',
    },
    {
      name: 'voice.stop',
      description: 'Stop the current voice session',
      handler: 'handleVoiceStop',
    },
    {
      name: 'voice.status',
      description: 'Get current voice session status',
      handler: 'handleVoiceStatus',
    },
    {
      name: 'voice.text',
      description: 'Send text to be spoken',
      handler: 'handleVoiceText',
      params: [
        {
          name: 'text',
          description: 'The text to speak',
          required: true,
        },
      ],
    },
  ],

  settings: [
    {
      key: 'voice.provider',
      title: 'Voice Provider',
      description: 'Select the voice service provider',
      type: 'select',
      options: [
        { value: 'disabled', label: 'Disabled' },
        { value: 'local-mock', label: 'Local Mock (Testing)' },
        { value: 'doubao', label: 'Doubao Realtime' },
      ],
      default: 'local-mock',
    },
    {
      key: 'voice.autoStart',
      title: 'Auto-start Listening',
      description: 'Automatically start listening when session is created',
      type: 'boolean',
      default: false,
    },
    {
      key: 'voice.saveAudio',
      title: 'Save Audio Files',
      description: 'Save audio recordings to disk',
      type: 'boolean',
      default: false,
    },
  ],

  notifications: [
    {
      event: 'session.started',
      message: 'Voice session started',
      type: 'info',
    },
    {
      event: 'session.ended',
      message: 'Voice session ended',
      type: 'info',
    },
    {
      event: 'error',
      message: 'Voice error occurred',
      type: 'error',
    },
  ],
};

/** 安装说明 */
export const INSTALLATION_INSTRUCTIONS = `
# Voice Hub Installation

## Prerequisites

- Node.js >= 22.12.0
- pnpm >= 9.0.0
- Discord Bot Token (for Discord integration)

## Install via Claude Code Marketplace

1. Open Claude Code
2. Go to Settings > Plugins
3. Search for "Voice Hub"
4. Click Install

## Manual Installation

\`\`\`bash
# Install the package
pnpm add @voice-hub/claude-marketplace

# Configure environment variables
cp .env.example .env

# Edit .env with your configuration
vim .env
\`\`\`

## Configuration

Create a \`.env\` file in your project root:

\`\`\`env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id
DISCORD_VOICE_CHANNEL_ID=your_voice_channel_id

# Voice Provider (disabled, local-mock, or doubao)
VOICE_PROVIDER=local-mock

# Doubao Configuration (if using doubao)
DOUBAO_REALTIME_WS_URL=wss://...
DOUBAO_APP_ID=your_app_id
DOUBAO_ACCESS_TOKEN=your_access_token

# Memory Storage
MEMORY_DB_PATH=./data/voice-hub.db

# Webhook Server
WEBHOOK_PORT=8848
WEBHOOK_SECRET=your_webhook_secret
\`\`\`

## Usage

\`\`\`typescript
import { VoiceHub } from '@voice-hub/claude-marketplace';

const hub = new VoiceHub({
  runtimeUrl: 'http://localhost:8848',
});

// Create a session
const sessionId = await hub.createSession();

// Start listening
await hub.startListening(sessionId);

// ... interaction ...

// Stop and cleanup
await hub.destroySession(sessionId);
\`\`\`
`;

/** 导出所有内容 */
export { MANIFEST as default };

