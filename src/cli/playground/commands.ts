// NEXUS — Built-in Slash Commands
// Implements all slash commands for the playground
import type { SlashCommand, PlaygroundContext } from './types.js';

const ESC = '\x1b';

// ─── /help ─────────────────────────────────────────────────────
export const helpCommand: SlashCommand = {
  name: 'help',
  aliases: ['h'],
  description: 'Show available slash commands',
  category: 'info',
  execute: async (ctx) => {
    process.stdout.write(`${ESC}[36m  Available Commands:${ESC}[0m\n`);
    process.stdout.write(`${ESC}[36m  ─────────────────────────────────────────────────────────${ESC}[0m\n`);
    const cmdList = [
      { name: 'help', desc: 'Show this help' },
      { name: 'model', desc: 'Change model' },
      { name: 'models', desc: 'List models' },
      { name: 'provider', desc: 'Change provider' },
      { name: 'providers', desc: 'List providers' },
      { name: 'new', desc: 'New session' },
      { name: 'sessions', desc: 'List sessions' },
      { name: 'switch', desc: 'Switch session' },
      { name: 'clear', desc: 'Clear conversation' },
      { name: 'history', desc: 'Show history' },
      { name: 'save', desc: 'Save session' },
      { name: 'title', desc: 'Set session title' },
      { name: 'tools', desc: 'List tools' },
      { name: 'permissions', desc: 'Permission mode' },
      { name: 'context', desc: 'View context' },
      { name: 'project', desc: 'Project info' },
      { name: 'status', desc: 'Playground status' },
      { name: 'doctor', desc: 'Diagnostics' },
      { name: 'skills', desc: 'List skills' },
      { name: 'quit', desc: 'Exit playground' },
    ];
    for (const c of cmdList) {
      process.stdout.write(
        `  ${ESC}[37m/${c.name}${ESC}[0m${ESC}[90m${' '.repeat(Math.max(1, 14 - c.name.length))}${ESC}[0m  ${c.desc}\n`
      );
    }
    process.stdout.write(`\n  ${ESC}[90mType /<command> to run. Use > to enter multiline input.${ESC}[0m\n`);
  },
};

// ─── /model ────────────────────────────────────────────────────
export const modelCommand: SlashCommand = {
  name: 'model',
  aliases: ['m'],
  description: 'Change the current model',
  usage: '/model <model-id>',
  category: 'model',
  execute: async (ctx, args) => {
    if (args.length === 0) {
      process.stdout.write(`${ESC}[37m  Current model: ${ctx.model}${ESC}[0m\n`);
      process.stdout.write(`${ESC}[90m  Usage: /model <model-id>${ESC}[0m\n`);
      return;
    }
    ctx.switchModel(args[0]);
    process.stdout.write(`${ESC}[32m  ✓ Model set to: ${args[0]}${ESC}[0m\n`);
  },
  autocomplete: async (ctx, input) => {
    const models = ctx.config.getAllModels();
    return models
      .filter((m) => m.id.includes(input) || m.name.includes(input))
      .map((m) => m.id);
  },
};

// ─── /models ───────────────────────────────────────────────────
export const modelsCommand: SlashCommand = {
  name: 'models',
  aliases: ['ml'],
  description: 'List available models',
  category: 'model',
  execute: async (ctx) => {
    const models = ctx.config.getAllModels();
    if (models.length === 0) {
      process.stdout.write(`${ESC}[33m  No models configured.${ESC}[0m\n`);
      return;
    }
    for (const m of models) {
      const marker = m.id === ctx.model ? `${ESC}[32m✓${ESC}[0m` : ' ';
      process.stdout.write(`  ${marker} ${ESC}[37m${m.id}${ESC}[0m${ESC}[90m  —  ${m.name}${ESC}[0m\n`);
    }
  },
};

// ─── /provider ─────────────────────────────────────────────────
export const providerCommand: SlashCommand = {
  name: 'provider',
  aliases: ['p'],
  description: 'Change the current provider',
  usage: '/provider <provider-id>',
  category: 'model',
  execute: async (ctx, args) => {
    if (args.length === 0) {
      process.stdout.write(`${ESC}[37m  Current provider: ${ctx.providerId}${ESC}[0m\n`);
      process.stdout.write(`${ESC}[90m  Usage: /provider <provider-id>${ESC}[0m\n`);
      return;
    }
    ctx.switchProvider(args[0]);
    process.stdout.write(`${ESC}[32m  ✓ Provider set to: ${args[0]}${ESC}[0m\n`);
  },
};

