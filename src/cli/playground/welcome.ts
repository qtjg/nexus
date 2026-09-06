// NEXUS — Welcome Screen
// Displays the startup welcome banner and usage hints
import type { Renderer } from './renderer.js';

const ESC = '\x1b';
const CSI = `${ESC}[`;

export function showWelcome(renderer: Renderer): void {
  const lines: string[] = [
    '',
    `${ESC}[36m  ╔══════════════════════════════════════════════════════════════╗${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[1;36m  ┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m              ${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[1;36m  │${ESC}[36m │${ESC}[1;36m ${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m               ${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[1;36m  └─┘${ESC}[36m ${ESC}[1;36m└─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m└─┘${ESC}[36m ${ESC}[1;36m└─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m              ${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[0m                                                              ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[2m  NEXUS v0.1.0 — Universal AI Developer Platform              ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[0m                                                              ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[90m  Type a message to start chatting with AI.                  ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[90m  Use /help for slash commands. /quit to exit.               ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[0m                                                              ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ╚══════════════════════════════════════════════════════════════╝${ESC}[0m`,
    '',
  ];

  for (const line of lines) {
    process.stdout.write(`${line}\n`);
  }
}

export function showNoProviderWarning(): void {
  process.stdout.write(`${ESC}[33m  ⚠  No AI provider configured.\n`);
  process.stdout.write(`     Run: nexus provider add <name> --key $API_KEY\n${ESC}[0m\n`);
}

export function showResumeHint(sessionId: string): void {
  process.stdout.write(`${ESC}[36m  ▶  Resumed session: ${sessionId.slice(0, 8)}...${ESC}[0m\n`);
}

export function showSessionList(sessions: Array<{ id: string; title?: string; date: string }>): void {
  process.stdout.write(`${ESC}[36m  Sessions:${ESC}[0m\n`);
  for (const s of sessions) {
    const title = s.title || '(untitled)';
    const date = new Date(s.date).toLocaleDateString();
    process.stdout.write(`  ${ESC}[37m${s.id.slice(0, 8)}${ESC}[90m  ${title}${ESC}[90m  ${date}${ESC}[0m\n`);
  }
}
