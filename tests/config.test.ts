// NEXUS — Config Manager Tests
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../dist/config/index.js';
import type { ProviderConfig } from '../dist/types/index.js';

function getTestDir(): string {
  return path.join(process.cwd(), `.test-nexus-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
}

function cleanProjectForge(projectDir: string) {
  const forge = path.join(projectDir, '.forge');
  try { fs.rmSync(forge, { recursive: true, force: true }); } catch {}
}

function cleanStaleDirs() {
  for (const entry of fs.readdirSync(process.cwd(), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('.test-nexus-')) {
      try { fs.rmSync(path.join(process.cwd(), entry.name), { recursive: true, force: true }); } catch {}
    }
  }
}

describe('ConfigManager', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(() => {
    cleanStaleDirs();
    tmpDir = getTestDir();
    projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    process.env.NEXUS_DIR = tmpDir;
    cleanProjectForge(projectDir);
  });

  afterEach(() => {
    delete process.env.NEXUS_DIR;
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    cleanStaleDirs();
  });

  it('should create default config', () => {
    const config = new ConfigManager(projectDir);
    const cfg = config.get();
    assert.ok(cfg, 'should have config');
    assert.equal(cfg.version, '0.1.0');
    assert.equal(cfg.permissionMode, 'safe');
    assert.equal(cfg.streaming, true);
  });

  it('should add and retrieve providers', () => {
    const config = new ConfigManager(projectDir);
    const provider: ProviderConfig = {
      id: `prov-${Date.now()}-1`,
      name: 'Test Provider',
      type: 'openai',
      apiKey: 'sk-test',
      capabilities: {
        streaming: true, toolCalling: true, structuredOutput: false,
        imageSupport: false, audioSupport: false, embeddings: false,
        maxContextWindow: 128000,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    config.addProvider(provider);
    const retrieved = config.getProvider(provider.id);
    assert.ok(retrieved, 'should find provider');
    assert.equal(retrieved!.name, 'Test Provider');
  });

  it('should list all providers', () => {
    const config = new ConfigManager(projectDir);
    const id1 = `prov-${Date.now()}-list-1`;
    const id2 = `prov-${Date.now()}-list-2`;
    config.addProvider({
      id: id1, name: 'P1', type: 'openai', apiKey: 'key1',
      capabilities: { streaming: true, toolCalling: true, structuredOutput: false, imageSupport: false, audioSupport: false, embeddings: false, maxContextWindow: 128000 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    config.addProvider({
      id: id2, name: 'P2', type: 'anthropic', apiKey: 'key2',
      capabilities: { streaming: true, toolCalling: true, structuredOutput: true, imageSupport: true, audioSupport: false, embeddings: false, maxContextWindow: 200000 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const providers = config.getAllProviders();
    assert.equal(providers.length, 2, `should have 2 providers, got ${providers.length}`);
  });

  it('should add and retrieve models', () => {
    const config = new ConfigManager(projectDir);
    const modelId = `model-${Date.now()}-gpt4`;
    config.addModel({
      id: modelId,
      name: 'GPT-4',
      provider: 'test',
      source: 'cloud',
      contextWindow: 128000,
      capabilities: { chat: true, streaming: true, toolCalling: true, structuredOutput: false, vision: false, reasoning: false },
      aliases: ['gpt4'],
      createdAt: new Date().toISOString(),
    });

    const retrieved = config.getModel(modelId);
    assert.ok(retrieved, 'should find model');
    assert.equal(retrieved!.name, 'GPT-4');
    const byAlias = config.getModel('gpt4');
    assert.ok(byAlias, 'should find by alias');
  });

  it('should set and get default model', () => {
    const config = new ConfigManager(projectDir);
    const modelId = `model-${Date.now()}-m1`;
    config.addModel({
      id: modelId, name: 'M1', provider: 'p', source: 'cloud',
      contextWindow: 128000,
      capabilities: { chat: true, streaming: true, toolCalling: true, structuredOutput: false, vision: false, reasoning: false },
      aliases: [], createdAt: new Date().toISOString(),
    });
    config.setDefaultModel(modelId);
    assert.equal(config.get().defaultModel, modelId, 'should set default model');
  });

  it('should persist config to disk', () => {
    const config = new ConfigManager(projectDir);
    const id = `persisted-${Date.now()}`;
    config.addProvider({
      id, name: 'Persisted', type: 'openai', apiKey: 'key',
      capabilities: { streaming: true, toolCalling: true, structuredOutput: false, imageSupport: false, audioSupport: false, embeddings: false, maxContextWindow: 128000 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const configPath = path.join(projectDir, '.forge', 'config.json');
    assert.ok(fs.existsSync(configPath), 'config should be persisted to disk');

    const loaded = new ConfigManager(projectDir);
    const provider = loaded.getProvider(id);
    assert.ok(provider, 'should load persisted provider from disk');
  });

  it('should remove providers', () => {
    const config = new ConfigManager(projectDir);
    const id = `to-remove-${Date.now()}`;
    config.addProvider({
      id, name: 'Remove Me', type: 'openai', apiKey: 'key',
      capabilities: { streaming: true, toolCalling: true, structuredOutput: false, imageSupport: false, audioSupport: false, embeddings: false, maxContextWindow: 128000 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    const removed = config.removeProvider(id);
    assert.equal(removed, true);
    assert.equal(config.getProvider(id), null);
  });

  it('should set permission mode', () => {
    const config = new ConfigManager(projectDir);
    assert.equal(config.get().permissionMode, 'safe');
    config.setPermissionMode('sandbox');
    assert.equal(config.get().permissionMode, 'sandbox');
  });
});
