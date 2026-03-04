/**
 * @voice-hub/claude-mcp-server
 *
 * Claude MCP Server 实现
 * 提供 Model Context Protocol 接口
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 工具定义
const TOOLS = [
  {
    name: 'create_session',
    description: 'Create a new voice session for real-time interaction',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Optional user identifier for the session',
        },
        channelId: {
          type: 'string',
          description: 'Optional channel identifier (e.g., Discord channel ID)',
        },
      },
    },
  },
  {
    name: 'destroy_session',
    description: 'Destroy an existing voice session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID to destroy',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'start_listening',
    description: 'Start listening for voice input in a session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'stop_listening',
    description: 'Stop listening for voice input in a session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'get_session_status',
    description: 'Get the current status of a voice session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'list_sessions',
    description: 'List all active voice sessions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'send_text',
    description: 'Send text to be spoken in a session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID',
        },
        text: {
          type: 'string',
          description: 'The text to speak',
        },
      },
      required: ['sessionId', 'text'],
    },
  },
];

/** Voice Hub MCP 服务器 */
export class VoiceHubMCPServer {
  private server: Server;
  private runtimeUrl: string;
  private apiKey?: string;

  constructor(runtimeUrl: string, apiKey?: string) {
    this.runtimeUrl = runtimeUrl;
    this.apiKey = apiKey;

    this.server = new Server(
      {
        name: 'voice-hub-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /** 设置请求处理器 */
  private setupHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.handleToolCall(name, args || {});
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });
  }

  /** 处理工具调用 */
  private async handleToolCall(name: string, args: Record<string, unknown>): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    switch (name) {
      case 'create_session': {
        const response = await fetch(`${this.runtimeUrl}/api/sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId: args.userId,
            channelId: args.channelId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const data = await response.json() as { sessionId: string };
        return `Session created: ${data.sessionId}`;
      }

      case 'destroy_session': {
        const { sessionId } = args as { sessionId: string };
        const response = await fetch(`${this.runtimeUrl}/api/sessions/${sessionId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to destroy session: ${response.statusText}`);
        }

        return `Session ${sessionId} destroyed`;
      }

      case 'start_listening': {
        const { sessionId } = args as { sessionId: string };
        const response = await fetch(`${this.runtimeUrl}/api/sessions/${sessionId}/listening`, {
          method: 'POST',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to start listening: ${response.statusText}`);
        }

        return `Listening started for session ${sessionId}`;
      }

      case 'stop_listening': {
        const { sessionId } = args as { sessionId: string };
        const response = await fetch(`${this.runtimeUrl}/api/sessions/${sessionId}/listening`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to stop listening: ${response.statusText}`);
        }

        return `Listening stopped for session ${sessionId}`;
      }

      case 'get_session_status': {
        const { sessionId } = args as { sessionId: string };
        const response = await fetch(`${this.runtimeUrl}/api/sessions/${sessionId}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to get session status: ${response.statusText}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      }

      case 'list_sessions': {
        const response = await fetch(`${this.runtimeUrl}/api/sessions`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to list sessions: ${response.statusText}`);
        }

        const data = await response.json() as { sessions: unknown[] };
        return JSON.stringify(data, null, 2);
      }

      case 'send_text': {
        const { sessionId, text } = args as { sessionId: string; text: string };
        const response = await fetch(`${this.runtimeUrl}/api/sessions/${sessionId}/tts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send text: ${response.statusText}`);
        }

        return `Text sent to session ${sessionId}`;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /** 启动服务器 */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /** 关闭服务器 */
  async close(): Promise<void> {
    await this.server.close();
  }
}
