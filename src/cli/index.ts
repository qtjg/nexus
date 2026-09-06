#!/usr/bin/env node
// NEXUS CLI Entry Point

import { Command } from 'commander';
import chalk from 'chalk';
import { createConfig } from '../config/index.js';
import { createProvider, type Provider } from '../providers/index.js';
import { BUILTIN_TOOLS } from '../tools/definitions.js';
import { AgentHarness, type HarnessOptions } from '../harness/index.js';
import { PermissionEngine } from '../permissions/engine.js';
import { ContextBuilder } from '../context/builder.js';
import { SessionStore } from '../sessions/store.js';
import { detectProjectType } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import * as path from 'path';
import * as os from 'os';

const program = new Command();

program
  .name('nexus')
  .description('NEXUS — Universal AI Developer Platform')
  .version('0.1.0');

// ─── Main interactive command ────────────────────────────────
// Commander v4 does not fire the program's default action when subcommands exist.
// We define the options here so they appear in help, but the action is dispatched
// manually after parse() when no subcommand matched.
program
  .description('Start interactive NEXUS session')
  .option('-m, --model <model>', 'Model to use')
  .option('-p, --provider <provider>', 'Provider to use')
  .option('--safe', 'Safe permission mode (ask before everything)')
  .option('--normal', 'Normal permission mode')
  .option('--sandbox', 'Sandbox mode (deny dangerous operations)')
  .option('--no-stream', 'Disable streaming');

