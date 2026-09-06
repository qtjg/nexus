// OpenRouter Provider — NEXUS
// Supports all models available through OpenRouter API

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

export class OpenRouterProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
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
      response_format: options.responseFormat,
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
    let toolCalls: import('../types/index.js').ToolCall[] = [];
    let totalUsage: TokenUsage = { input: 0, output: 0, total: 0 };

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      const choice = chunk.choices[0];
      if (choice?.delta?.content) {
        const text = choice.delta.content;
        fullContent += text;
        await onChunk({ type: 'text', content: text });
      }
      if (choice?.delta?.tool_calls) {
        for (const tc of choice.delta.tool_calls) {
          const name = tc.function?.name;
          const args = tc.function?.arguments;
          if (name) {
            toolCalls.push({
              id: tc.id!,
              toolId: name,
              name,
              arguments: args ? JSON.parse(args) : {},
              timestamp: new Date().toISOString(),
            });
          } else if (args) {
            const last = toolCalls[toolCalls.length - 1];
            if (last) {
              last.arguments = {
                ...last.arguments,
                ...(args ? JSON.parse(args) : {}),
              };
            }
          }
        }
      }
      if (chunk.usage) {
        totalUsage = this.extractUsage(chunk.usage);
        await onChunk({ type: 'usage', usage: totalUsage });
      }
    }

    await onChunk({
      type: 'cost',
      cost: this.estimateCost(totalUsage, options.model),
    });

    return { message: fullContent, usage: totalUsage, toolCalls };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.client.models.list();
      return res.data.length > 0;
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
      return {
        role: msg.role,
        content: msg.content,
      } as ChatCompletionMessageParam;
    });
  }

  private convertTool(tool: import('../types/index.js').ToolDefinition): ChatCompletionTool {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema || {
          type: 'object',
          properties: Object.fromEntries(
            (tool.parameters || []).map((p) => [
              p.name,
              { type: p.type, description: p.description },
            ])
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
    // Rough estimate for OpenRouter models
    const modelLower = modelId.toLowerCase();
    let inputPrice = 0.00001;
    let outputPrice = 0.00003;

    if (modelLower.includes('claude')) {
      inputPrice = 0.000003;
      outputPrice = 0.000015;
    } else if (modelLower.includes('gpt')) {
      inputPrice = 0.000001;
      outputPrice = 0.000004;
    }

    return (usage.input * inputPrice + usage.output * outputPrice) / 1_000_000;
  }
}

export function createOpenRouterProvider(config: ProviderConfig): OpenRouterProvider {
  return new OpenRouterProvider(config);
}
