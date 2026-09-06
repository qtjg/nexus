// Anthropic Provider — NEXUS
// Direct integration with Anthropic Claude API

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam as AnthropicMessageParam, ContentBlock, Tool as AnthropicTool } from '@anthropic-ai/sdk';
import type {
  Message,
  StreamChunk,
  ProviderConfig,
  TokenUsage,
  Model,
} from '../types/index.js';
import type { ChatResponse, ChatOptions } from './base.js';
import { BaseProvider } from './base.js';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(messages: Message[], options: ChatOptions = { model: '' as any }): Promise<ChatResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    const tools = options.tools?.map((t) => this.convertTool(t));

    const response = await this.client.messages.create({
      model: options.model,
      messages: conversationMessages.map((m) => this.convertMessage(m)),
      system: systemMessage?.content,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      tools,
      tool_choice: options.toolChoice as any,
    });

    const content = this.extractText(response.content);
    const usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    };

    const toolCalls = response.content
      .filter((c) => c.type === 'tool_use')
      .map((c) => ({
        id: c.id,
        toolId: c.name,
        name: c.name,
        arguments: (c.input as Record<string, unknown>) ?? {},
        timestamp: new Date().toISOString(),
      }));

    return { message: content, usage, toolCalls };
  }

  async streamChat(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void | Promise<void>
  ): Promise<ChatResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    const tools = options.tools?.map((t) => this.convertTool(t));

    let fullContent = '';
    const toolCalls: import('../types/index.js').ToolCall[] = [];
    let usage: TokenUsage = { input: 0, output: 0, total: 0 };

    const stream = await this.client.messages.stream({
      model: options.model,
      messages: conversationMessages.map((m) => this.convertMessage(m)),
      system: systemMessage?.content,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      tools,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start') {
        const block = chunk.content_block;
        if (block?.type === 'text') {
          // Text chunk will come in message_delta
        }
      }
      if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta') {
          fullContent += chunk.delta.text;
          await onChunk({ type: 'text', content: chunk.delta.text });
        }
        if (chunk.delta.type === 'input_json_delta') {
          // Tool call accumulation handled below
        }
      }
      if (chunk.type === 'message_start') {
        usage = {
          input: chunk.message.usage.input_tokens,
          output: chunk.message.usage.output_tokens,
          total: chunk.message.usage.input_tokens + chunk.message.usage.output_tokens,
        };
        await onChunk({ type: 'usage', usage });
      }
      if (chunk.type === 'message_delta') {
        if (chunk.usage) {
          usage = {
            input: usage.input,
            output: chunk.usage.output_tokens,
            total: usage.input + chunk.usage.output_tokens,
          };
          await onChunk({ type: 'usage', usage });
        }
      }
    }

    await onChunk({ type: 'cost', cost: this.estimateCost(usage, options.model) });

    return { message: fullContent, usage, toolCalls };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Model[]> {
    const res = await this.client.models.list();
    return res.data.map((m) => ({
      id: m.id,
      name: m.display_name || m.id,
      provider: this.config.id,
      source: 'cloud',
      contextWindow: 200000,
      capabilities: {
        chat: true,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        vision: true,
        reasoning: false,
      },
      aliases: [],
      createdAt: new Date().toISOString(),
    }));
  }

  private convertMessage(msg: Message): AnthropicMessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'user' as const,
        content: [
          {
            type: 'tool_result' as const,
            tool_use_id: msg.toolCallId,
            content: msg.content,
          },
        ],
      };
    }
    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    };
  }

  private convertTool(tool: import('../types/index.js').ToolDefinition): AnthropicTool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.schema || {
        type: 'object',
        properties: Object.fromEntries(
          (tool.parameters || []).map((p) => [
            p.name,
            { type: p.type === 'number' ? 'number' : 'string', description: p.description },
          ])
        ),
      },
    };
  }

  private extractText(content: ContentBlock[]): string {
    return content
      .filter((c) => c.type === 'text')
      .map((c) => (c as unknown as { text: string }).text)
      .join('\n');
  }

  private estimateCost(usage: TokenUsage, modelId: string): number {
    // Anthropic Claude pricing (approximate)
    const modelLower = modelId.toLowerCase();
    if (modelLower.includes('claude-3-5-sonnet')) {
      return (usage.input * 3 + usage.output * 15) / 1_000_000;
    }
    if (modelLower.includes('claude-3-5-haiku')) {
      return (usage.input * 0.80 + usage.output * 4) / 1_000_000;
    }
    if (modelLower.includes('claude-3-opus')) {
      return (usage.input * 15 + usage.output * 75) / 1_000_000;
    }
    return (usage.input * 1.5 + usage.output * 7.5) / 1_000_000;
  }
}

export function createAnthropicProvider(config: ProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config);
}
