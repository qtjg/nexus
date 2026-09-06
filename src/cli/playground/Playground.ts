// NEXUS — Playground
// Main orchestrator for the interactive terminal AI playground
import { randomUUID } from 'node:crypto';
import type {
  Message,
  PermissionMode,
  StreamChunk,
  Session,
  ToolDefinition,
} from '../../types/index.js';
import { AgentHarness } from '../../harness/index.js';
import { SessionStore } from '../../sessions/store.js';
import { PermissionEngine } from '../../permissions/engine.js';
import { ContextBuilder } from '../../context/builder.js';
import { createConfig, type ConfigManager } from '../../config/index.js';
import { createProvider, type Provider as ProviderInterface } from '../../providers/index.js';
import { detectProjectType } from '../../utils/fs.js';
import { Logger } from '../../utils/logger.js';
import { SlashCommandRegistry } from './registry.js';
import { registerAllCommands } from './commands.js';
import { parseSlashCommand } from './parser.js';
import { InputController } from './input.js';
import { Renderer } from './renderer.js';
import { showWelcome, showNoProviderWarning, showResumeHint } from './welcome.js';
import { skillManager } from '../../skills/SkillManager.js';
import type { PlaygroundContext } from './types.js';

const ESC = '\x1b';
const logger = new Logger('playground');

export class Playground {
  private registry = new SlashCommandRegistry();
  private renderer = new Renderer();
  private input: InputController | null = null;
  private harness: AgentHarness | null = null;
  private config: ConfigManager;
  private sessionStore = new SessionStore();
  private permissionEngine = new PermissionEngine();
  private contextBuilder!: ContextBuilder;
  private provider: ProviderInterface;
  private model: string;
  private providerId: string;
  private permissionMode: PermissionMode;
  private streaming = true;
  private messages: Message[] = [];
  private sessionId = '';
  private session: Session | null = null;
  private projectPath = process.cwd();
  private startTime = Date.now();
  private running = false;
  private cancelled = false;
  private history: string[] = [];

  constructor(opts?: {
    session?: string;
    model?: string;
    provider?: string;
    mode?: PermissionMode;
    path?: string;
    config?: ConfigManager;
  }) {
    this.config = opts?.config ?? createConfig();
    this.contextBuilder = new ContextBuilder(this.config.get().context);
    this.projectPath = opts?.path ?? process.cwd();
    this.model = opts?.model ?? this.config.get().defaultModel ?? '';
    this.providerId = opts?.provider ?? this.config.get().defaultProvider ?? 'none';
    this.permissionMode = opts?.mode ?? 'normal';
    this.permissionEngine.setMode(this.permissionMode);

    // Create provider
    if (this.providerId === 'none') {
      this.provider = this.createNoProvider();
    } else {
      const pc = this.config.getProvider(this.providerId);
      this.provider = pc ? createProvider(pc) : this.createNoProvider();
    }

    // Register all built-in slash commands
    registerAllCommands(this.registry);

    // Load skills
    this.loadSkills();

    // If a session ID was provided, resume it
    if (opts?.session) {
      this.resumeSession(opts.session).catch((e: any) => {
        logger.warn(`Failed to resume session: ${e.message}`);
      });
    }
  }

  private createNoProvider(): ProviderInterface {
    const emptyConfig = {
      id: 'none',
      name: 'None',
      type: 'custom' as const,
      baseUrl: '',
      capabilities: {
        streaming: false,
        toolCalling: false,
        structuredOutput: false,
        imageSupport: false,
        audioSupport: false,
        embeddings: false,
        maxContextWindow: 0,
      },
      createdAt: '',
      updatedAt: '',
    };
    return {
      config: emptyConfig,
      capabilities: emptyConfig.capabilities,
      chat: async () => ({
        message: 'No AI provider configured. Add one with: nexus provider add openrouter --api-key $OPENROUTER_API_KEY',
        usage: { input: 0, output: 0, total: 0 },
        toolCalls: [],
      }),
      streamChat: async () => ({
        message: 'No AI provider configured. Add one with: nexus provider add openrouter --api-key $OPENROUTER_API_KEY',
        usage: { input: 0, output: 0, total: 0 },
        toolCalls: [],
      }),
      healthCheck: async () => false,
      listModels: async () => [],
    };
  }

