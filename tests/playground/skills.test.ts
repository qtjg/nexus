import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { SkillManager } from '../../dist/skills/SkillManager.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('SkillManager', () => {
  let manager: SkillManager;
  let tmpDir: string;

  beforeEach(() => {
    manager = new SkillManager();
    tmpDir = mkdtempSync(join(tmpdir(), 'nexus-skill-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should list empty skills when dir does not exist', async () => {
    await manager.loadFromDir(join(tmpDir, 'nonexistent'));
    const skills = manager.list();
    assert.strictEqual(skills.length, 0);
  });

  it('should load a skill from a directory with manifest', async () => {
    const skillDir = join(tmpDir, 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'manifest.json'),
      JSON.stringify({
        name: 'Test Skill',
        description: 'A test skill',
        version: '1.0.0',
        tags: ['test', 'demo'],
        entrypoint: 'index.js',
      })
    );

    await manager.loadFromDir(tmpDir);
    const skills = manager.list();
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].name, 'Test Skill');
    assert.strictEqual(skills[0].id, 'test-skill');
  });

  it('should skip directories without manifest', async () => {
    const emptyDir = join(tmpDir, 'empty-skill');
    mkdirSync(emptyDir, { recursive: true });

    await manager.loadFromDir(tmpDir);
    assert.strictEqual(manager.list().length, 0);
  });

  it('should search skills by name', async () => {
    const skillDir = join(tmpDir, 'code-review');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'manifest.json'),
      JSON.stringify({
        name: 'Code Review',
        description: 'Review code changes',
        version: '1.0.0',
        tags: ['code', 'review'],
        entrypoint: 'index.js',
      })
    );

    await manager.loadFromDir(tmpDir);
    const results = manager.search('code');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Code Review');
  });

  it('should search skills by tag', async () => {
    const skillDir = join(tmpDir, 'git-helper');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'manifest.json'),
      JSON.stringify({
        name: 'Git Helper',
        description: 'Help with git operations',
        version: '1.0.0',
        tags: ['git', 'version-control'],
        entrypoint: 'index.js',
      })
    );

    await manager.loadFromDir(tmpDir);
    const results = manager.search('git');
    assert.strictEqual(results.length, 1);
  });

  it('should get commands for a skill', async () => {
    const skillDir = join(tmpDir, 'cmd-skill');
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(join(skillDir, 'commands'), { recursive: true });
    writeFileSync(
      join(skillDir, 'manifest.json'),
      JSON.stringify({
        name: 'Command Skill',
        description: 'Skill with commands',
        version: '1.0.0',
        tags: [],
        entrypoint: 'index.js',
      })
    );
    writeFileSync(
      join(skillDir, 'commands', 'list.json'),
      JSON.stringify({
        name: 'list',
        description: 'List items',
        handler: 'list',
      })
    );

    await manager.loadFromDir(tmpDir);
    const cmds = manager.getCommands('cmd-skill');
    assert.strictEqual(cmds.length, 1);
    assert.strictEqual(cmds[0].name, 'list');
  });

  it('should get all commands across all skills', async () => {
    for (const skillName of ['skill-a', 'skill-b']) {
      const skillDir = join(tmpDir, skillName);
      mkdirSync(skillDir, { recursive: true });
      mkdirSync(join(skillDir, 'commands'), { recursive: true });
      writeFileSync(
        join(skillDir, 'manifest.json'),
        JSON.stringify({
          name: skillName,
          description: 'Test skill',
          version: '1.0.0',
          tags: [],
          entrypoint: 'index.js',
        })
      );
      writeFileSync(
        join(skillDir, 'commands', 'cmd.json'),
        JSON.stringify({
          name: 'cmd',
          description: 'A command',
          handler: 'cmd',
        })
      );
    }

    await manager.loadFromDir(tmpDir);
    const all = manager.getAllCommands();
    assert.strictEqual(all.length, 2);
    assert.ok(all.some((c) => c.skillId === 'skill-a'));
    assert.ok(all.some((c) => c.skillId === 'skill-b'));
  });

  it('should get a skill by ID', async () => {
    const skillDir = join(tmpDir, 'my-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'manifest.json'),
      JSON.stringify({
        name: 'My Skill',
        description: 'Desc',
        version: '1.0.0',
        tags: [],
        entrypoint: 'index.js',
      })
    );

    await manager.loadFromDir(tmpDir);
    const skill = manager.get('my-skill');
    assert.ok(skill !== null);
    assert.strictEqual(skill!.name, 'My Skill');
  });

  it('should return null for non-existent skill', async () => {
    assert.strictEqual(manager.get('nonexistent'), null);
  });
});
