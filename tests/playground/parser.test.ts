import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSlashCommand, validateArgs, formatUsage } from '../../dist/cli/playground/parser.js';
import type { SlashCommand } from '../../dist/cli/playground/types.js';

describe('SlashCommand Parser', () => {
  it('should parse simple slash command', () => {
    const result = parseSlashCommand('/help');
    assert.ok(result !== null);
    assert.strictEqual(result!.name, 'help');
    assert.deepStrictEqual(result!.args, []);
  });

  it('should parse command with arguments', () => {
    const result = parseSlashCommand('/model gpt-4');
    assert.ok(result !== null);
    assert.strictEqual(result!.name, 'model');
    assert.deepStrictEqual(result!.args, ['gpt-4']);
  });

  it('should parse command with multiple arguments', () => {
    const result = parseSlashCommand('/switch abc123');
    assert.ok(result !== null);
    assert.strictEqual(result!.name, 'switch');
    assert.deepStrictEqual(result!.args, ['abc123']);
  });

  it('should return null for non-slash input', () => {
    assert.strictEqual(parseSlashCommand('hello'), null);
    assert.strictEqual(parseSlashCommand('/'), null);
    assert.strictEqual(parseSlashCommand(''), null);
    // Trimmed input with leading space is still a valid slash command
    assert.notStrictEqual(parseSlashCommand(' /foo'), null);
  });

  it('should preserve raw input', () => {
    const result = parseSlashCommand('/model gpt-4 turbo');
    assert.strictEqual(result!.raw, '/model gpt-4 turbo');
  });

  it('should validate args with no validation needed', () => {
    const cmd: SlashCommand = {
      name: 'test',
      aliases: [],
      description: 'test',
      category: 'test',
      execute: async () => {},
    };
    const error = validateArgs(cmd, ['arg1', 'arg2']);
    assert.strictEqual(error, null);
  });

  it('should format usage without custom usage', () => {
    const cmd: SlashCommand = {
      name: 'model',
      aliases: [],
      description: 'set model',
      category: 'config',
      execute: async () => {},
    };
    assert.strictEqual(formatUsage(cmd), '/model');
  });

  it('should format usage with custom usage', () => {
    const cmd: SlashCommand = {
      name: 'model',
      aliases: [],
      description: 'set model',
      usage: '/model <model-id>',
      category: 'config',
      execute: async () => {},
    };
    assert.strictEqual(formatUsage(cmd), '/model <model-id>');
  });
});
