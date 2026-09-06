// Local Model Provider — NEXUS
// Supports Ollama, LM Studio, and any OpenAI-compatible endpoint

import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionTool, CompletionUsage, Model as OpenAIModel } from 'openai';
import type {
  Message,
  StreamChunk,
  ProviderConfig,
  TokenUsage,
  Model,
} from '../types/index.js';
import type { ChatResponse, ChatOptions } from './base.js';
import { BaseProvider } from './base.js';

export interface LocalProviderOptions {
  baseUrl: string;
  apiKey?: string;
  modelName?: string;
}

export class LocalProvider extends BaseProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: ProviderConfig, options?: LocalProviderOptions) {
    super(config);
    this.defaultModel = options?.modelName || config.id;
    this.client = new OpenAI({
      baseURL: options?.baseUrl || config.baseUrl,
      apiKey: options?.apiKey || config.apiKey || 'not-needed',
    });
  }

  async chat(messages: Message[], options: ChatOptions = { model: '' as any }): Promise<ChatResponse> {
    const model = options.model || this.defaultModel;
    const openaiMessages = this.convertMessages(messages);
    const response = await this.client.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false,
      tools: options.tools?.map((t) => this.convertTool(t)),
    }) as ChatCompletion;

    const choice = response.choices[0];
    const usage = this.extractUsage(response.usage ?? null);

    const toolCalls = choice.message.tool_calls?.map((tc: ChatCompletionMessageToolCall) => ({
      id: tc.id,
      toolId: tc.function.name,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
      timestamp: new Date().toISOString(),
    })) ?? [];

    return {
      message: choice.message.content ?? '',
      usage,
      stopReason: choice.finish_reason ?? undefined,
      toolCalls,
    };
  }

  async streamChat(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void | Promise<void>
  ): Promise<ChatResponse> {
    const model = options.model || this.defaultModel;
    const openaiMessages = this.convertMessages(messages);
    const stream = await this.client.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
      tools: options.tools?.map((t) => this.convertTool(t)),
    });

    let fullContent = '';
    const toolCalls: import('../types/index.js').ToolCall[] = [];
    let totalUsage: TokenUsage = { input: 0, output: 0, total: 0 };

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      const choice = chunk.choices[0];
      if (choice?.delta?.content) {
        fullContent += choice.delta.content;
        await onChunk({ type: 'text', content: choice.delta.content });
      }
      if (chunk.usage) {
        totalUsage = this.extractUsage(chunk.usage);
        await onChunk({ type: 'usage', usage: totalUsage });
      }
    }

    await onChunk({ type: 'cost', cost: 0 }); // Local models are free
    return { message: fullContent, usage: totalUsage, toolCalls };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.defaultModel;
      await this.client.models.retrieve(model);
      return true;
    } catch {
      // Some local servers don't support /models/retrieve, try list
      try {
        const res = await this.client.models.list();
        return res.data.length > 0;
      } catch {
        // Try a minimal completion
        try {
          await this.client.chat.completions.create({
            model: this.defaultModel,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
          });
          return true;
        } catch {
          return false;
        }
      }
    }
  }

  async listModels(): Promise<Model[]> {
    try {
      const res = await this.client.models.list();
      return res.data.map((m) => this.modelFromOpenAI(m));
    } catch {
      // Return default model if list fails
      return [this.defaultModelInfo()];
    }
  }

  private convertMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId,
        };
      }
      return { role: msg.role, content: msg.content } as ChatCompletionMessageParam;
    });
  }

  private convertTool(tool: import('../types/index.js').ToolDefinition): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema || {
          type: 'object',
          properties: Object.fromEntries(
            (tool.parameters || []).map((p) => [p.name, { type: p.type, description: p.description }])
          ),
        },
      },
    };
  }

  private extractUsage(usage: CompletionUsage | null): TokenUsage {
    if (!usage) return { input: 0, output: 0, total: 0 };
    return {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens,
    };
  }

  private modelFromOpenAI(m: OpenAIModel): Model {
    return {
      id: m.id,
      name: m.id,
      provider: this.config.id,
      source: 'local',
      contextWindow: 128000,
      capabilities: {
        chat: true,
        streaming: true,
        toolCalling: true,
        structuredOutput: false,
        vision: false,
        reasoning: false,
      },
      aliases: [],
      createdAt: new Date().toISOString(),
    };
  }

  private defaultModelInfo(): Model {
    return {
      id: this.defaultModel,
      name: this.defaultModel,
      provider: this.config.id,
      source: 'local',
      contextWindow: 128000,
      capabilities: {
        chat: true,
        streaming: true,
        toolCalling: true,
        structuredOutput: false,
        vision: false,
        reasoning: false,
      },
      aliases: [],
      createdAt: new Date().toISOString(),
    };
  }
}

export function createLocalProvider(config: ProviderConfig, options?: LocalProviderOptions): LocalProvider {
  return new LocalProvider(config, options);
}
