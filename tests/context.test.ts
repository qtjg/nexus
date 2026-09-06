// NEXUS — Context Builder Tests
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ContextBuilder } from '../dist/context/builder.js';
import type { Message } from '../dist/types/index.js';

describe('ContextBuilder', () => {
  it('should build context with project info', async () => {
    const builder = new ContextBuilder({
      maxTokens: 100000,
      includeGitStatus: false,
      includeProjectFiles: false,
      includeToolResults: false,
      includeSessionHistory: true,
      includeSkillInstructions: false,
      includeMcpResources: false,
      strategy: 'truncate',
    });
    builder.setProjectInfo({
      path: process.cwd(),
      name: 'test-project',
      language: 'typescript',
      framework: 'node',
      detectedAt: new Date().toISOString(),
    });

    const messages: Message[] = [
      { role: 'system', content: 'You are a helper.', timestamp: new Date().toISOString() },
      { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
    ];

    const context = await builder.build(messages);
    assert.ok(Array.isArray(context), 'should return array of messages');
    assert.ok(context.length > 0, 'should have messages');
  });

  it('should build context without project info', async () => {
    const builder = new ContextBuilder({
      maxTokens: 100000,
      includeGitStatus: false,
      includeProjectFiles: false,
      includeToolResults: false,
      includeSessionHistory: true,
      includeSkillInstructions: false,
      includeMcpResources: false,
      strategy: 'truncate',
    });

    const messages: Message[] = [
      { role: 'system', content: 'Test system', timestamp: new Date().toISOString() },
      { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
    ];

    const context = await builder.build(messages);
    assert.ok(context.length >= 2, 'should include all messages');
  });

  it('should include tool results when enabled', async () => {
    const builder = new ContextBuilder({
      maxTokens: 100000,
      includeGitStatus: false,
      includeProjectFiles: false,
      includeToolResults: true,
      includeSessionHistory: true,
      includeSkillInstructions: false,
      includeMcpResources: false,
      strategy: 'truncate',
    });

    const messages: Message[] = [
      { role: 'system', content: 'Test', timestamp: new Date().toISOString() },
    ];
    const toolResults = [{ callId: 'tc1', content: 'tool output', isError: false }];

    const context = await builder.build(messages, [], toolResults);
    assert.ok(context.some(m => m.content === 'tool output'), 'should include tool results');
  });
});