  private async loadSkills(): Promise<void> {
    try {
      const { getSkillsDir } = await import('../../config/paths.js');
      await skillManager.loadFromDir(getSkillsDir());
      const { getProjectDir } = await import('../../config/paths.js');
      const projectSkills = getProjectDir(this.projectPath);
      if (projectSkills) {
        await skillManager.loadFromDir(`${projectSkills}/skills`);
      }
    } catch (e: any) {
      logger.debug(`Skill loading failed: ${e.message}`);
    }
  }

  async run(): Promise<void> {
    // Create or resume session
    if (!this.session) {
      this.sessionId = randomUUID();
      this.session = this.createSession();
      this.sessionStore.save(this.session);
    }
    this.startTime = Date.now();

    // Set up harness
    this.harness = new AgentHarness({
      provider: this.provider,
      model: this.model,
      tools: [] as ToolDefinition[],
      permissionEngine: this.permissionEngine,
      contextBuilder: this.contextBuilder,
      streaming: this.streaming,
      systemPrompt: this.buildSystemPrompt(),
    });

    // Build context
    const projectInfo = await detectProjectType(this.projectPath);
    this.contextBuilder.setProjectInfo({
      path: this.projectPath,
      name: this.projectPath.split('/').pop() ?? '',
      ...projectInfo,
      detectedAt: new Date().toISOString(),
    });

    // Show welcome
    showWelcome(this.renderer);

    if (this.providerId === 'none') {
      showNoProviderWarning();
    }

    // Set up input
    this.setupInput();

    this.running = true;
    logger.info(`Playground started — session ${this.sessionId.slice(0, 8)}`);
  }

  private createSession(): Session {
    return {
      id: this.sessionId,
      projectId: this.projectPath,
      name: `Session ${new Date().toLocaleString()}`,
      status: 'active',
      model: this.model,
      provider: this.providerId,
      messages: [],
      tools: [],
      permissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };
  }

  private buildSystemPrompt(): string {
    return `You are NEXUS, a universal AI developer assistant.

You have access to the following tools:
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

Current model: ${this.model}
Current provider: ${this.providerId}`;
  }

  private setupInput(): void {
    const self = this;

    const input = new InputController({
      onComplete: async (line: string) => {
        if (!self.running) return;
        await self.processInput(line);
        if (self.running) self.input?.prompt();
      },
      onExit: () => {
        self.shutdown();
      },
      initialHistory: this.history,
    });

    this.input = input;
    input.prompt();
  }

  private async processInput(input: string): Promise<void> {
    // Check for slash command
    const parsed = parseSlashCommand(input);
    if (parsed) {
      await this.handleSlashCommand(parsed.name, parsed.args);
      return;
    }

    // Add user message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    this.messages.push(userMsg);
    this.session?.messages?.push(userMsg);

    // Save to session
    if (this.session) {
      await this.sessionStore.appendMessage(this.session.id, userMsg);
    }

    // Show user message
    this.renderer.addScrollback(`${ESC}[36mYou:${ESC}[0m ${input}`);
    this.renderer.render();

    // Run the harness
    await this.runHarness(input);
  }

  private async runHarness(prompt: string): Promise<void> {
    if (!this.harness) return;

    this.renderer.setRunning(true);
    this.renderer.setState({ status: 'running', statusMessage: 'Processing...' });

    const self = this;
    let streamedContent = '';

    try {
      const result = await this.harness.run(prompt, this.sessionId, async (chunk: StreamChunk) => {
        if (chunk.type === 'text') {
          streamedContent += chunk.content ?? '';
          self.renderer.streamChunk(chunk.content ?? '');
        }
      }, this.messages);

      // Add assistant response to our messages
      const lastMsg = this.messages[this.messages.length - 1];
      const assistantMsg: Message = {
        id: `msg_assist_${Date.now()}`,
        role: 'assistant',
        content: result.messages[result.messages.length - 1]?.content ?? lastMsg?.content ?? '',
        timestamp: new Date().toISOString(),
      };
      this.messages.push(assistantMsg);
      this.session?.messages?.push(assistantMsg);

      if (this.session) {
        await this.sessionStore.appendMessage(this.session.id, assistantMsg);
      }

      this.renderer.finalizeResponse();
      this.renderer.setRunning(false);
      this.renderer.setState({
        status: 'completed',
        statusMessage: `Tokens: ${result.tokensUsed}`,
        tokensUsed: result.tokensUsed,
        iterations: result.iteration ?? 0,
      });
    } catch (err: any) {
      this.renderer.setError(err.message ?? 'Unknown error');
      this.renderer.setRunning(false);
      logger.error(`Harness error: ${err.message}`);
    }

    this.renderer.render();
  }

