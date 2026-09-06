// NEXUS — Welcome Screen
// Displays the startup welcome banner and usage hints
import type { Renderer } from './renderer.js';
import type { ConfigManager } from '../../config/index.js';
import type { SessionStore } from '../../sessions/store.js';
import { skillManager } from '../../skills/SkillManager.js';
import { BUILTIN_TOOLS } from '../../tools/definitions.js';
import { getNexusDir, getSkillsDir } from '../../config/paths.js';

const ESC = '\x1b';
const CSI = `${ESC}[`;

const NEXUS_LOGO = [
  `${ESC}[36m  ╔══════════════════════════════════════════════════════════════╗${ESC}[0m`,
  `${ESC}[36m  ║${ESC}[1;36m  ┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m ${ESC}[1;36m┬─┐${ESC}[36m ${ESC}[1;36m┌─┐${ESC}[36m              ${ESC}[0m`,
  `${ESC}[36m  ║${ESC}[1;36m  │${ESC}[36m │${ESC}[1;36m ${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m ${ESC}[1;36m│${ESC}[36m               ${ESC}[0m`,
  `${ESC}[36m  ║${ESC}[1;36m  └─┘${ESC}[36m ${ESC}[1;36m└─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m└─┘${ESC}[36m ${ESC}[1;36m└─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m ${ESC}[1;36m┴─┘${ESC}[36m              ${ESC}[0m`,
];

const LAYERED_BOX_TOP = [
  `${ESC}[36m  ╔══════════════════════════════════════════════════════════════════════════════╗${ESC}[0m`,
  `${ESC}[36m  ║${ESC}[0m${ESC}[36m  ╔════════════════════════════════════════════════════════════════════════╗${ESC}[0m ${ESC}[36m║${ESC}[0m`,
  `${ESC}[36m  ║${ESC}[0m${ESC}[36m  ║${ESC}[0m${ESC}[36m  ╔═══════════════════════════════════════════════════════════════════╗${ESC}[0m ${ESC}[36m║${ESC}[0m ${ESC}[36m║${ESC}[0m`,
];

function colorize(text: string, color: string): string {
  return `${ESC}[${color}m${text}${ESC}[0m`;
}

function dim(text: string): string {
  return colorize(text, '90');
}

function bright(text: string): string {
  return colorize(text, '37');
}

function cyan(text: string): string {
  return colorize(text, '36');
}

function yellow(text: string): string {
  return colorize(text, '33');
}

function green(text: string): string {
  return colorize(text, '32');
}

function red(text: string): string {
  return colorize(text, '31');
}

function magenta(text: string): string {
  return colorize(text, '35');
}

function blue(text: string): string {
  return colorize(text, '34');
}

function boxLine(content: string, width: number = 66): string {
  return `${ESC}[36m  ║${ESC}[0m ${content}${' '.repeat(Math.max(0, width - content.length))} ${ESC}[36m║${ESC}[0m`;
}

function sectionHeader(title: string, icon: string): string {
  return boxLine(`${icon}  ${ESC}[1m${title}${ESC}[0m`);
}

function infoLine(label: string, value: string, labelColor: string = '37', valueColor: string = '36'): string {
  return `  ${colorize(label, labelColor)}  ${colorize(value, valueColor)}`;
}

