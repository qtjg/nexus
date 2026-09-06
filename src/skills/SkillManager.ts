// NEXUS — Skills Manager
// Loads and manages skills from disk
import { existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SkillDefinition, SkillCommand } from '../cli/playground/types.js';
import { getSkillsDir, getProjectDir } from '../config/paths.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export class SkillManager {
  private skills = new Map<string, SkillDefinition>();
  private commands = new Map<string, SkillCommand[]>();

  async loadFromDir(dir: string): Promise<void> {
    if (!existsSync(dir)) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = join(dir, entry);
      try {
        const stat = await import('node:fs/promises').then((fs) => fs.stat(entryPath));
        if (stat.isDirectory()) {
          await this.loadSkillFromDir(entryPath);
        }
      } catch {
        // Skip unreadable entries
      }
    }
  }

  private async loadSkillFromDir(skillDir: string): Promise<void> {
    const id = basename(skillDir);
    const manifestPath = join(skillDir, 'manifest.json');

    if (!existsSync(manifestPath)) return;

    try {
      const fs = await import('node:fs/promises');
      const raw = await fs.readFile(manifestPath, 'utf8');
      const def: SkillDefinition = JSON.parse(raw);
      def.id = id;
      this.skills.set(id, def);
      this.commands.set(id, []);

      // Load skill commands
      const commandsDir = join(skillDir, 'commands');
      if (existsSync(commandsDir)) {
        const cmdEntries = readdirSync(commandsDir);
        for (const cmdFile of cmdEntries) {
          if (cmdFile.endsWith('.json')) {
            try {
              const cmdRaw = await fs.readFile(join(commandsDir, cmdFile), 'utf8');
              const cmd: SkillCommand = JSON.parse(cmdRaw);
              cmd.skillId = id;
              const cmds = this.commands.get(id) ?? [];
              cmds.push(cmd);
              this.commands.set(id, cmds);
            } catch {
              // Skip malformed command files
            }
          }
        }
      }
    } catch {
      // Skip invalid skill manifests
    }
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  get(id: string): SkillDefinition | null {
    return this.skills.get(id) ?? null;
  }

  search(query: string): SkillDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.skills.values()).filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  getCommands(skillId: string): SkillCommand[] {
    return this.commands.get(skillId) ?? [];
  }

  getAllCommands(): Array<{ skillId: string; cmd: SkillCommand }> {
    const result: Array<{ skillId: string; cmd: SkillCommand }> = [];
    for (const [id, cmds] of this.commands.entries()) {
      for (const cmd of cmds) {
        result.push({ skillId: id, cmd });
      }
    }
    return result;
  }
}

// Export singleton
export const skillManager = new SkillManager();