// ─── /providers ────────────────────────────────────────────────
export const providersCommand: SlashCommand = {
  name: 'providers',
  aliases: ['pl'],
  description: 'List configured providers',
  category: 'model',
  execute: async (ctx) => {
    const providers = ctx.config.getAllProviders();
    if (providers.length === 0) {
      process.stdout.write(`${ESC}[33m  No providers configured.${ESC}[0m\n`);
      return;
    }
    for (const p of providers) {
      const marker = p.id === ctx.providerId ? `${ESC}[32m✓${ESC}[0m` : ' ';
      process.stdout.write(`  ${marker} ${ESC}[37m${p.id}${ESC}[0m${ESC}[90m  —  ${p.name}${ESC}[0m\n`);
    }
  },
};

// ─── /new ──────────────────────────────────────────────────────
export const newCommand: SlashCommand = {
  name: 'new',
  aliases: ['n'],
  description: 'Start a new session',
  usage: '/new [title]',
  category: 'session',
  execute: async (ctx, args) => {
    const title = args.join(' ') || undefined;
    const sessionId = await ctx.newSession(title);
    process.stdout.write(`${ESC}[32m  ✓ New session: ${sessionId.slice(0, 8)}...${ESC}[0m\n`);
  },
};

// ─── /sessions ─────────────────────────────────────────────────
export const sessionsCommand: SlashCommand = {
  name: 'sessions',
  aliases: ['ss'],
  description: 'List all sessions',
  category: 'session',
  execute: async (ctx) => {
    const sessions = await ctx.listSessions();
    if (sessions.length === 0) {
      process.stdout.write(`${ESC}[90m  No sessions yet.${ESC}[0m\n`);
      return;
    }
    for (const s of sessions) {
      const marker = s.id === ctx.currentSessionId ? `${ESC}[32m►${ESC}[0m` : ' ';
      const date = new Date(s.updatedAt).toLocaleDateString();
      process.stdout.write(
        `  ${marker} ${ESC}[37m${s.id.slice(0, 8)}${ESC}[0m${ESC}[90m  ${s.name || '(untitled)'}${ESC}[90m  ${date}${ESC}[0m\n`
      );
    }
  },
};

// ─── /switch ───────────────────────────────────────────────────
export const switchCommand: SlashCommand = {
  name: 'switch',
  aliases: ['sw', 'go'],
  description: 'Switch to a session',
  usage: '/switch <session-id>',
  category: 'session',
  execute: async (ctx, args) => {
    if (args.length === 0) {
      process.stdout.write(`${ESC}[33m  Usage: /switch <session-id>${ESC}[0m\n`);
      return;
    }
    await ctx.resumeSession(args[0]);
    process.stdout.write(`${ESC}[32m  ✓ Switched to session${ESC}[0m\n`);
  },
};

// ─── /clear ────────────────────────────────────────────────────
export const clearCommand: SlashCommand = {
  name: 'clear',
  aliases: ['cl'],
  description: 'Clear the conversation history',
  category: 'session',
  execute: async (ctx) => {
    ctx.messages = [];
    process.stdout.write(`${ESC}[90m  Conversation cleared.${ESC}[0m\n`);
  },
};

// ─── /quit ─────────────────────────────────────────────────────
export const quitCommand: SlashCommand = {
  name: 'quit',
  aliases: ['exit', 'q'],
  description: 'Exit the playground',
  category: 'admin',
  execute: async (_ctx) => {
    process.stdout.write(`${ESC}[36m  Exiting NEXUS Playground.${ESC}[0m\n`);
    process.exit(0);
  },
};

// ─── /status ───────────────────────────────────────────────────
export const statusCommand: SlashCommand = {
  name: 'status',
  aliases: ['st'],
  description: 'Show current playground status',
  category: 'info',
  execute: async (ctx) => {
    process.stdout.write(`${ESC}[36m  ── NEXUS Status ──${ESC}[0m\n`);
    process.stdout.write(`  Provider:  ${ctx.providerId}\n`);
    process.stdout.write(`  Model:     ${ctx.model}\n`);
    process.stdout.write(`  Permission: ${ctx.permissionMode}\n`);
    process.stdout.write(`  Session:   ${ctx.currentSessionId.slice(0, 8)}...\n`);
    process.stdout.write(`  Messages:  ${ctx.messages.length}\n`);
    process.stdout.write(`  Streaming: ${ctx.streaming}\n`);
  },
};

