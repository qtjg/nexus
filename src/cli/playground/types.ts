// NEXUS — Playground Types
// Additional types for the interactive playground system
import type {
  PermissionMode,
  PermissionCategory,
  PermissionPolicy,
  Session,
  Message,
  ToolDefinition,
  Model,
  ProviderConfig,
  HarnessEventPayload,
  StreamChunk,
} from '../../types/index.js';
import type { ConfigManager } from '../../config/index.js';
import type { SessionStore } from '../../sessions/store.js';
import type { AgentHarness } from '../../harness/index.js';
import type { PermissionEngine } from '../../permissions/engine.js';
import type { ContextBuilder } from '../../context/builder.js';
import type { Provider } from '../../providers/base.js';
import type { ProjectInfo } from '../../types/index.js';

// ─── Slash Command Types ──────────────────────────────────────

export interface SlashCommand {
  name: string;
  aliases: string[];
  description: string;
  usage?: string;
  category: 'session' | 'model' | 'config' | 'tools' | 'info' | 'admin' | 'skill';
  execute: (context: PlaygroundContext, args: string[]) => Promise<void>;
  autocomplete?: (context: PlaygroundContext, input: string) => string[] | Promise<string[]>;
  helpText?: string;
}

export interface SlashCommandMeta {
  name: string;
  aliases: string[];
  description: string;
  usage?: string;
  category: string;
  helpText?: string;
}

// ─── Playground Context ───────────────────────────────────────

export interface PlaygroundContext {
  projectPath: string;
  config: ConfigManager;
  sessionStore: SessionStore;
  currentSessionId: string;
  currentSession: Session | null;
  harness: AgentHarness;
  permissionEngine: PermissionEngine;
  contextBuilder: ContextBuilder;
  provider: Provider;
  model: string;
  providerId: string;
  permissionMode: PermissionMode;
  streaming: boolean;
  startTime: number;
  messages: Message[];
  addMessage: (msg: Message) => void;
  switchModel: (modelId: string) => void;
  switchProvider: (providerId: string) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  newSession: (name?: string) => Promise<string>;
  resumeSession: (sessionId: string) => Promise<void>;
  listSessions: () => Promise<Session[]>;
  getProjectInfo: () => Promise<ProjectInfo>;
}

// ─── Input Controller Types ───────────────────────────────────

export interface AutocompleteSuggestion {
  label: string;
  description?: string;
}

export interface InputState {
  currentLine: string;
  buffer: string;
  history: string[];
  historyIndex: number;
  isMultiline: boolean;
  multilineBuffer: string;
}

// ─── Renderer Types ───────────────────────────────────────────

export interface ToolRenderInfo {
  name: string;
  args?: Record<string, unknown>;
  durationMs?: number;
  isError: boolean;
  result?: string;
}

export interface RenderState {
  model: string;
  provider: string;
  project: string;
  mode: PermissionMode;
  sessionId: string;
  tokensUsed: number;
  costEstimate: number;
  iterations: number;
  status: 'idle' | 'running' | 'awaiting_permission' | 'completed' | 'error' | 'cancelled';
  statusMessage: string;
  toolActivity: ToolRenderInfo[];
  responseBuffer: string;
}

// ─── Skill Types ──────────────────────────────────────────────

export type SkillType = 'tool' | 'command' | 'instruction' | 'workflow';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  version: string;
  author?: string;
  tags: string[];
  instructions?: string;
  tools?: ToolDefinition[];
  commands?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCommand {
  name: string;
  description: string;
  skillId: string;
  handler: (ctx: PlaygroundContext, args: string[]) => Promise<void>;
}

export interface SkillRegistry {
  list: () => SkillDefinition[];
  get: (id: string) => SkillDefinition | null;
  search: (query: string) => SkillDefinition[];
  getCommands: (skillId: string) => SkillCommand[];
  getAllCommands: () => Array<{ skillId: string; cmd: SkillCommand }>;
  loadFromDir: (dir: string) => Promise<void>;
}

// ─── Custom Command Types ─────────────────────────────────────

export type CustomCommandType = 'shell' | 'prompt' | 'slash';

export interface CustomCommand {
  name: string;
  type: CustomCommandType;
  command?: string;
  prompt?: string;
  description?: string;
}

export interface CustomCommandConfig {
  commands: Record<string, CustomCommand>;
}

// ─── Configuration ────────────────────────────────────────────

export interface PlaygroundConfig {
  defaultProvider?: string;
  defaultModel?: string;
  permissionMode?: PermissionMode;
  streaming?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  maxTokens?: number;
  maxIterations?: number;
  modelAliases?: Record<string, string>;
  customCommands?: Record<string, CustomCommand>;
}
