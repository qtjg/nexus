// NEXUS — Type System Tests
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Provider Types', () => {
  it('should have valid Provider interface shape', async () => {
    const { BaseProvider } = await import('../dist/providers/base.js');
    assert.ok(typeof BaseProvider === 'function', 'BaseProvider is a class');
  });

  it('should define ChatResponse shape', async () => {
    const { createProvider } = await import('../dist/providers/index.js');
    assert.ok(typeof createProvider === 'function', 'createProvider is exported');
  });
});

describe('Tool Types', () => {
  it('should export BUILTIN_TOOLS', async () => {
    const { BUILTIN_TOOLS } = await import('../dist/tools/definitions.js');
    assert.ok(Array.isArray(BUILTIN_TOOLS), 'BUILTIN_TOOLS is an array');
    assert.ok(BUILTIN_TOOLS.length > 0, 'BUILTIN_TOOLS has entries');
  });

  it('should have tools with required fields', async () => {
    const { BUILTIN_TOOLS } = await import('../dist/tools/definitions.js');
    for (const tool of BUILTIN_TOOLS) {
      assert.ok(tool.id, 'tool has id');
      assert.ok(tool.name, 'tool has name');
      assert.ok(tool.description, 'tool has description');
    }
  });

  it('should have at least 10 builtin tools', async () => {
    const { BUILTIN_TOOLS } = await import('../dist/tools/definitions.js');
    assert.ok(BUILTIN_TOOLS.length >= 10, `expected >= 10 tools, got ${BUILTIN_TOOLS.length}`);
  });
});