// ─── /history ──────────────────────────────────────────────────
export const historyCommand: SlashCommand = {
  name: 'history',
  aliases: ['hi'],
  description: 'Show conversation history',
  category: 'session',
  execute: async (ctx) => {
    if (ctx.messages.length === 0) {
      process.stdout.write(`${ESC}[90m  No history yet.${ESC}[0m\n`);
      return;
    }
    for (const msg of ctx.messages.slice(-20)) {
      const role = msg.role === 'user' ? `${ESC}[36mUser${ESC}[0m` : msg.role === 'assistant' ? `${ESC}[32mAI${ESC}[0m` : `${ESC}[90mSystem${ESC}[0m`;
      process.stdout.write(`  ${role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`);
    }
  },
};

// ─── /save ─────────────────────────────────────────────────────
export const saveCommand: SlashCommand = {
  name: 'save',
  aliases: ['sa'],
  description: 'Save the current session',
  category: 'session',
  execute: async (ctx) => {
    if (ctx.currentSession) {
      await ctx.sessionStore.save(ctx.currentSession);
      process.stdout.write(`${ESC}[32m  ✓ Session saved.${ESC}[0m\n`);
    } else {
      process.stdout.write(`${ESC}[33m  No active session to save.${ESC}[0m\n`);
    }
  },
};

// ─── /title ────────────────────────────────────────────────────
export const titleCommand: SlashCommand = {
  name: 'title',
  aliases: ['tl'],
  description: 'Set the session title',
  usage: '/title <title>',
  category: 'session',
  execute: async (ctx, args) => {
    if (args.length === 0) {
      process.stdout.write(
        `${ESC}[37m  Current title: ${ctx.currentSession?.name || '(none)'}${ESC}[0m\n`
      );
      return;
    }
    if (ctx.currentSession) {
      ctx.currentSession.name = args.join(' ');
      await ctx.sessionStore.save(ctx.currentSession);
      process.stdout.write(`${ESC}[32m  ✓ Title set: ${args.join(' ')}${ESC}[0m\n`);
    }
  },
};

// ─── /tools ────────────────────────────────────────────────────
export const toolsCommand: SlashCommand = {
  name: 'tools',
  aliases: ['to'],
  description: 'List available tools',
  category: 'tools',
  execute: async (ctx) => {
    const tools = ctx.config.get().tools;
    if (tools.length === 0) {
      process.stdout.write(`${ESC}[90m  No custom tools configured.${ESC}[0m\n`);
      return;
    }
    for (const t of tools) {
      const enabled = t.enabled !== false ? `${ESC}[32m✓${ESC}[0m` : `${ESC}[31m✗${ESC}[0m`;
      process.stdout.write(`  ${enabled} ${ESC}[37m${t.name}${ESC}[0m${ESC}[90m  —  ${t.description}${ESC}[0m\n`);
    }
  },
};

// ─── /permissions / /mode ──────────────────────────────────────
export const permissionsCommand: SlashCommand = {
  name: 'permissions',
  aliases: ['perm', 'mode'],
  description: 'Change permission mode',
  usage: '/permissions <safe|normal|sandbox|relaxed>',
  category: 'config',
  execute: async (ctx, args) => {
    if (args.length === 0) {
      process.stdout.write(`${ESC}[37m  Current mode: ${ctx.permissionMode}${ESC}[0m\n`);
      process.stdout.write(`${ESC}[90m  Modes: safe, normal, sandbox, relaxed${ESC}[0m\n`);
      return;
    }
    const mode = args[0] as import('../../types/index.js').PermissionMode;
    if (!['safe', 'normal', 'sandbox', 'relaxed'].includes(mode)) {
      process.stdout.write(`${ESC}[31m  Invalid mode. Use: safe, normal, sandbox, relaxed${ESC}[0m\n`);
      return;
    }
    ctx.setPermissionMode(mode);
    process.stdout.write(`${ESC}[32m  ✓ Permission mode set to: ${mode}${ESC}[0m\n`);
  },
};