// ─── Provider commands ───────────────────────────────────────
program
  .command('providers')
  .description('List configured providers')
  .action(() => {
    const config = createConfig();
    const providers = config.getAllProviders();
    if (providers.length === 0) {
      console.log(chalk.yellow('No providers configured.'));
      console.log(chalk.dim('  Add one with: nexus provider add <name> --api-key $KEY'));
      return;
    }
    console.log(chalk.cyan('\nConfigured Providers:\n'));
    for (const p of providers) {
      const status = p.apiKey ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${chalk.bold(p.name)} (${p.id})`);
      console.log(`    Type: ${p.type} | Base: ${p.baseUrl}`);
      console.log(`    Caps: ${Object.entries(p.capabilities).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`);
    }
    console.log('');
  });

program
  .command('provider <id>')
  .description('Add or manage a provider')
  .option('--api-key <key>', 'API key')
  .option('--base-url <url>', 'Base URL (for custom providers)')
  .option('--model <model>', 'Default model name')
  .action(async (id: string, opts: { apiKey?: string; baseUrl?: string; model?: string }) => {
    const config = createConfig();
    const existing = config.getProvider(id);

    if (opts.apiKey || opts.baseUrl) {
      const apiKey = opts.apiKey || process.env[`${id.toUpperCase()}_API_KEY`];
      if (!apiKey) {
        console.error(chalk.red(`API key required. Use: --api-key $KEY`));
        process.exit(1);
      }

      const providerConfig = {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        type: id as any,
        baseUrl: opts.baseUrl || getDefaultBaseUrl(id),
        apiKey,
        capabilities: getProviderCapabilities(id),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      config.addProvider(providerConfig);
      console.log(chalk.green(`Provider "${id}" configured successfully.`));

      // Auto-add default model
      const defaultModel = getDefaultModel(id, opts.model);
      if (defaultModel) {
        const model = {
          id: `${id}/${defaultModel.id}`,
          name: defaultModel.id,
          provider: id,
          source: 'cloud' as const,
          contextWindow: defaultModel.contextWindow,
          capabilities: { chat: true, streaming: true, toolCalling: true, structuredOutput: false, vision: false, reasoning: false },
          aliases: [],
          createdAt: new Date().toISOString(),
        };
        config.addModel(model);
        console.log(chalk.green(`  Model "${model.id}" added.`));
      }
    } else if (existing) {
      console.log(chalk.cyan(`\nProvider: ${existing.name} (${existing.id})`));
      console.log(`  Type: ${existing.type}`);
      console.log(`  Base URL: ${existing.baseUrl}`);
      console.log(`  API Key: ${existing.apiKey ? '✓ Set' : chalk.red('✗ Not set')}`);
      console.log(`  Capabilities: ${Object.entries(existing.capabilities).filter(([, v]) => v).map(([k]) => k).join(', ')}`);
    } else {
      console.error(chalk.red(`Provider "${id}" not found.`));
      console.error(chalk.yellow('Run with --api-key to configure.'));
      process.exit(1);
    }
  });

// ─── Model commands ──────────────────────────────────────────
program
  .command('models')
  .description('List available models')
  .action(() => {
    const config = createConfig();
    const models = config.getAllModels();
    if (models.length === 0) {
      console.log(chalk.yellow('No models configured.'));
      console.log(chalk.dim('  Add a provider first: nexus provider add openrouter --api-key $KEY'));
      return;
    }
    console.log(chalk.cyan('\nConfigured Models:\n'));
    for (const m of models) {
      const tag = m.source === 'local' ? chalk.green('[local]') : m.source === 'gateway' ? chalk.yellow('[gateway]') : chalk.blue('[cloud]');
      console.log(`  ${chalk.bold(m.id)} ${tag}`);
      console.log(`    Provider: ${m.provider} | Context: ${m.contextWindow.toLocaleString()} tokens`);
      if (m.aliases.length > 0) {
        console.log(`    Aliases: ${m.aliases.join(', ')}`);
      }
    }
    console.log('');
  });

program
  .command('model <id>')
  .description('Use a model')
  .action((id: string) => {
    const config = createConfig();
    const model = config.getModel(id);
    if (!model) {
      console.error(chalk.red(`Model "${id}" not found.`));
      console.error(chalk.yellow('Run: nexus models'));
      process.exit(1);
    }
    config.setDefaultModel(model.id);
    console.log(chalk.green(`Switched to model: ${model.id}`));
  });

// ─── Init command ─────────────────────────────────────────────
program
  .command('init')
  .description('Initialize NEXUS in current directory')
  .action(() => {
    const config = createConfig();
    const projectPath = process.cwd();
    console.log(chalk.cyan('\nNEXUS Initialization\n'));
    console.log(`  Project: ${projectPath}`);
    console.log(`  Config dir: ${config.get() ? 'exists' : 'creating...'}`);
    console.log(chalk.dim('\nNext steps:'));
    console.log('  1. nexus provider add openrouter --api-key $OPENROUTER_API_KEY');
    console.log('  2. nexus model use <model-id>');
    console.log('  3. nexus  (start interactive session)');
    console.log('');
  });

// ─── Doctor command ──────────────────────────────────────────
program
  .command('doctor')
  .description('Check NEXUS health and configuration')
  .action(async () => {
    const config = createConfig();
    console.log(chalk.cyan('\nNEXUS Doctor\n'));

    // Config
    const hasConfig = config.get().providers.length > 0;
    console.log(`${hasConfig ? chalk.green('✓') : chalk.red('✗')} Configuration: ${hasConfig ? 'OK' : 'No providers configured'}`);

    // Providers
    for (const p of config.getAllProviders()) {
      try {
        const provider = createProvider(p);
        const healthy = await provider.healthCheck();
        console.log(`${healthy ? chalk.green('✓') : chalk.red('✗')} Provider ${p.name}: ${healthy ? 'healthy' : 'unhealthy'}`);
      } catch {
        console.log(`${chalk.red('✗')} Provider ${p.name}: error`);
      }
    }

    // Models
    const models = config.getAllModels();
    console.log(`${models.length > 0 ? chalk.green('✓') : chalk.yellow('!')} Models: ${models.length} configured`);

    // Directories
    const { getNexusDir } = await import('../config/paths.js');
    const nexusDir = getNexusDir();
    console.log(`${chalk.green('✓')} Nexus dir: ${nexusDir}`);

    // Tools
    console.log(`${chalk.green('✓')} Built-in tools: ${BUILTIN_TOOLS.length}`);

    console.log('');
  });

// ─── Help command ─────────────────────────────────────────────
program
  .command('help')
  .description('Show help')
  .action(() => {
    console.log(chalk.cyan('\nNEXUS — Universal AI Developer Platform\n'));
    console.log('  Commands:');
    console.log('    nexus            Start interactive session');
    console.log('    nexus init       Initialize NEXUS in current directory');
    console.log('    nexus providers  List providers');
    console.log('    nexus provider   Add/manage a provider');
    console.log('    nexus models     List models');
    console.log('    nexus model      Use a model');
    console.log('    nexus doctor     Health check');
    console.log('');
    console.log('  Examples:');
    console.log('    nexus provider add openrouter --api-key $OPENROUTER_API_KEY');
    console.log('    nexus model use openrouter/claude-sonnet-4-20250514');
    console.log('    nexus  # start interactive');
    console.log('');
  });

// ─── Legacy commands (aliases) ───────────────────────────────
program
  .command('chat')
  .alias('c')
  .description('Alias for interactive session')
  .action(() => {
    process.argv.splice(2, 1); // Remove 'chat'
    program.parse(process.argv);
  });

program
  .command('run')
  .alias('r')
  .description('Alias for interactive session')
  .action(() => {
    process.argv.splice(2, 1);
    program.parse(process.argv);
  });

// ─── Parse and run ───────────────────────────────────────────
program.parse(process.argv);

// Commander v4 does not fire the program's default action when subcommands are defined.
// If no subcommand matched (args is empty) and help was not requested, dispatch to
// the interactive session with the program-level options.
if (program.args.length === 0) {
  await startInteractiveSession(program.opts());
}

// ─── Helper Functions ────────────────────────────────────────

function resolveModel(config: ReturnType<typeof createConfig>, requested?: string): string {
  if (requested) {
    const model = config.getModel(requested);
    return model?.id || requested;
  }
  return config.get().defaultModel || 'openrouter/claude-sonnet-4-20250514';
}

function buildSystemPrompt(
  config: ReturnType<typeof createConfig>,
  projectInfo: Awaited<ReturnType<typeof detectProjectType>>,
  providerId: string,
  modelId: string
): string {
  const projectContext = projectInfo.language
    ? `You are working in a ${projectInfo.language}${projectInfo.framework ? ` ${projectInfo.framework}` : ''} project.\n`
    : '';

  return `You are NEXUS, a universal AI developer assistant.

${projectContext}You have access to the following tools:
- read_file: Read file contents
- write_file: Write files
- edit_file: Edit files by string replacement
- list_dir: List directory contents
- search_files: Search for files
- execute_command: Run shell commands
- git_status: Check git status
- git_diff: View changes
- git_log: View commit history
- git_branch: List branches
- file_info: Get file metadata

Guidelines:
- Always be helpful, precise, and professional.
- Explain your reasoning before making changes.
- Use tools to inspect the project before making modifications.
- Respect permissions — never execute destructive operations without approval.
- When editing files, use edit_file with exact string matches.
- After making changes, suggest running tests or verification.
- Keep responses concise but thorough.

Current model: ${modelId}
Current provider: ${providerId}`;
}

function getDefaultBaseUrl(id: string): string {
  const bases: Record<string, string> = {
    openrouter: 'https://openrouter.ai/api/v1',
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    deepseek: 'https://api.deepseek.com/v1',
    ollama: 'http://localhost:11434/v1',
    lmstudio: 'http://localhost:1234/v1',
  };
  return bases[id] ?? 'https://api.openai.com/v1';
}

function getProviderCapabilities(id: string): import('../types/index.js').ProviderCapabilities {
  const caps: Record<string, import('../types/index.js').ProviderCapabilities> = {
    openrouter: {
      streaming: true,
      toolCalling: true,
      structuredOutput: false,
      imageSupport: false,
      audioSupport: false,
      embeddings: false,
      maxContextWindow: 128000,
    },
    anthropic: {
      streaming: true,
      toolCalling: true,
      structuredOutput: true,
      imageSupport: true,
      audioSupport: false,
      embeddings: false,
      maxContextWindow: 200000,
    },
    openai: {
      streaming: true,
      toolCalling: true,
      structuredOutput: false,
      imageSupport: false,
      audioSupport: false,
      embeddings: false,
      maxContextWindow: 128000,
    },
    ollama: {
      streaming: true,
      toolCalling: true,
      structuredOutput: false,
      imageSupport: false,
      audioSupport: false,
      embeddings: false,
      maxContextWindow: 128000,
    },
    lmstudio: {
      streaming: true,
      toolCalling: true,
      structuredOutput: false,
      imageSupport: false,
      audioSupport: false,
      embeddings: false,
      maxContextWindow: 128000,
    },
  };
  return caps[id] ?? caps.openrouter;
}

function getDefaultModel(id: string, override?: string): { id: string; contextWindow: number } | null {
  if (override) return { id: override, contextWindow: 128000 };
  const models: Record<string, { id: string; contextWindow: number }> = {
    openrouter: { id: 'anthropic/claude-sonnet-4-20250514', contextWindow: 200000 },
    anthropic: { id: 'claude-sonnet-4-20250514', contextWindow: 200000 },
    openai: { id: 'gpt-4o', contextWindow: 128000 },
    ollama: { id: 'llama3.2', contextWindow: 128000 },
    lmstudio: { id: 'local-model', contextWindow: 128000 },
  };
  return models[id] ?? null;
}

async function startInteractiveSession(opts: {
  model?: string;
  provider?: string;
  safe?: boolean;
  normal?: boolean;
  sandbox?: boolean;
  stream?: boolean;
}): Promise<void> {
  const projectPath = process.cwd();
  const config = createConfig(projectPath);

  // Detect project
  const projectInfo = await detectProjectType(projectPath);
  logger.info(`Project detected: ${projectPath}`);
  if (projectInfo.language) logger.info(`Language: ${projectInfo.language}`);
  if (projectInfo.framework) logger.info(`Framework: ${projectInfo.framework}`);

  // Resolve model and provider
  const model = resolveModel(config, opts.model);
  const providerId = opts.provider || (config as any).config?.defaultProvider || 'openrouter';
  const providerConfig = config.getProvider(providerId);

  if (!providerConfig) {
    console.error(chalk.red(`Provider not found: ${providerId}`));
    console.error(chalk.yellow('Run: nexus provider add <provider> --api-key $API_KEY'));
    process.exit(1);
  }

  // Create provider
  const provider = createProvider(providerConfig);

  // Verify connectivity
  const healthy = await provider.healthCheck();
  if (!healthy) {
    console.error(chalk.red(`Provider "${providerId}" is not reachable`));
    console.error(chalk.yellow('Check your API key and network connection.'));
    process.exit(1);
  }

  // Setup permission engine
  const permissionMode = opts.safe ? 'safe' : opts.sandbox ? 'sandbox' : 'normal';
  const permEngine = new PermissionEngine(undefined, permissionMode as any);
  config.setPermissionMode(permissionMode as any);

  // Setup context builder
  const contextBuilder = new ContextBuilder(config.get().context);
  contextBuilder.setProjectInfo({
    path: projectPath,
    name: path.basename(projectPath),
    ...projectInfo,
    detectedAt: new Date().toISOString(),
  });

  // Setup session
  const sessionStore = new SessionStore(projectPath);
  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    projectId: projectPath,
    name: `Session ${new Date().toLocaleString()}`,
    status: 'active' as const,
    model,
    provider: providerId,
    messages: [],
    tools: BUILTIN_TOOLS.map((t) => t.name),
    permissions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
  await sessionStore.save(session);

  // Create harness
  const harnessOptions: HarnessOptions = {
    provider,
    model,
    tools: BUILTIN_TOOLS,
    permissionEngine: permEngine,
    contextBuilder,
    streaming: opts.stream ?? true,
    systemPrompt: buildSystemPrompt(config, projectInfo, providerId, model),
  };

  const harness = new AgentHarness(harnessOptions);

  // Print welcome
  console.log(chalk.cyan('\n  ╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.white('  NEXUS — Universal AI Developer Platform         ' + chalk.cyan('║')));
  console.log(chalk.cyan('  ║') + chalk.dim('  Model: ') + chalk.yellow(model) + chalk.cyan('  ║'));
  console.log(chalk.cyan('  ║') + chalk.dim('  Provider: ') + chalk.yellow(providerId) + chalk.cyan('  ║'));
  console.log(chalk.cyan('  ║') + chalk.dim('  Project: ') + chalk.yellow(projectPath) + chalk.cyan('  ║'));
  console.log(chalk.cyan('  ║') + chalk.dim('  Mode: ') + chalk.yellow(permissionMode) + chalk.cyan('  ║'));
  console.log(chalk.cyan('  ╚═══════════════════════════════════════════════════╝\n'));
  console.log(chalk.dim('  Type your request and press Enter. Type /help for commands.\n'));

  // Read from stdin (pipe or interactive)
  await runInteractive(harness, sessionStore, sessionId, projectPath);
}

async function runInteractive(harness: AgentHarness, sessionStore: SessionStore, sessionId: string, projectPath: string): Promise<void> {
  const readline = await import('readline').catch(() => null);
  if (!readline) {
    // Fallback: read from stdin manually
    await runWithStdin(harness, sessionStore, sessionId);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      await handleSlashCommand(input, harness, sessionStore, sessionId);
      rl.prompt();
      return;
    }

    // Run agent
    const stream = harness.run(input, sessionId, async (chunk) => {
      if (chunk.type === 'text') {
        process.stdout.write(chunk.content);
      } else if (chunk.type === 'usage') {
        // Show token count periodically
      }
    });

    // Wait for completion
    const state = await stream;

    // Save session messages
    for (const msg of state.messages) {
      await sessionStore.appendMessage(sessionId, msg);
    }

    console.log('\n');
    console.log(chalk.dim(`  Tokens: ${state.tokensUsed} | Iterations: ${state.iteration}`));
    rl.prompt();
  });

  rl.on('close', async () => {
    harness.cancel();
    console.log(chalk.dim('\nSession ended.'));
    process.exit(0);
  });
}

async function handleSlashCommand(
  command: string,
  harness: AgentHarness,
  sessionStore: SessionStore,
  sessionId: string
): Promise<void> {
  const parts = command.split(' ');
  const cmd = parts[0].slice(1);

  switch (cmd) {
    case 'help':
      console.log(chalk.dim('  /help      Show this help'));
      console.log(chalk.dim('  /model     Change model'));
      console.log(chalk.dim('  /provider  Change provider'));
      console.log(chalk.dim('  /tools     List available tools'));
      console.log(chalk.dim('  /permissions Show permission policies'));
      console.log(chalk.dim('  /clear     Clear conversation'));
      console.log(chalk.dim('  /exit      Exit NEXUS'));
      break;
    case 'model':
      console.log(chalk.yellow(`  Current model: ${harness.getState().sessionId ? 'use "nexus model <id>" to change' : 'not set'}`));
      break;
    case 'tools':
      console.log(chalk.cyan('\n  Available Tools:\n'));
      for (const tool of BUILTIN_TOOLS) {
        if (tool.enabled) {
          console.log(`  ${chalk.bold(tool.name)}: ${tool.description}`);
        }
      }
      console.log('');
      break;
    case 'permissions':
      console.log(chalk.yellow('  Permission mode: see config'));
      break;
    case 'clear':
      harness.reset();
      console.log(chalk.dim('  Conversation cleared.'));
      break;
    case 'exit':
      process.exit(0);
      break;
    default:
      console.log(chalk.red(`  Unknown command: ${cmd}`));
  }
}

async function runWithStdin(harness: AgentHarness, sessionStore: SessionStore, sessionId: string): Promise<void> {
  // Fallback for non-interactive mode
  const chunks: string[] = [];
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', async (data: Buffer) => {
    const input = data.toString().trim();
    if (!input) return;

    if (input.startsWith('/')) {
      // Handle slash commands (same as above)
      return;
    }

    await harness.run(input, sessionId, async (chunk) => {
      if (chunk.type === 'text') {
        process.stdout.write(chunk.content);
      }
    });
    console.log('\n');
  });

  process.stdin.on('end', () => {
    console.log(chalk.dim('\nInput ended.'));
    process.exit(0);
  });
}
