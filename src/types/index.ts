// ═══════════════════════════════════════════════════════════════
// NEXUS — Core Type System
// Universal AI Developer Platform
// ═══════════════════════════════════════════════════════════════

// ─── Provider Types ───────────────────────────────────────────

export type ProviderType =
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'ollama'
  | 'lmstudio'
  | 'custom'
  | 'omniroute';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  envKey?: string;
  capabilities: ProviderCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  imageSupport: boolean;
  audioSupport: boolean;
  embeddings: boolean;
  maxContextWindow: number;
}

// ─── Model Types ──────────────────────────────────────────────

export type ModelSource = 'cloud' | 'local' | 'gateway';

export interface Model {
  id: string;
  name: string;
  provider: string;
  source: ModelSource;
  contextWindow: number;
  maxOutputTokens?: number;
  inputPricePerM?: number;
  outputPricePerM?: number;
  capabilities: ModelCapabilities;
  aliases: string[];
  createdAt: string;
}

export interface ModelCapabilities {
  chat: boolean;
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  vision: boolean;
  reasoning: boolean;
}

// ─── Message Types ────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: string;
}

export interface TextMessage extends BaseMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolResultMessage extends BaseMessage {
  role: 'tool';
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export type Message = TextMessage | ToolResultMessage;

// ─── Tool Types ───────────────────────────────────────────────

export type ToolKind = 'core' | 'mcp' | 'plugin' | 'skill';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  kind: ToolKind;
  parameters?: ToolParameter[];
  schema?: Record<string, unknown>;
  permission?: PermissionCategory;
  source?: string;
  enabled: boolean;
}

export interface ToolCall {
  id: string;
  toolId: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: string;
}

export interface ToolResult {
  callId: string;
  content: string;
  isError: boolean;
  durationMs?: number;
}

// ─── Permission Types ─────────────────────────────────────────

export type PermissionCategory =
  | 'filesystem.read'
  | 'filesystem.write'
  | 'filesystem.delete'
  | 'terminal.execute'
  | 'terminal.process'
  | 'network.request'
  | 'git.read'
  | 'git.write'
  | 'git.commit'
  | 'git.push'
  | 'mcp.execute'
  | 'plugin.execute'
  | 'sandbox';

export type PermissionDecision =
  | 'allow-once'
  | 'allow-session'
  | 'allow-project'
  | 'allow-always'
  | 'deny-once'
  | 'deny-session'
  | 'deny-always';

export type PermissionMode = 'safe' | 'normal' | 'sandbox' | 'relaxed';

export interface PermissionRequest {
  id: string;
  toolId: string;
  toolName: string;
  action: string;
  target: string;
  description: string;
  decision?: PermissionDecision;
  decidedBy?: 'user' | 'policy' | 'project' | 'global';
  timestamp: string;
}

export interface PermissionPolicy {
  category: PermissionCategory;
  decision: PermissionDecision;
  scope: 'global' | 'project';
  path?: string;
  reason?: string;
}

// ─── Session Types ────────────────────────────────────────────

export type SessionStatus = 'active' | 'paused' | 'completed' | 'error';

export interface Session {
  id: string;
  projectId: string;
  name: string;
  status: SessionStatus;
  model: string;
  provider: string;
  messages: Message[];
  tools: string[];
  permissions: PermissionPolicy[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

// ─── Agent Types ──────────────────────────────────────────────

export type AgentRole =
  | 'coder'
  | 'debugger'
  | 'researcher'
  | 'architect'
  | 'reviewer'
  | 'tester'
  | 'documentation'
  | 'devops'
  | 'general';

export interface AgentConfig {
  name: string;
  role: AgentRole;
  model: string;
  provider?: string;
  tools: string[];
  permissions: Record<string, PermissionPolicy>;
  behavior: AgentBehavior;
  systemPrompt?: string;
}

export interface AgentBehavior {
  inspectBeforeEdit: boolean;
  runTestsAfterChanges: boolean;
  maxIterations: number;
  maxTokens: number;
  maxCost: number;
  timeoutMs: number;
}

// ─── Harness Types ────────────────────────────────────────────

export type HarnessEvent =
  | 'session.started'
  | 'session.completed'
  | 'session.error'
  | 'model.request.started'
  | 'model.request.completed'
  | 'model.request.failed'
  | 'tool.requested'
  | 'tool.permission_required'
  | 'tool.approved'
  | 'tool.denied'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.failed'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'stream.chunk'
  | 'usage.updated';

export interface HarnessEventPayload {
  type: HarnessEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface AgentState {
  sessionId: string;
  messages: Message[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  iteration: number;
  tokensUsed: number;
  costEstimate: number;
  status: 'idle' | 'running' | 'awaiting_permission' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

// ─── Usage Types ──────────────────────────────────────────────

export interface TokenUsage {
  input: number;
  output: number;
  cached?: number;
  total: number;
}

export interface RequestUsage {
  provider: string;
  model: string;
  tokens: TokenUsage;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  timestamp: string;
}

// ─── Project Types ────────────────────────────────────────────

export interface ProjectInfo {
  path: string;
  name: string;
  language?: string;
  framework?: string;
  hasGit: boolean;
  hasPackageJson?: boolean;
  hasPyproject?: boolean;
  hasCargoToml?: boolean;
  hasGoMod?: boolean;
  hasDockerfile?: boolean;
  detectedAt: string;
}

// ─── Workflow Types ───────────────────────────────────────────

export type WorkflowStepKind = 'agent' | 'tool' | 'shell' | 'conditional' | 'wait';

export interface WorkflowStep {
  id: string;
  name: string;
  kind: WorkflowStepKind;
  agent?: string;
  tool?: string;
  command?: string;
  condition?: string;
  timeoutMs?: number;
  maxIterations?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

// ─── Config Types ─────────────────────────────────────────────

export interface NexusConfig {
  version: string;
  defaultProvider?: string;
  defaultModel?: string;
  permissionMode: PermissionMode;
  streaming: boolean;
  context: ContextConfig;
  agents: Record<string, AgentConfig>;
  providers: ProviderConfig[];
  models: Model[];
  permissions: PermissionPolicy[];
  tools: ToolDefinition[];
  workflows: Workflow[];
  telemetry: boolean;
}

export interface ContextConfig {
  maxTokens: number;
  includeGitStatus: boolean;
  includeProjectFiles: boolean;
  includeToolResults: boolean;
  includeSessionHistory: boolean;
  includeSkillInstructions: boolean;
  includeMcpResources: boolean;
  strategy: 'truncate' | 'summarize' | 'compact';
}

// ─── Error Types ──────────────────────────────────────────────

export class NexusError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NexusError';
  }
}

export class ProviderError extends NexusError {
  constructor(
    provider: string,
    message: string,
    public cause?: Error,
    public retryable?: boolean
  ) {
    super('PROVIDER_ERROR', message);
    this.provider = provider;
  }
  provider: string;
}

export class PermissionDeniedError extends NexusError {
  constructor(request: PermissionRequest) {
    super('PERMISSION_DENIED', `Permission denied: ${request.action} on ${request.target}`);
    this.request = request;
  }
  request: PermissionRequest;
}

export class TimeoutError extends NexusError {
  constructor(entity: string, ms: number) {
    super('TIMEOUT', `${entity} timed out after ${ms}ms`);
    this.ms = ms;
  }
  ms: number;
}

// ─── Streaming Types ──────────────────────────────────────────

export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'cost'; cost: number }
  | { type: 'event'; event: HarnessEventPayload };

export type StreamCallback = (chunk: StreamChunk) => void | Promise<void>;
