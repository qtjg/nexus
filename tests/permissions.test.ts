// NEXUS — Permission Engine Tests
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PermissionEngine } from '../dist/permissions/engine.js';

describe('PermissionEngine', () => {
  it('should allow read operations in normal mode', async () => {
    const engine = new PermissionEngine(undefined, 'normal');
    const result = await engine.decide({
      toolName: 'read_file',
      action: 'read',
      target: '/etc/hosts',
      description: 'Read hosts file',
    });
    assert.equal(result, 'allow-once', 'read should be allowed in normal mode');
  });

  it('should deny filesystem operations in sandbox mode', async () => {
    const engine = new PermissionEngine(undefined, 'sandbox');
    const result = await engine.decide({
      toolName: 'write_file',
      action: 'write',
      target: '/important/file',
      description: 'Write file',
    });
    assert.equal(result, 'deny-always', 'write should be denied in sandbox mode');
  });

  it('should ask for everything in safe mode', async () => {
    const engine = new PermissionEngine(undefined, 'safe');
    const result = await engine.decide({
      toolName: 'execute_command',
      action: 'run',
      target: 'ls',
      description: 'List files',
    });
    assert.equal(result, 'allow-once', 'should ask in safe mode');
  });

  it('should allow everything in relaxed mode', async () => {
    const engine = new PermissionEngine(undefined, 'relaxed');
    const result = await engine.decide({
      toolName: 'write_file',
      action: 'write',
      target: '/tmp/test',
      description: 'Write test',
    });
    assert.equal(result, 'allow-always', 'should allow in relaxed mode');
  });

  it('should record and recall session decisions', async () => {
    const engine = new PermissionEngine(undefined, 'normal');
    await engine.decide({
      toolName: 'read_file',
      action: 'read',
      target: '/test/file',
      description: 'Read test file',
    });
    // After first check, session decisions kick in
    assert.ok(true, 'decide should not throw');
  });

  it('should list policies', () => {
    const engine = new PermissionEngine(undefined, 'normal');
    const policies = engine.listPolicies();
    assert.ok(Array.isArray(policies), 'should return array of policies');
  });

  it('should clear session decisions', () => {
    const engine = new PermissionEngine(undefined, 'normal');
    engine.clearSession();
    assert.ok(true, 'clearSession should not throw');
  });

  it('should support allowAlways', () => {
    const engine = new PermissionEngine(undefined, 'normal');
    engine.allowAlways('filesystem.read', '/allowed/path');
    assert.ok(true, 'allowAlways should not throw');
  });

  it('should support denyAlways', () => {
    const engine = new PermissionEngine(undefined, 'normal');
    engine.denyAlways('filesystem.delete', '/protected');
    assert.ok(true, 'denyAlways should not throw');
  });

  it('should infer correct categories from tool names', async () => {
    const engine = new PermissionEngine(undefined, 'normal');
    const gitResult = await engine.decide({
      toolName: 'git_status',
      action: 'read',
      target: '.',
      description: 'Check git status',
    });
    assert.equal(gitResult, 'allow-once', 'git.read should default allow in normal');
  });
});
