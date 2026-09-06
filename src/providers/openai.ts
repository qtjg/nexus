// OpenAI Provider — NEXUS
// Direct integration with OpenAI API

import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionTool, CompletionUsage } from 'openai';
import type {
  Message,
  StreamChunk,
  ProviderConfig,
  TokenUsage,
  Model,
} from '../types/index.js';
import type { ChatResponse, ChatOptions } from './base.js';
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async chat(messages: Message[], options: ChatOptions = { model: '' as any }): Promise<ChatResponse> {
    const openaiMessages = this.convertMessages(messages);
    const response = await this.client.chat.completions.create({
      model: options.model,
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
    const openaiMessages = this.convertMessages(messages);
    const stream = await this.client.chat.completions.create({
      model: options.model,
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
      if (choice?.delta?.tool_calls) {
        for (const tc of choice.delta.tool_calls) {
          if (tc.function?.name) {
            toolCalls.push({
              id: tc.id!,
              toolId: tc.function.name,
              name: tc.function.name,
              arguments: tc.function.arguments ? JSON.parse(tc.function.arguments) : {},
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
      if (chunk.usage) {
        totalUsage = this.extractUsage(chunk.usage);
        await onChunk({ type: 'usage', usage: totalUsage });
      }
    }

    await onChunk({ type: 'cost', cost: this.estimateCost(totalUsage, options.model) });
    return { message: fullContent, usage: totalUsage, toolCalls };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Model[]> {
    const res = await this.client.models.list();
    return res.data.map((m) => ({
      id: m.id,
      name: m.id,
      provider: this.config.id,
      source: 'cloud',
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
    }));
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

  private estimateCost(usage: TokenUsage, modelId: string): number {
    const modelLower = modelId.toLowerCase();
    if (modelLower.includes('gpt-4o')) {
      return (usage.input * 2.5 + usage.output * 10) / 1_000_000;
    }
    if (modelLower.includes('gpt-4')) {
      return (usage.input * 10 + usage.output * 30) / 1_000_000;
    }
    if (modelLower.includes('gpt-3.5')) {
      return (usage.input * 0.5 + usage.output * 1.5) / 1_000_000;
    }
    return (usage.input + usage.output) * 0.000001;
  }
}

export function createOpenAIProvider(config: ProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
