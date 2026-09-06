// Agent Harness — NEXUS
// Orchestrates agent loops, tool calls, permissions, and context

import type {
  Message,
  ToolCall,
  ToolResult,
  ToolDefinition,
  AgentState,
  HarnessEvent,
  HarnessEventPayload,
  StreamChunk,
  PermissionRequest,
  PermissionPolicy,
  RequestUsage,
  TokenUsage,
  AgentConfig,
} from '../types/index.js';
import type { ChatResponse } from '../providers/base.js';
import { Provider, type ChatOptions } from '../providers/base.js';
import { PermissionDeniedError, TimeoutError } from '../types/index.js';
import { PermissionEngine } from '../permissions/engine.js';
import { ContextBuilder } from '../context/builder.js';

export interface HarnessOptions {
  provider: Provider;
  model: string;
  tools: ToolDefinition[];
  permissionEngine: PermissionEngine;
  contextBuilder: ContextBuilder;
  maxIterations?: number;
  maxTokens?: number;
  maxCost?: number;
  timeoutMs?: number;
  systemPrompt?: string;
  streaming?: boolean;
}

export type HarnessCallback = (event: HarnessEventPayload) => void | Promise<void>;

export class AgentHarness {
  private state: AgentState;
  private options: Required<HarnessOptions>;
  private callbacks: HarnessCallback[] = [];
  private startTime: number = 0;

  constructor(options: HarnessOptions) {
    this.options = {
      provider: options.provider,
      model: options.model,
      tools: options.tools,
      permissionEngine: options.permissionEngine,
      contextBuilder: options.contextBuilder,
      maxIterations: options.maxIterations ?? 20,
      maxTokens: options.maxTokens ?? 100_000,
      maxCost: options.maxCost ?? 10.0,
      timeoutMs: options.timeoutMs ?? 300_000,
      streaming: options.streaming ?? true,
      systemPrompt: options.systemPrompt ?? '',
    };
    this.state = {
      sessionId: '',
      messages: [],
      toolCalls: [],
      toolResults: [],
      iteration: 0,
      tokensUsed: 0,
      costEstimate: 0,
      status: 'idle',
    };
    this.options = { ...this.options, ...options };
  }

  on(callback: HarnessCallback): void {
    this.callbacks.push(callback);
  }

