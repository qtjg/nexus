// NEXUS — Session Store Tests
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SessionStore } from '../dist/sessions/store.js';
import type { Session, Message } from '../dist/types/index.js';

function getTestDir(): string {
  return path.join(process.cwd(), `.test-sessions-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
}

function cleanStaleDirs() {
  for (const entry of fs.readdirSync(process.cwd(), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('.test-')) {
      try { fs.rmSync(path.join(process.cwd(), entry.name), { recursive: true, force: true }); } catch {}
    }
  }
  const forge = path.join(process.cwd(), '.forge');
  try { fs.rmSync(forge, { recursive: true, force: true }); } catch {}
}

describe('SessionStore', () => {
  let tmpDir: string;

  beforeEach(() => {
    cleanStaleDirs();
    tmpDir = getTestDir();
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.NEXUS_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.NEXUS_DIR;
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    cleanStaleDirs();
  });

  function makeSession(id: string): Session {
    return {
      id,
      projectId: tmpDir,
      name: `Session ${id}`,
      status: 'active',
      model: 'test-model',
      provider: 'test-provider',
      messages: [],
      tools: [],
      permissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };
  }

  it('should save and load a session', async () => {
    const store = new SessionStore(tmpDir);
    const session = makeSession(`test-session-${Date.now()}`);
    await store.save(session);
    const loaded = await store.load(session.id);
    assert.ok(loaded, 'session should be loaded');
    assert.equal(loaded!.id, session.id);
    assert.equal(loaded!.name, session.name);
  });

  it('should list all sessions', async () => {
    const store = new SessionStore(tmpDir);
    const id1 = `session-${Date.now()}-1`;
    const id2 = `session-${Date.now()}-2`;
    await store.save(makeSession(id1));
    await store.save(makeSession(id2));

    const sessions = await store.list();
    assert.equal(sessions.length, 2, `should have 2 sessions, got ${sessions.length}`);
  });

  it('should append messages to a session', async () => {
    const store = new SessionStore(tmpDir);
    const sessionId = `msg-session-${Date.now()}`;
    await store.save(makeSession(sessionId));

    const msg: Message = {
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
    };
    await store.appendMessage(sessionId, msg);

    const loaded = await store.load(sessionId);
    assert.equal(loaded!.messages.length, 1, 'should have 1 message');
    assert.equal(loaded!.messages[0].content, 'Hello');
  });

  it('should return null for non-existent session', async () => {
    const store = new SessionStore(tmpDir);
    const loaded = await store.load(`nonexistent-${Date.now()}`);
    assert.equal(loaded, null, 'should return null for missing session');
  });

  it('should delete a session', async () => {
    const store = new SessionStore(tmpDir);
    const sessionId = `delete-session-${Date.now()}`;
    await store.save(makeSession(sessionId));
    const deleted = await store.delete(sessionId);
    assert.equal(deleted, true);
    const loaded = await store.load(sessionId);
    assert.equal(loaded, null, 'should be deleted');
  });
});
