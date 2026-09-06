import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SlashCommandRegistry } from '../../dist/cli/playground/registry.js';
import type { SlashCommand } from '../../dist/cli/playground/types.js';

function makeCommand(name: string, aliases: string[] = []): SlashCommand {
  return {
    name,
    aliases,
    description: 'Test command',
    category: 'test',
    execute: async () => {},
  };
}

describe('SlashCommandRegistry', () => {
  it('should register and retrieve a command', () => {
    const registry = new SlashCommandRegistry();
    const cmd = makeCommand('test');
    registry.register(cmd);
    assert.strictEqual(registry.get('test'), cmd);
  });

  it('should handle case-insensitive lookups', () => {
    const registry = new SlashCommandRegistry();
    const cmd = makeCommand('help');
    registry.register(cmd);
    assert.strictEqual(registry.get('HELP'), cmd);
    assert.strictEqual(registry.get('Help'), cmd);
    assert.strictEqual(registry.get('help'), cmd);
  });

  it('should register aliases', () => {
    const registry = new SlashCommandRegistry();
    const cmd = makeCommand('model', ['m']);
    registry.register(cmd);
    assert.strictEqual(registry.get('model'), cmd);
    assert.strictEqual(registry.get('m'), cmd);
  });

  it('should resolve aliases to canonical names', () => {
    const registry = new SlashCommandRegistry();
    const cmd = makeCommand('model', ['m']);
    registry.register(cmd);
    assert.strictEqual(registry.resolve('m'), 'model');
    assert.strictEqual(registry.resolve('model'), 'model');
  });

  it('should list all command metadata', () => {
    const registry = new SlashCommandRegistry();
    registry.register(makeCommand('cmd1'));
    registry.register(makeCommand('cmd2', ['c2']));
    const metas = registry.listMetas();
    assert.strictEqual(metas.length, 2);
    assert.strictEqual(metas[0].name, 'cmd1');
    assert.ok(metas[1].aliases.includes('c2'));
  });

  it('should check command existence', () => {
    const registry = new SlashCommandRegistry();
    registry.register(makeCommand('foo'));
    assert.strictEqual(registry.has('foo'), true);
    assert.strictEqual(registry.has('bar'), false);
  });

  it('should find prefix matches for autocomplete', () => {
    const registry = new SlashCommandRegistry();
    registry.register(makeCommand('help'));
    registry.register(makeCommand('history'));
    registry.register(makeCommand('clear'));
    const matches = registry.matchPrefix('hel');
    assert.ok(matches.includes('help'));
  });

  it('should not include exact match in prefix suggestions', () => {
    const registry = new SlashCommandRegistry();
    registry.register(makeCommand('help'));
    const matches = registry.matchPrefix('help');
    assert.ok(!matches.includes('help'));
  });
});