// ─── /context ──────────────────────────────────────────────────
export const contextCommand: SlashCommand = {
  name: 'context',
  aliases: ['ctx'],
  description: 'View or manage context',
  category: 'info',
  execute: async (ctx) => {
    process.stdout.write(`${ESC}[36m  ── Context ──${ESC}[0m\n`);
    process.stdout.write(`  Messages: ${ctx.messages.length}\n`);
    process.stdout.write(`  Mode: ${ctx.permissionMode}\n`);
    process.stdout.write(`  Project: ${ctx.projectPath}\n`);
  },
};

// ─── /project ──────────────────────────────────────────────────
export const projectCommand: SlashCommand = {
  name: 'project',
  aliases: ['proj'],
  description: 'Show project information',
  category: 'info',
  execute: async (ctx) => {
    const info = await ctx.getProjectInfo();
    process.stdout.write(`${ESC}[36m  ── Project ──${ESC}[0m\n`);
    process.stdout.write(`  Path:    ${ctx.projectPath}\n`);
    process.stdout.write(`  Type:    ${info.language || 'unknown'}\n`);
    process.stdout.write(`  Framework: ${info.framework || 'none'}\n`);
    process.stdout.write(`  Git:     ${info.hasGit ? 'yes' : 'no'}\n`);
  },
};

// ─── /doctor ───────────────────────────────────────────────────
export const doctorCommand: SlashCommand = {
  name: 'doctor',
  aliases: ['dx'],
  description: 'Run diagnostics',
  category: 'admin',
  execute: async (ctx) => {
    process.stdout.write(`${ESC}[36m  ── NEXUS Diagnostics ──${ESC}[0m\n`);
    const providers = ctx.config.getAllProviders();
    const models = ctx.config.getAllModels();
    process.stdout.write(`  Providers:  ${providers.length} configured\n`);
    process.stdout.write(`  Models:     ${models.length} configured\n`);
    process.stdout.write(`  Mode:       ${ctx.permissionMode}\n`);
    process.stdout.write(`  Session:    ${ctx.currentSessionId.slice(0, 8)}...\n`);
    process.stdout.write(`  Platform:   ${process.platform} ${process.arch}\n`);
    process.stdout.write(`  Node:       ${process.version}\n`);
  },
};

// ─── /skills ───────────────────────────────────────────────────
export const skillsCommand: SlashCommand = {
  name: 'skills',
  aliases: ['sk'],
  description: 'List available skills',
  category: 'skill',
  execute: async (ctx) => {
    const { skillManager } = await import('../../skills/SkillManager.js');
    const skills = skillManager.list();
    if (skills.length === 0) {
      process.stdout.write(`${ESC}[90m  No skills installed.${ESC}[0m\n`);
      process.stdout.write(`  ${ESC}[90m  Skills go in: ${process.env.NEXUS_DIR || '~/.nexus'}/skills/${ESC}[0m\n`);
      return;
    }
    for (const s of skills) {
      process.stdout.write(`  ${ESC}[37m${s.name}${ESC}[0m${ESC}[90m  —  ${s.description}${ESC}[0m\n`);
      process.stdout.write(`    ${ESC}[90m${s.tags.join(', ')}${ESC}[0m\n`);
    }
  },
};

// ─── /cost ─────────────────────────────────────────────────────
export const costCommand: SlashCommand = {
  name: 'cost',
  aliases: ['c'],
  description: 'Show cost information',
  category: 'info',
  execute: async (ctx) => {
    process.stdout.write(`${ESC}[36m  ── Cost ──${ESC}[0m\n`);
    const totalTokens = ctx.messages.reduce((a, m) => a + ((m as any).usage?.total ?? 0), 0);
    process.stdout.write(`  Tokens used:  ${totalTokens}\n`);
    process.stdout.write(`  Est. cost:    $0.0000 (pricing not configured)\n`);
  },
};

// ─── Register all commands ─────────────────────────────────────
export function registerAllCommands(registry: { register: (cmd: SlashCommand) => void }): void {
  const cmds: SlashCommand[] = [
    helpCommand,
    modelCommand,
    modelsCommand,
    providerCommand,
    providersCommand,
    newCommand,
    sessionsCommand,
    switchCommand,
    clearCommand,
    quitCommand,
    statusCommand,
    historyCommand,
    saveCommand,
    titleCommand,
    toolsCommand,
    permissionsCommand,
    contextCommand,
    projectCommand,
    doctorCommand,
    skillsCommand,
    costCommand,
  ];
  for (const cmd of cmds) {
    registry.register(cmd);
  }
}