  private async handleSlashCommand(name: string, args: string[]): Promise<void> {
    const cmd = this.registry.get(name);
    if (!cmd) {
      const matches = this.registry.matchPrefix(name);
      if (matches.length > 0) {
        console.log(`${ESC}[33m  Did you mean: /${matches[0]}${ESC}[0m`);
      } else {
        console.log(`${ESC}[31m  Unknown command: /${name}${ESC}[0m`);
        console.log(`${ESC}[90m  Type /help for available commands.${ESC}[0m`);
      }
      return;
    }

    try {
      await cmd.execute(this.getContext(), args);
    } catch (err: any) {
      console.log(`${ESC}[31m  Error executing /${name}: ${err.message}${ESC}[0m`);
    }
  }

  private async resumeSession(sessionId: string): Promise<void> {
    const loaded = await this.sessionStore.load(sessionId);
    if (!loaded) throw new Error(`Session ${sessionId} not found`);
    this.session = loaded;
    this.sessionId = loaded.id;
    this.messages = loaded.messages ?? [];
    this.model = loaded.model ?? this.model;
    this.providerId = loaded.provider ?? this.providerId;
    const pc = this.config.getProvider(this.providerId);
    this.provider = pc ? createProvider(pc) : this.createNoProvider();
    showResumeHint(sessionId);
  }

  private getContext(): PlaygroundContext {
    const self = this;
    return {
      get projectPath() { return self.projectPath; },
      get config() { return self.config; },
      get sessionStore() { return self.sessionStore; },
      get currentSessionId() { return self.sessionId; },
      get currentSession() { return self.session; },
      get harness() { return self.harness!; },
      get permissionEngine() { return self.permissionEngine; },
      get contextBuilder() { return self.contextBuilder; },
      get provider() { return self.provider; },
      get model() { return self.model; },
      get providerId() { return self.providerId; },
      get permissionMode() { return self.permissionMode; },
      get streaming() { return this.streaming; },
      get startTime() { return self.startTime; },
      get messages() { return self.messages; },
      addMessage: (msg: Message) => { self.messages.push(msg); },
      switchModel: (modelId: string) => {
        self.model = modelId;
        if (self.harness) {
          (self.harness as any).options.model = modelId;
        }
      },
      switchProvider: (providerId: string) => {
        self.providerId = providerId;
        if (providerId === 'none') {
          self.provider = self.createNoProvider();
        } else {
          const pc = self.config.getProvider(providerId);
          self.provider = pc ? createProvider(pc) : self.createNoProvider();
        }
      },
      setPermissionMode: (mode: PermissionMode) => {
        self.permissionMode = mode;
        self.permissionEngine.setMode(mode);
      },
      newSession: async (name?: string) => {
        const newId = randomUUID();
        const newSession: Session = {
          id: newId,
          projectId: self.projectPath,
          name: name ?? `Session ${new Date().toLocaleString()}`,
          status: 'active',
          model: self.model,
          provider: self.providerId,
          messages: [],
          tools: [],
          permissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
        };
        await self.sessionStore.save(newSession);
        self.sessionId = newId;
        self.session = newSession;
        self.messages = [];
        return newId;
      },
      resumeSession: async (sid: string) => {
        await self.resumeSession(sid);
      },
      listSessions: async () => {
        return self.sessionStore.list();
      },
      getProjectInfo: async () => {
        const pt = await detectProjectType(self.projectPath);
        return {
          path: self.projectPath,
          name: self.projectPath.split('/').pop() ?? '',
          detectedAt: new Date().toISOString(),
          ...pt,
        };
      },
    };
  }

  async shutdown(): Promise<void> {
    this.running = false;
    if (this.harness) {
      try {
        this.harness.cancel();
      } catch { /* ignore */ }
    }
    if (this.session) {
      this.session.updatedAt = new Date().toISOString();
      await this.sessionStore.save(this.session);
    }
    this.renderer.close();
    this.input?.close();
    process.stdout.write(`${ESC}[?25h`); // Show cursor
    process.exit(0);
  }

  cancel(): void {
    this.cancelled = true;
    this.harness?.cancel();
  }
}
