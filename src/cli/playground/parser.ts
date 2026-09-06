// NEXUS — Slash Command Parser
// Parses slash commands, handles args, validation
import type { SlashCommand } from './types.js';

export interface ParsedCommand {
  name: string;
  args: string[];
  raw: string;
}

export function parseSlashCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  // Simple split: first word is the command name, rest are args
  const parts = trimmed.slice(1).split(/\s+/);
  const name = parts[0] ?? '';
  if (!name) return null;
  return {
    name,
    args: parts.slice(1),
    raw: trimmed,
  };
}

export function validateArgs(cmd: SlashCommand, args: string[]): string | null {
  // Default: no validation needed
  return null;
}

export function formatUsage(cmd: SlashCommand): string {
  if (cmd.usage) return cmd.usage;
  return `/${cmd.name}`;
}

export async function executeCommand(
  cmd: SlashCommand,
  context: import('./types.js').PlaygroundContext,
  args: string[]
): Promise<void> {
  const validationError = validateArgs(cmd, args);
  if (validationError) {
    console.error(`\x1b[31mError: ${validationError}\x1b[0m`);
    return;
  }
  await cmd.execute(context, args);
}