  off(callback: HarnessCallback): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx >= 0) this.callbacks.splice(idx, 1);
  }

  private emit(event: HarnessEvent, data: Record<string, unknown>): void {
    const payload: HarnessEventPayload = {
      type: event,
      timestamp: new Date().toISOString(),
      data,
    };
    for (const cb of this.callbacks) {
      cb(payload);
    }
  }

  getState(): AgentState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      sessionId: this.state.sessionId,
      messages: [],
      toolCalls: [],
      toolResults: [],
      iteration: 0,
      tokensUsed: 0,
      costEstimate: 0,
      status: 'idle',
    };
  }

  async run(
    userMessage: string,
    sessionId: string,
    onChunk?: (chunk: StreamChunk) => void | Promise<void>,
    initialMessages?: Message[]
  ): Promise<AgentState> {
    this.state.sessionId = sessionId;
    this.state.status = 'running';
    this.state.messages = initialMessages ? [...initialMessages] : [];
    this.startTime = Date.now();

    this.emit('agent.started', { sessionId, userMessage });
    this.emit('session.started', { sessionId });

    // Add system prompt and user message
    if (this.options.systemPrompt) {
      this.state.messages.push({
        id: `msg_sys_${Date.now()}`,
        role: 'system',
        content: this.options.systemPrompt,
        timestamp: new Date().toISOString(),
      });
    }

    this.state.messages.push({
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Main agent loop
    while (this.state.iteration < this.options.maxIterations) {
      this.state.iteration++;

      // Check timeout
      if (Date.now() - this.startTime > this.options.timeoutMs) {
        this.state.status = 'error';
        this.state.error = `Timeout after ${this.options.timeoutMs}ms`;
        this.emit('agent.failed', { sessionId, error: this.state.error });
        throw new TimeoutError('agent', this.options.timeoutMs);
      }

      // Check cost limit
      if (this.state.costEstimate >= this.options.maxCost) {
        this.state.status = 'error';
        this.state.error = `Cost limit exceeded: $${this.state.costEstimate.toFixed(2)}`;
        this.emit('agent.failed', { sessionId, error: this.state.error });
        break;
      }

      // Check token limit
      if (this.state.tokensUsed >= this.options.maxTokens) {
        this.state.status = 'error';
        this.state.error = `Token limit exceeded: ${this.state.tokensUsed}`;
        this.emit('agent.failed', { sessionId, error: this.state.error });
        break;
      }

      // Get context-augmented messages
      const contextMessages = await this.options.contextBuilder.build(
        this.state.messages,
        this.state.toolCalls,
        this.state.toolResults
      );

      const chatOptions: ChatOptions = {
        model: this.options.model,
        tools: this.options.tools,
        maxTokens: Math.max(1, this.options.maxTokens - this.state.tokensUsed),
      };

      this.emit('model.request.started', {
        sessionId,
        model: this.options.model,
        iteration: this.state.iteration,
      });

      let response: ChatResponse;

      if (this.options.streaming && onChunk) {
        response = await this.options.provider.streamChat(
          contextMessages,
          chatOptions,
          async (chunk) => {
            if (chunk.type === 'text') {
              await onChunk(chunk);
            } else if (chunk.type === 'usage') {
              this.state.tokensUsed = chunk.usage.total;
              this.emit('usage.updated', { tokens: chunk.usage });
            } else if (chunk.type === 'cost') {
              this.state.costEstimate += chunk.cost;
              this.emit('usage.updated', { cost: chunk.cost });
            }
          }
        );
      } else {
        response = await this.options.provider.chat(contextMessages, chatOptions);
        if (onChunk && response.message) {
          await onChunk({ type: 'text', content: response.message });
        }
      }

      this.state.tokensUsed += response.usage.total;
      this.state.costEstimate += response.usage.total > 0 ? this.estimateCost(response.usage, this.options.model) : 0;

      this.emit('model.request.completed', {
        sessionId,
        model: this.options.model,
        tokens: response.usage,
        cost: this.state.costEstimate,
      });

      // Add assistant response
      const assistantId = `msg_assist_${Date.now()}`;
      this.state.messages.push({
        id: assistantId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      });

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          this.state.toolCalls.push(toolCall);
          this.emit('tool.requested', {
            sessionId,
            toolId: toolCall.toolId,
            toolName: toolCall.name,
            arguments: toolCall.arguments,
          });

          // Check permissions
          const permissionAllowed = await this.checkPermission(toolCall);
          if (!permissionAllowed) {
            this.emit('tool.denied', { sessionId, toolId: toolCall.toolId });
            this.state.toolResults.push({
              callId: toolCall.id,
              content: `Permission denied for tool: ${toolCall.name}`,
              isError: true,
            });
            this.state.messages.push({
              id: `msg_tool_${toolCall.id}`,
              role: 'tool',
              toolCallId: toolCall.id,
              content: `Permission denied for tool: ${toolCall.name}`,
              timestamp: new Date().toISOString(),
            });
            continue;
          }

          this.emit('tool.permission_required', { sessionId, toolId: toolCall.toolId });
          this.state.status = 'awaiting_permission';

          // Execute tool
          this.state.status = 'running';
          this.emit('tool.started', { sessionId, toolId: toolCall.toolId });

          try {
            const result = await this.executeTool(toolCall);
            this.state.toolResults.push(result);
            this.emit('tool.completed', { sessionId, toolId: toolCall.toolId });

            this.state.messages.push({
              id: `msg_tool_${result.callId}`,
              role: 'tool',
              toolCallId: result.callId,
              content: result.content,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            const errResult: ToolResult = {
              callId: toolCall.id,
              content: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
              isError: true,
            };
            this.state.toolResults.push(errResult);
            this.emit('tool.failed', { sessionId, toolId: toolCall.toolId, error: errResult.content });

            this.state.messages.push({
              id: `msg_tool_${toolCall.id}`,
              role: 'tool',
              toolCallId: toolCall.id,
              content: errResult.content,
              timestamp: new Date().toISOString(),
            });
          }
        }
        continue; // Loop back for model response to tool results
      }

      // No more tool calls — we're done
      this.state.status = 'completed';
      this.emit('agent.completed', {
        sessionId,
        iterations: this.state.iteration,
        tokens: this.state.tokensUsed,
        cost: this.state.costEstimate,
      });
      this.emit('session.completed', { sessionId });
      return this.state;
    }

    // Max iterations reached
    this.state.status = 'completed';
    this.emit('agent.completed', {
      sessionId,
      iterations: this.state.iteration,
      tokens: this.state.tokensUsed,
      cost: this.state.costEstimate,
      maxIterationsReached: true,
    });
    return this.state;
  }

  cancel(): void {
    this.state.status = 'cancelled';
    this.emit('agent.failed', { sessionId: this.state.sessionId, reason: 'cancelled' });
  }

  private async checkPermission(toolCall: ToolCall): Promise<boolean> {
    const tool = this.options.tools.find((t) => t.name === toolCall.name);
    if (!tool || !tool.permission) return true;

    const request: PermissionRequest = {
      id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      toolId: toolCall.toolId,
      toolName: toolCall.name,
      action: 'execute',
      target: JSON.stringify(toolCall.arguments),
      description: `Execute ${toolCall.name}: ${tool.description}`,
      timestamp: new Date().toISOString(),
    };

    const decision = await this.options.permissionEngine.decide(request);
    return decision !== 'deny-once' && decision !== 'deny-session' && decision !== 'deny-always';
  }

  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.options.tools.find((t) => t.name === toolCall.name);
    if (!tool) {
      return {
        callId: toolCall.id,
        content: `Tool not found: ${toolCall.name}`,
        isError: true,
      };
    }

    // Delegate to tool executor
    const { executeToolCall } = await import('../tools/executor.js');
    return executeToolCall(tool, toolCall);
  }

  private estimateCost(usage: TokenUsage, model: string): number {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('claude')) return (usage.input * 3 + usage.output * 15) / 1_000_000;
    if (modelLower.includes('gpt')) return (usage.input * 2.5 + usage.output * 10) / 1_000_000;
    return 0;
  }
}

export function createHarness(options: HarnessOptions): AgentHarness {
  return new AgentHarness(options);
}