export async function showWelcome(
  renderer: Renderer,
  config: ConfigManager,
  sessionStore: SessionStore,
  projectPath: string
): Promise<void> {
  const state = renderer.getState();
  const cfg = config.get();

  // Load skills
  await skillManager.loadFromDir(await getSkillsDir());
  const projectSkillsDir = getSkillsDir(projectPath);
  if (projectSkillsDir) {
    await skillManager.loadFromDir(`${projectSkillsDir}/skills`);
  }
  const skills = skillManager.list();

  // Get provider info
  const providerId = cfg.defaultProvider || 'none';
  const providerConfig = cfg.providers.find(p => p.id === providerId);
  const providerName = providerConfig?.name || 'None';

  // Get model info
  const modelId = cfg.defaultModel || 'auto';

  // Get session count
  const sessions = await sessionStore.list(projectPath);
  const sessionCount = sessions.length;

  // Get tool count
  const toolCount = BUILTIN_TOOLS.length;

  // Build the Hermes-style dashboard
  const lines: string[] = [
    '',
    ...NEXUS_LOGO,
    '',
    // Layered 3D box effect - outer frame
    `${ESC}[36m  ╔══════════════════════════════════════════════════════════════════════════════╗${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[0m${ESC}[36m  ╔═════════════════════════════════════════════════════════════════════════╗${ESC}[0m ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[0m${ESC}[36m  ║${ESC}[0m  ${ESC}[1;36mNEXUS v0.1.0 — Universal AI Developer Platform${ESC}[0m${' '.repeat(25)}  ${ESC}[36m║${ESC}[0m ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ║${ESC}[0m${ESC}[36m  ╚═════════════════════════════════════════════════════════════════════════╝${ESC}[0m ${ESC}[36m║${ESC}[0m`,
    `${ESC}[36m  ╚══════════════════════════════════════════════════════════════════════════════╝${ESC}[0m`,
    '',
    // Provider & Model section (Hermes-style)
    sectionHeader('CONFIGURATION', '⚙'),
    boxLine(infoLine('Provider:', providerName, '37', providerId === 'none' ? '33' : '32')),
    boxLine(infoLine('Model:', modelId, '37', '36')),
    boxLine(infoLine('Mode:', cfg.permissionMode, '37', '35')),
    boxLine(infoLine('Streaming:', cfg.streaming ? 'enabled' : 'disabled', '37', cfg.streaming ? '32' : '33')),
    boxLine(''),

    // Project section
    sectionHeader('PROJECT', '📁'),
    boxLine(infoLine('Path:', projectPath.split('/').pop() || projectPath, '37', '36')),
    boxLine(infoLine('Full:', projectPath, '90', '90')),
    boxLine(''),

    // Session section
    sectionHeader('SESSION', '💾'),
    boxLine(infoLine('ID:', state.sessionId.slice(0, 8) + '...', '37', '36')),
    boxLine(infoLine('Total Sessions:', sessionCount.toString(), '37', '36')),
    boxLine(infoLine('Storage:', projectPath.includes('.forge') ? '.forge/sessions/' : '~/.nexus/sessions/', '90', '90')),
    boxLine(''),

    // Tools section
    sectionHeader('TOOLS', '🔧'),
    (() => {
      const toolCounts = {
        'Filesystem': BUILTIN_TOOLS.filter(t => t.permission?.startsWith('filesystem')).length,
        'Terminal': BUILTIN_TOOLS.filter(t => t.permission?.startsWith('terminal')).length,
        'Git': BUILTIN_TOOLS.filter(t => t.permission?.startsWith('git')).length,
      };
      let result = '';
      for (const [cat, count] of Object.entries(toolCounts)) {
        result += boxLine(infoLine(`${cat}:`, `${count} tools`, '37', '36')) + '\n';
      }
      result += boxLine(infoLine('Total:', `${toolCount} tools`, '37', '1;36')) + '\n';
      result += boxLine('') + '\n';
      return result;
    })(),

    // Skills section
    sectionHeader('SKILLS', '⚡'),
    (() => {
      let result = boxLine(infoLine('Loaded:', `${skills.length} skills`, '37', skills.length > 0 ? '32' : '33')) + '\n';
      if (skills.length > 0) {
        const skillGroups: Record<string, string[]> = {};
        for (const skill of skills) {
          const tag = skill.tags[0] || 'general';
          if (!skillGroups[tag]) skillGroups[tag] = [];
          skillGroups[tag].push(skill.name);
        }
        for (const [group, names] of Object.entries(skillGroups)) {
          result += boxLine(`  ${dim(group + ':')} ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' …' : ''}`) + '\n';
        }
      } else {
        result += boxLine('  ' + dim('No skills loaded. Add to ~/.nexus/skills/ or .forge/skills/')) + '\n';
      }
      result += boxLine('') + '\n';
      return result;
    })(),

    // Capabilities section
    sectionHeader('CAPABILITIES', '🧠'),
    (() => {
      const caps = providerConfig?.capabilities || {
        streaming: false,
        toolCalling: false,
        structuredOutput: false,
        imageSupport: false,
        audioSupport: false,
        embeddings: false,
        maxContextWindow: 0,
      };
      const capList = Object.entries(caps)
        .filter(([, v]) => v === true || (typeof v === 'number' && v > 0))
        .map(([k, v]) => `${k}${typeof v === 'number' ? ` (${v.toLocaleString()})` : ''}`);
      return boxLine(infoLine('Available:', capList.join(' · ') || 'none (offline mode)', '37', caps.streaming || caps.toolCalling ? '32' : '33')) + '\n' + boxLine('') + '\n';
    })(),

    // Tips section
    sectionHeader('QUICK START', '🚀'),
    boxLine('  Type a message to start chatting with AI.'),
    boxLine('  Use ' + cyan('/help') + ' for slash commands.'),
    boxLine('  Use ' + cyan('/model') + ' to switch models.'),
    boxLine('  Use ' + cyan('/provider') + ' to change provider.'),
    boxLine('  Use ' + cyan('/skills') + ' to browse skills.'),
    boxLine('  Use ' + cyan('/quit') + ' or Ctrl+C to exit.'),
    '',
    // Provider warning if needed
  ];

  if (providerId === 'none') {
    lines.push('');
    lines.push(`${ESC}[33m  ╔══════════════════════════════════════════════════════════════════════════════╗${ESC}[0m`);
    lines.push(`${ESC}[33m  ║${ESC}[0m  ${yellow('⚠')}  No AI provider configured.                                           ${ESC}[33m║${ESC}[0m`);
    lines.push(`${ESC}[33m  ║${ESC}[0m     Add one with: ${cyan('nexus provider add openrouter --key $OPENROUTER_API_KEY')}  ${ESC}[33m║${ESC}[0m`);
    lines.push(`${ESC}[33m  ║${ESC}[0m     Or: ${cyan('nexus provider add anthropic --key $ANTHROPIC_API_KEY')}           ${ESC}[33m║${ESC}[0m`);
    lines.push(`${ESC}[33m  ╚══════════════════════════════════════════════════════════════════════════════╝${ESC}[0m`);
    lines.push('');
  }

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