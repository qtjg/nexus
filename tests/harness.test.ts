// NEXUS — Agent Harness Tests
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AgentHarness } from '../dist/harness/index.js';
import { PermissionEngine } from '../dist/permissions/engine.js';
import { ContextBuilder } from '../dist/context/builder.js';
import type { Provider, Message } from '../dist/types/index.js';

describe('AgentHarness', () => {
  let harness: AgentHarness;
  let mockProvider: Provider;

  beforeEach(() => {
    mockProvider = {
      config: { id: 'test', name: 'Test', type: 'openai' as any, apiKey: 'test-key', capabilities: { streaming: true, toolCalling: true, structuredOutput: false, imageSupport: false, audioSupport: false, embeddings: false, maxContextWindow: 128000 } },
      async chat(_messages: Message[], _options?: any) {
        return { message: 'Hello from test provider', usage: { input: 10, output: 20, total: 30 }, toolCalls: [] };
      },
      async streamChat(_messages: Message[], _options?: any, _onChunk?: any) {
        return { message: 'Streamed response', usage: { input: 5, output: 10, total: 15 }, toolCalls: [] };
      },
      async healthCheck() { return true; },
      async listModels() { return []; },
    } as unknown as Provider;

    const permEngine = new PermissionEngine(undefined, 'safe');
    const ctxBuilder = new ContextBuilder({
      maxTokens: 100000, includeGitStatus: false, includeProjectFiles: false,
      includeToolResults: false, includeSessionHistory: true,
      includeSkillInstructions: false, includeMcpResources: false, strategy: 'truncate',
    });
    harness = new AgentHarness({
      provider: mockProvider,
      model: 'test-model',
      tools: [],
      permissionEngine: permEngine,
      contextBuilder: ctxBuilder,
      maxIterations: 3,
    });
  });

  it('should create harness with defaults', () => {
    assert.ok(harness, 'harness should be created');
  });

  it('should have a working getState', () => {
    const state = harness.getState();
    assert.ok(state, 'should have state');
    assert.equal(state.status, 'idle');
    assert.equal(state.iteration, 0);
    assert.equal(state.tokensUsed, 0);
    assert.ok(Array.isArray(state.messages));
    assert.ok(Array.isArray(state.toolCalls));
  });

  it('should reset session state', () => {
    const before = harness.getState();
    harness.reset();
    const after = harness.getState();
    assert.notStrictEqual(before, after, 'state should be reset');
    assert.equal(after.status, 'idle');
    assert.equal(after.iteration, 0);
    assert.equal(after.messages.length, 0);
    assert.equal(after.toolCalls.length, 0);
  });

  it('should cancel running operation', () => {
    harness.cancel();
    assert.ok(true, 'cancel should not throw');
  });
});
