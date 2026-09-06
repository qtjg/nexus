// NEXUS — Tool Executor Tests
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { executeToolCall } from '../dist/tools/executor.js';
import { BUILTIN_TOOLS } from '../dist/tools/definitions.js';
import * as path from 'node:path';

describe('Tool Executor', () => {
  it('should execute read_file tool', async () => {
    const tool = BUILTIN_TOOLS.find(t => t.name === 'read_file');
    assert.ok(tool, 'read_file tool should exist');
    // Read the test file itself
    const result = await executeToolCall(tool, {
      id: 'call_1',
      toolId: 'read_file',
      name: 'read_file',
      arguments: { path: path.join(process.cwd(), 'tests', 'tools.test.ts') },
      timestamp: new Date().toISOString(),
    });
    assert.ok(result, 'should return result');
    assert.equal(result.isError, false, 'should not be an error');
    assert.ok(result.content.length > 0, 'should have content');
  });

  it('should list directory contents', async () => {
    const tool = BUILTIN_TOOLS.find(t => t.name === 'list_dir');
    assert.ok(tool, 'list_dir tool should exist');
    const result = await executeToolCall(tool, {
      id: 'call_2',
      toolId: 'list_dir',
      name: 'list_dir',
      arguments: { path: '.' },
      timestamp: new Date().toISOString(),
    });
    assert.ok(result, 'should return result');
    assert.equal(result.isError, false, 'should not be an error');
  });

  it('should have all builtin tools with required fields', () => {
    for (const tool of BUILTIN_TOOLS) {
      assert.ok(tool.id, 'tool has id');
      assert.ok(tool.name, 'tool has name');
      assert.ok(tool.description, 'tool has description');
      assert.ok(typeof tool.enabled === 'boolean', 'tool has enabled');
    }
  });

  it('should have at least 10 builtin tools', () => {
    assert.ok(BUILTIN_TOOLS.length >= 10, `expected >= 10 tools, got ${BUILTIN_TOOLS.length}`);
  });

  it('should handle missing file gracefully', async () => {
    const tool = BUILTIN_TOOLS.find(t => t.name === 'read_file');
    assert.ok(tool);
    const result = await executeToolCall(tool, {
      id: 'call_bad',
      toolId: 'read_file',
      name: 'read_file',
      arguments: { path: '/nonexistent/path/that/does/not/exist.txt' },
      timestamp: new Date().toISOString(),
    });
    // Should return an error result, not throw
    assert.ok(result.isError, 'should report error for missing file');
  });
});
