#!/usr/bin/env node
// NEXUS CLI Entry Point
// Rewritten to delegate interactive sessions to the Playground orchestrator

import { Command } from 'commander';
import chalk from 'chalk';
import { createConfig, type ConfigManager } from '../config/index.js';
import { createProvider, type Provider } from '../providers/index.js';
import { BUILTIN_TOOLS } from '../tools/definitions.js';
import { PermissionEngine } from '../permissions/engine.js';
import { ContextBuilder } from '../context/builder.js';
import { SessionStore } from '../sessions/store.js';
import { detectProjectType } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { Playground } from './playground/Playground.js';
import * as path from 'path';

const program = new Command();

program
  .name('nexus')
  .description('NEXUS — Universal AI Developer Platform')
  .version('0.1.0');

// ─── Main interactive command ────────────────────────────────
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
      const apiKey = opts.apiKey || process.env[`${id.toUpperCase()}_API_KEY`] || process.env['API_KEY'];
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

    const hasConfig = config.get().providers.length > 0;
    console.log(`${hasConfig ? chalk.green('✓') : chalk.red('✗')} Configuration: ${hasConfig ? 'OK' : 'No providers configured'}`);

    for (const p of config.getAllProviders()) {
      try {
        const provider = createProvider(p);
        const healthy = await provider.healthCheck();
        console.log(`${healthy ? chalk.green('✓') : chalk.red('✗')} Provider ${p.name}: ${healthy ? 'healthy' : 'unhealthy'}`);
      } catch {
        console.log(`${chalk.red('✗')} Provider ${p.name}: error`);
      }
    }

    const models = config.getAllModels();
    console.log(`${models.length > 0 ? chalk.green('✓') : chalk.yellow('!')} Models: ${models.length} configured`);

    const { getNexusDir } = await import('../config/paths.js');
    const nexusDir = getNexusDir();
    console.log(`${chalk.green('✓')} Nexus dir: ${nexusDir}`);

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
    process.argv.splice(2, 1);
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
// the interactive Playground with the program-level options.
if (program.args.length === 0) {
  await startInteractiveSession(program.opts());
}

// ─── Helper Functions ────────────────────────────────────────

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
  const providerId = opts.provider || config.get().defaultProvider || 'none';

  // Determine permission mode
  const permissionMode = opts.safe ? 'safe' : opts.sandbox ? 'sandbox' : 'normal';

  // Create provider (graceful fallback to no-provider mode)
  let provider: Provider;
  let providerConfig = config.getProvider(providerId);

  if (providerId === 'none' || !providerConfig) {
    provider = createNoProvider();
  } else {
    provider = createProvider(providerConfig);

    const healthy = await provider.healthCheck();
    if (!healthy) {
      console.error(chalk.yellow(`⚠ Provider "${providerId}" is not reachable — starting in offline mode.`));
      console.error(chalk.yellow(`  Add a key with: nexus provider add ${providerId} --api-key $API_KEY\n`));
      provider = createNoProvider();
    }
  }

  // Setup permission engine
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

  // Launch Playground
  const playground = new Playground({
    model,
    provider: providerId,
    mode: permissionMode as any,
    path: projectPath,
    config,
  });

  // Handle Ctrl+C for graceful shutdown
  process.on('SIGINT', () => {
    playground.cancel();
  });
  process.on('SIGTERM', () => {
    playground.cancel();
  });

  await playground.run();
}

function resolveModel(config: ConfigManager, requested?: string): string {
  if (requested) {
    const model = config.getModel(requested);
    return model?.id || requested;
  }
  return config.get().defaultModel || 'openrouter/claude-sonnet-4-20250514';
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
      streaming: true, toolCalling: true, structuredOutput: false,
      imageSupport: false, audioSupport: false, embeddings: false,
      maxContextWindow: 128000,
    },
    anthropic: {
      streaming: true, toolCalling: true, structuredOutput: true,
      imageSupport: true, audioSupport: false, embeddings: false,
      maxContextWindow: 200000,
    },
    openai: {
      streaming: true, toolCalling: true, structuredOutput: false,
      imageSupport: false, audioSupport: false, embeddings: false,
      maxContextWindow: 128000,
    },
    ollama: {
      streaming: true, toolCalling: true, structuredOutput: false,
      imageSupport: false, audioSupport: false, embeddings: false,
      maxContextWindow: 128000,
    },
    lmstudio: {
      streaming: true, toolCalling: true, structuredOutput: false,
      imageSupport: false, audioSupport: false, embeddings: false,
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

function createNoProvider(): Provider {
  return {
    chat: async (_messages: any, _options: any) => ({
      message: 'No AI provider configured. Add one with: nexus provider add openrouter --api-key $OPENROUTER_API_KEY',
      usage: { input: 0, output: 0, total: 0 },
      toolCalls: [],
    }),
    streamChat: async (_messages: any, _options: any, _onChunk: any) => ({
      message: 'No AI provider configured. Add one with: nexus provider add openrouter --api-key $OPENROUTER_API_KEY',
      usage: { input: 0, output: 0, total: 0 },
      toolCalls: [],
    }),
    healthCheck: async () => false,
    listModels: async () => [],
  } as any;
}
