// Provider Abstraction Layer — NEXUS
// All providers implement this interface

import type {
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition,
  TokenUsage,
  ProviderConfig,
  ProviderCapabilities,
  Model,
} from '../types/index.js';

// Re-export types for consumers
export type { ProviderConfig, ProviderCapabilities } from '../types/index.js';

// Chat response and options are defined here and re-exported for provider implementations

export interface ChatResponse {
  message: string;
  usage: TokenUsage;
  stopReason?: string;
  toolCalls?: ToolCall[];
}

export interface Provider {
  readonly config: ProviderConfig;
  readonly capabilities: ProviderCapabilities;

  // Core chat
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  // Streaming chat
  streamChat(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void | Promise<void>
  ): Promise<ChatResponse>;

  // Health check
  healthCheck(): Promise<boolean>;

  // List available models
  listModels?(): Promise<Model[]>;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function?: { name: string } };
  stream?: boolean;
  stopSequences?: string[];
  responseFormat?: { type: 'text' | 'json_object' };
  seed?: number;
}

export abstract class BaseProvider implements Provider {
  readonly config: ProviderConfig;
  readonly capabilities: ProviderCapabilities;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.capabilities = config.capabilities;
  }

  abstract chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  abstract streamChat(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void | Promise<void>
  ): Promise<ChatResponse>;
  abstract healthCheck(): Promise<boolean>;

  protected extractToolCalls(content: string): ToolCall[] {
    const calls: ToolCall[] = [];
    const toolCallRegex = /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/g;
    let match;
    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        const args = JSON.parse(match[1]) as { name: string; arguments: Record<string, unknown> };
        if (args.name) {
          calls.push({
            id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            toolId: args.name,
            name: args.name,
            arguments: args.arguments,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore malformed tool calls
      }
    }
    return calls;
  }

  protected stripToolCalls(content: string): string {
    return content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
  }
}

// ─── Router (selects provider by config) ──────────────────────

export interface ProviderRouter {
  getProvider(id: string): Provider | null;
  getProviderForModel(modelId: string): Provider | null;
  listProviders(): ProviderConfig[];
  addProvider(provider: Provider): void;
  removeProvider(id: string): boolean;
}
