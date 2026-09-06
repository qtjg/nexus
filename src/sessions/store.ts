// Session Store — NEXUS
// Persistent session storage

import type { Session, Message } from '../types/index.js';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import { getNexusDir, getProjectDir } from '../config/paths.js';
import path from 'path';

const SESSIONS_DIR = 'sessions';

export class SessionStore {
  private baseDir: string;

  constructor(projectPath?: string) {
    this.baseDir = projectPath
      ? path.join(getProjectDir(projectPath), SESSIONS_DIR)
      : path.join(getNexusDir(), SESSIONS_DIR);
  }

  async save(session: Session): Promise<void> {
    const filePath = path.join(this.baseDir, `${session.id}.json`);
    await writeJsonFile(filePath, session);
  }

  async load(sessionId: string): Promise<Session | null> {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    try {
      return readJsonFile<Session>(filePath);
    } catch {
      return null;
    }
  }

  async list(projectPath?: string): Promise<Session[]> {
    const dir = projectPath
      ? path.join(getProjectDir(projectPath), SESSIONS_DIR)
      : this.baseDir;

    try {
      const files = await import('fs/promises').then((fs) => fs.readdir(dir));
      const sessions: Session[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const session = readJsonFile<Session>(path.join(dir, file));
            if (session) sessions.push(session);
          } catch {
            // Skip corrupt files
          }
        }
      }
      return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch {
      return [];
    }
  }

  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) return;

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    await this.save(session);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) return;

    Object.assign(session, updates, { updatedAt: new Date().toISOString() });
    await this.save(session);
  }

  async delete(sessionId: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    try {
      await import('fs/promises').then((fs) => fs.unlink(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
