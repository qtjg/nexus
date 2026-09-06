// NEXUS — Slash Command Registry
// Central registry for all slash commands in the playground
import type { SlashCommand, SlashCommandMeta, PlaygroundContext } from './types.js';

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();
  private aliases = new Map<string, string>();

  register(cmd: SlashCommand): void {
    this.commands.set(cmd.name.toLowerCase(), cmd);
    for (const alias of cmd.aliases) {
      this.commands.set(alias.toLowerCase(), cmd);
      this.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
    }
  }

  get(name: string): SlashCommand | undefined {
    const key = name.toLowerCase();
    return this.commands.get(key);
  }

  resolve(name: string): string {
    const key = name.toLowerCase();
    return this.aliases.get(key) ?? key;
  }

  listMetas(): SlashCommandMeta[] {
    const seen = new Set<string>();
    return Array.from(this.commands.values()).map((c) => ({
      name: c.name,
      aliases: c.aliases,
      description: c.description,
      usage: c.usage,
      category: c.category,
      helpText: c.helpText,
    })).filter((meta) => {
      if (seen.has(meta.name)) return false;
      seen.add(meta.name);
      return true;
    });
  }

  has(name: string): boolean {
    return this.commands.has(name.toLowerCase());
  }

  matchPrefix(prefix: string): string[] {
    const key = prefix.toLowerCase();
    const results: string[] = [];
    for (const name of this.commands.keys()) {
      if (name.startsWith(key) && name !== key) {
        results.push(name);
      }
    }
    for (const alias of this.aliases.keys()) {
      if (alias.startsWith(key) && !results.includes(alias)) {
        results.push(alias);
      }
    }
    return results;
  }

  getAutocomplete(_cmdName: string, _input: string): string[] {
    // Autocomplete is handled at the command level
    return [];
  }
}

export const registry = new SlashCommandRegistry();
