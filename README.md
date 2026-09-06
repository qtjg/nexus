# NEXUS

<div align="center">

```
        ███████╗███████╗██████╗ ███╗   ███╗███████╗███████╗
        ██╔════╝██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝
        ███████╗█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗
        ╚════██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║
        ███████║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║
        ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝
```

`git clone https://github.com/qtjg/nexus.git && cd nexus && npm install && npm run build && npm link`

| [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) | [![Tests](https://img.shields.io/badge/tests-71%2F71-passing-green)](tests) | [![TypeScript](https://img.shields.io/badge/typescript-5.7+-blue.svg)](tsconfig.json) | [![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org) | [![Status](https://img.shields.io/badge/status-v0.1.0--alpha-orange)](#) |
|---|---|---|---|---|

</div>

---

<div align="center">

### ⬡ The Universal AI Development Layer

**Build with every model. Route through every capability. Operate from one terminal.**

</div>

---

## What is NEXUS?

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║   CURRENT STATE                                                                  ║
║   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐  ║
║   │  Provider   │ │   Agent     │ │    Tool     │ │  Permission │ │ Session │  ║
║   │    SDK      │ │    Loop     │ │  Executor   │ │   Engine    │ │  Store  │  ║
║   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └────┬────┘  ║
║          └───────────────┴───────────────┴───────────────┴────────────┘        ║
║                                │                                                ║
║                                ▼                                                ║
║                   ╔═══════════════════════════════════╗                        ║
║                   ║       ✦  NEXUS  ✦                ║                        ║
║                   ║     UNIFIED AI RUNTIME           ║                        ║
║                   ╚═══════════════════════════════════╝                        ║
║                                │                                                ║
║         ┌──────────────────────┼──────────────────────┐                        ║
║         │                      │                      │                        ║
║         ▼                      ▼                      ▼                        ║
║   ┌───────────┐        ┌────────────┐        ┌────────────┐                   ║
║   │   CLI     │        │  Playground│        │   Scripts  │                   ║
║   │ Interface │        │   (TUI)    │        │ (headless) │                   ║
║   └───────────┘        └────────────┘        └────────────┘                   ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

</div>

**NEXUS is not a chatbot. It is an AI development environment.**

The model is replaceable. The environment, harness, tools, permissions, and developer experience are the product.

| Without NEXUS | With NEXUS |
|---|---|
| Provider-specific SDKs per project | Single `Provider` interface — swap models without changing code |
| Hand-written agent loops | Battle-tested harness with tool loops, cost tracking, streaming |
| No permission system | Granular policy engine with 4 modes and audit trails |
| Scattered session management | Persistent sessions with full CRUD and history |
| Ad-hoc context assembly | Structured context builder with git, files, and truncation |
| Multiple AI CLIs | One command surface for every provider and workflow |

---

## Core Architecture

<div align="center">

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               NEXUS CLI                                         │
│                     (commander · TUI · streaming)                               │
└────────────────────┬────────────────────────────────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────────────────────────────────┐
│                ┌────┴────┐                                                    │
│                │ Play-   │                                                    │
│                │ ground  │                                                    │
│                └────┬────┘                                                    │
│                     │                                                        │
│    ┌────────────────┼────────────────┐                                        │
│    │                │                │                                        │
│    ▼                ▼                ▼                                        │
│ ┌────────┐    ┌──────────┐      ┌──────────┐                                │
│ │  TOOLS │◄───┤  HARNESS │─────▶│ PROVIDER │                                │
│ │ Engine │    │   Engine │      │  Abstr.  │                                │
│ └───┬────┘    └────┬─────┘      └──────────┘                                │
│     │             │                                                       │
│     │    ┌────────┴────────┐                                             │
│     │    │                 │                                             │
│     ▼    ▼                 ▼                                             │
│ ┌──────────┐      ┌──────────┐      ┌──────────┐                       │
│ │ PERMISSION│      │  CONTEXT │      │  SESSION │                       │
│ │  ENGINE  │      │  BUILDER │      │   STORE  │                       │
│ └──────────┘      └──────────┘      └──────────┘                       │
│    ▲                       │                       ▲                     │
│    └───────────────────────┼───────────────────────┘                     │
│                            │                                              │
└────────────────────────────┼───────────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  Config  │    │  Skills  │    │   Utils  │
        │  Manager │    │  System  │    │   Layer  │
        └──────────┘    └──────────┘    └──────────┘
```

</div>

### 🧠 Provider Abstraction

A single `Provider` interface with `chat()`, `streamChat()`, `healthCheck()`, and `listModels()` — implemented for:

| Provider | SDK | Streaming | Tool Calling |
|---|---|---|---|
| **OpenRouter** | OpenAI SDK | ✅ | ✅ |
| **Anthropic** | `@anthropic-ai/sdk` | ✅ | ✅ |
| **OpenAI** | OpenAI SDK | ✅ | ✅ |
| **Ollama** | OpenAI-compatible | ✅ | ✅ |
| **LM Studio** | OpenAI-compatible | ✅ | ✅ |
| **Custom** | Any OpenAI-compatible endpoint | ✅ | ✅ |
| **Omniroute** | OpenRouter fallback | ✅ | ✅ |

`src/providers/base.ts` · `src/providers/index.ts` · `src/providers/{provider}.ts`

### 🤖 Agent Harness

Autonomous agent loop with:

- Iterative tool call resolution (up to 20 iterations by default)
- Streaming output with cost and token tracking
- Permission checks before every tool execution
- Timeout, token, and cost limits
- Event callback system (`on`/`off`)
- Cancel support

`src/harness/index.ts` · `tests/harness.test.ts`

### 🛠 Built-in Tools

11 permission-gated tools covering the essential developer workflow:

| Category | Tools |
|---|---|
| **Filesystem** | `read_file`, `write_file`, `edit_file`, `list_dir`, `search_files`, `file_info` |
| **Terminal** | `execute_command` |
| **Git** | `git_status`, `git_diff`, `git_log`, `git_branch` |

Each tool declares its `PermissionCategory` and is type-safe via `ToolDefinition`.

`src/tools/definitions.ts` · `src/tools/executor.ts` · `tests/tools.test.ts`

### 🔐 Permission Engine

Granular, auditable permission system with four modes:

| Mode | Behavior |
|---|---|
| `safe` | Ask before every operation (`allow-once`) |
| `normal` | Interactive approval, remembers session |
| `sandbox` | Deny filesystem and terminal by default |
| `relaxed` | Allow everything (`allow-always`) |

13 permission categories across filesystem, terminal, network, git, and extensibility surfaces.

`src/permissions/engine.ts` · `src/permissions/store.ts` · `tests/permissions.test.ts`

### 💾 Sessions

Persistent session storage with full lifecycle:

```
  save() ──▶ load() ──▶ list() ──▶ appendMessage() ──▶ updateSession() ──▶ delete()
```

Sessions are stored as JSON in `.forge/sessions/` (project) or `~/.nexus/sessions/` (global).

`src/sessions/store.ts` · `tests/sessions.test.ts`

### 🔀 Context Builder

Assembles rich, token-efficient context from multiple sources:

- Project files (`package.json`, `README.md`, `pyproject.toml`, etc.)
- Git status and diff
- Source file listings
- Session history
- Tool results

Three context strategies: `truncate` · `summarize` · `compact`

`src/context/builder.ts` · `tests/context.test.ts`

### 🖥 Playground (Interactive Session)

A full terminal AI playground with slash commands, skills, and session management:

```
╭──────────────────────────────────────────────────────────────────────────────────╮
│  NEXUS Playground                        claude/sonnet-4-20250514           ⚙   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  You: Write a function to sort an array                                          │
│                                                                                  │
│  Assistant: I'll write a merge sort implementation...                            │
│    [read_file] src/utils/sort.ts ✓                                                │
│    [write_file] src/utils/sort.ts ✓                                               │
│                                                                                  │
│    Here's the implementation with O(n log n) complexity...                       │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ▸ model: claude/sonnet-4-20250514   ▸ mode: normal   ▸ session: a1b2c3d4       │
│  Tokens: 1,247  │  Cost: $0.0001  │  Iterations: 3  │  Time: 2.4s               │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

- **Streaming UI** — live text rendering with token/cost/iteration tracking
- **Slash Commands** — 21+ built-in commands (`/model`, `/sessions`, `/tools`, `/permissions`, etc.)
- **Command History** — arrow key navigation, tab autocomplete
- **Multiline Input** — prefix with `> ` for multi-line prompts
- **Session Management** — create, switch, resume, and save conversations
- **Skills System** — discover and load skills from disk
- **No-Provider Mode** — graceful error messaging when no provider is configured

`src/cli/playground/` · `tests/playground/`

### 🖥 Terminal UI

A lightweight TUI with ANSI rendering:

- Live streaming text display
- Status indicators (`idle` · `running` · `awaiting_permission` · `completed` · `error`)
- Token count and cost estimate display
- Iteration tracking

`src/tui/index.ts`

### ⚡ Configuration

Type-safe config manager with deep-copy isolation (no shared-state mutations):

- Global config: `~/.nexus/config.json`
- Project config: `.forge/config.json`
- Provider and model registries
- Permission policy persistence
- Agent and workflow definitions

`src/config/index.ts` · `src/config/paths.ts` · `tests/config.test.ts`

---

## The NEXUS Stack

<div align="center">

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════════════════════════════════╗  │
│  ║  NEXUS CLI                 commander · tui · streaming                     ║  │
│  ╠════════════════════════════════════════════════════════════════════════════╣  │
│  ║  Config · Sessions · Paths · Utils              persistent state            ║  │
│  ╠════════════════════════════════════════════════════════════════════════════╣  │
│  ║  Agent Harness · Context Builder · Permission Engine    orchestration       ║  │
│  ╠════════════════════════════════════════════════════════════════════════════╣  │
│  ║  Providers  (OpenRouter · Anthropic · OpenAI · Ollama…) modules             ║  │
│  ╠════════════════════════════════════════════════════════════════════════════╣  │
│  ║  Tools  (filesystem · terminal · git · 11 built-in) executors               ║  │
│  ╠════════════════════════════════════════════════════════════════════════════╣  │
│  ║  Skills · Playground · MCP · Plugins · Workflows · Agents                   ║  │
│  ╚════════════════════════════════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## First Run — Dashboard

<div align="center">

```
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║                                                                              ║
  ║    ┌──────────────────────────────────────────────────────────────────┐      ║
  ║    │  NEXUS v0.1.0 — Universal AI Developer Platform                 │      ║
  ║    │                                                                  │      ║
  ║    │  ⚙ CONFIGURATION          📁 PROJECT                           │      ║
  ║    │    Provider:    openrouter     Path:     my-project              │      ║
  ║    │    Model:       claude/sonnet  Full:    ~/code/my-project        │      ║
  ║    │    Mode:        normal         Language: typescript              │      ║
  ║    │    Streaming:   enabled                                    │      ║
  ║    │                                                                  │      ║
  ║    │  🔧 TOOLS             ⚡ SKILLS          💾 SESSION              │      ║
  ║    │    Filesystem: 6       Loaded: 12       ID:    a1b2c3d4          │      ║
  ║    │    Terminal:   1       Groups: 5        Total: 3 sessions        │      ║
  ║    │    Git:        4       Hints: add to   Storage: ~/.nexus/        │      ║
  ║    │                                                                  │      ║
  ║    │  🧠 CAPABILITIES     🚀 QUICK START                              │      ║
  ║    │    streaming · toolCalling · image  Type a message to chat       │      ║
  ║    │    maxContext: 128,000             /help  · /model  · /quit      │      ║
  ║    └──────────────────────────────────────────────────────────────────┘      ║
  ║                                                                              ║
  ║    ▸ model: claude/sonnet-4-20250514  ▸ provider: openrouter  ▸ session     │
  ║    ▸ tokens: 0  │  cost: $0.0000  │  iterations: 0  │  time: 0s             │
  ╚══════════════════════════════════════════════════════════════════════════════╝
```

</div>

> *Illustrative terminal output — actual TUI may vary.*

---

## Quick Start

```bash
# Clone, install, build, and link
git clone https://github.com/qtjg/nexus.git
cd nexus
npm install
npm run build
npm link

# Initialize in your project
nexus init

# Configure a provider
nexus provider add anthropic --api-key $ANTHROPIC_API_KEY
nexus provider add openrouter --api-key $OPENROUTER_API_KEY

# Verify everything is healthy
nexus doctor

# Start an interactive session
nexus
```

---

## CLI Reference

```
  nexus                    Start interactive session
  nexus init               Initialize NEXUS in current directory
  nexus providers          List all configured providers
  nexus provider <id>      Add or inspect a provider
  nexus models             List all configured models
  nexus model <id>         Set the active model
  nexus doctor             Health check for providers and config
  nexus help               Show help
```

### Provider Commands

```bash
# Add a provider with API key
nexus provider add anthropic --api-key $ANTHROPIC_API_KEY

# Add a custom OpenAI-compatible provider
nexus provider add custom --base-url http://localhost:1234/v1 --api-key not-needed

# Inspect a provider
nexus provider anthropic
```

### Model Commands

```bash
# List configured models
nexus models

# Switch active model
nexus model use anthropic/claude-sonnet-4-20250514
```

### Interactive Session

```bash
# Start with defaults
nexus

# Force safe mode
nexus --safe

# Force sandbox mode
nexus --sandbox

# Specify provider and model
nexus -p openrouter -m anthropic/claude-sonnet-4-20250514

# Disable streaming
nexus --no-stream
```

### Slash Commands (inside session)

<div align="center">

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ╔═══ SESSION MANAGEMENT ═══════════════════════════════════════════════════╗  │
│  ║  /new          Start a new session                                      ║  │
│  ║  /sessions     List all sessions                                        ║  │
│  ║  /switch       Switch to another session                                 ║  │
│  ║  /save         Save current session                                      ║  │
│  ║  /history      Show input history                                        ║  │
│  ║  /clear        Clear conversation                                        ║  │
│  ║  /title        Set session title                                         ║  │
│  ║  /quit         Exit playground                                            ║  │
│  ╚══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                │
│  ╔═══ MODEL & PROVIDER ══════════════════════════════════════════════════════╗  │
│  ║  /model        Check or change model                                      ║  │
│  ║  /models       List available models                                       ║  │
│  ║  /provider     Check or change provider                                    ║  │
│  ║  /providers    List configured providers                                    ║  │
│  ╚══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                │
│  ╔═══ INFO & DIAGNOSTICS ═════════════════════════════════════════════════════╣  │
│  ║  /help         Show available commands                                      ║  │
│  ║  /tools        List available tools                                         ║  │
│  ║  /permissions  Show permission policies                                      ║  │
│  ║  /context      View assembled context                                       ║  │
│  ║  /project      Show project info                                            ║  │
│  ║  /doctor       Run diagnostics                                              ║  │
│  ║  /skills       List installed skills                                        ║  │
│  ║  /cost         Show token/cost info                                         ║  │
│  ╚══════════════════════════════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

</div>

Use `> ` prefix to enter multiline input mode — send a blank line to submit.

---

## Use Cases

### 🧑‍💻 AI-Assisted Coding
Run NEXUS in any project directory. It auto-detects the language (TypeScript, Python, Rust, Go, Ruby) and framework (Next.js, React, Vue, Express, Fastify), injects project context, and helps you write, edit, and debug code with full filesystem and terminal access.

### 🔄 Model Switching
Swap between Claude, GPT-4, Gemini, or local models without changing your workflow. Configure multiple providers and switch models on the fly with `nexus model use <id>`.

### 🔒 Local-First Workflows
Run NEXUS with Ollama or LM Studio for fully local, offline AI. No API keys, no egress, no cost — just your model and your machine.

### 🛡️ Secure Automation
The permission engine lets you run NEXUS in `sandbox` mode for untrusted tasks, or `relaxed` mode for trusted automation scripts. Every decision is auditable and persists across sessions.

### 🔌 Provider-Agnostic Scripts
Write tooling that works with any provider. The `Provider` interface is the contract — swap implementations without touching your harness or tools.

---

## Extensibility

NEXUS is designed to be extended. The type system defines the contracts; implementations grow on top.

```
  NEXUS
   ├── Providers        — src/providers/        (OpenRouter, Anthropic, OpenAI, Local)
   ├── Models           — type: Model           (cloud · local · gateway)
   ├── Harness          — src/harness/          (agent loops, tool resolution)
   ├── Tools            — src/tools/            (11 built-in, extensible via ToolDefinition)
   ├── Permissions      — src/permissions/      (engine + file-based store)
   ├── Context          — src/context/          (project assembly, truncation strategies)
   ├── Sessions         — src/sessions/         (persistent history)
   ├── TUI              — src/tui/              (terminal rendering)
   ├── Config           — src/config/           (global + project config)
   ├── Playground       — src/cli/playground/   (slash commands, input, renderer)
   ├── Skills           — src/skills/           (skill discovery and management)
   ├── MCP              — type: ToolKind='mcp'  (type system — implementation pending)
   ├── Plugins          — type: ToolKind='plugin' (type system — implementation pending)
   └── Workflows        — type: Workflow        (type system — implementation pending)
```

**Implemented today:** Providers, Harness, Tools, Permissions, Context, Sessions, TUI, Config, Playground, Skills.
**Type system ready:** MCP, Plugins, Workflows, Agents.

---

## Security & Permissions

NEXUS treats security as a first-class concern, not an afterthought.

### Permission Categories

Every tool action maps to a permission category:

| Category | Covers |
|---|---|
| `filesystem.read` | `read_file`, `list_dir`, `search_files`, `file_info` |
| `filesystem.write` | `write_file`, `edit_file` |
| `filesystem.delete` | File deletion operations |
| `terminal.execute` | `execute_command` |
| `terminal.process` | Process management |
| `network.request` | HTTP/fetch operations |
| `git.read` | `git_status`, `git_diff`, `git_log` |
| `git.write` | Branch operations |
| `git.commit` | Commit operations |
| `git.push` | Push operations |
| `mcp.execute` | MCP tool calls |
| `plugin.execute` | Plugin tool calls |
| `sandbox` | Sandbox boundary enforcement |

### Decision Scopes

Each permission decision supports scopes that control persistence:

| Decision | Scope |
|---|---|
| `allow-once` / `deny-once` | Single execution |
| `allow-session` / `deny-session` | Current session only |
| `allow-project` / `deny-project` | Project `.forge/` directory |
| `allow-always` / `deny-always` | Global `~/.nexus/` directory |

### Permission Store

Decisions are persisted to `~/.nexus/permissions.json` and loaded on startup. The `FilePermissionStore` class implements `PermissionStore` for durability.

`src/permissions/engine.ts` · `src/permissions/store.ts` · `tests/permissions.test.ts`

---

## Configuration

### Global Config

Stored at `~/.nexus/config.json`:

```json
{
  "version": "0.1.0",
  "defaultProvider": "anthropic",
  "defaultModel": "anthropic/claude-sonnet-4-20250514",
  "permissionMode": "safe",
  "streaming": true,
  "context": {
    "maxTokens": 100000,
    "includeGitStatus": true,
    "includeProjectFiles": true,
    "includeToolResults": true,
    "includeSessionHistory": true,
    "includeSkillInstructions": false,
    "includeMcpResources": false,
    "strategy": "truncate"
  },
  "providers": [],
  "models": [],
  "permissions": [],
  "tools": [],
  "workflows": [],
  "telemetry": false
}
```

### Project Config

Stored at `{project}/.forge/config.json` — overrides global config at the project level.

### Environment Variables

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export OPENROUTER_API_KEY=sk-or-...
export NEXUS_DIR=~/.nexus    # Override default config directory
```

`src/config/index.ts` · `src/config/paths.ts` · `tests/config.test.ts`

---

## Development

First, configure a user-local npm prefix so `npm link` works without root:

```bash
# One-time setup (run once in your terminal)
mkdir -p ~/.local/npm/bin
echo "prefix=$HOME/.local/npm" > ~/.npmrc
echo 'export PATH="$HOME/.local/npm/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.local/npm/bin:$PATH"' >> ~/.bash_profile
source ~/.bashrc
```

Then:

```bash
# Clone and install
git clone https://github.com/qtjg/nexus.git
cd nexus
npm install

# Build TypeScript
npm run build

# Link globally for local testing
npm link

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Run in development mode
npm run dev
```

Verify the link:

```bash
which nexus      # → /home/username/.local/npm/bin/nexus
nexus --version  # → 0.1.0
```

To remove the link: `npm unlink -g nexus` (run from inside the project directory).

## Installing from Published Package

Once published to npm:

```bash
npm install -g nexus
```

> **Note:** On Arch Linux and other systems where the system npm prefix is root-owned (`/usr`), the user-local prefix setup above is required for both `npm install -g` and `npm link` to work.

### Project Structure

<div align="center">

```
nexus/
├── bin/nexus.js            # CLI entry point
├── src/
│   ├── cli/
│   │   ├── index.ts        # Commander.js command definitions
│   │   └── playground/     # Interactive session system
│   │       ├── Playground.ts  # Main orchestrator
│   │       ├── commands.ts    # 21+ slash commands
│   │       ├── registry.ts    # Command registry
│   │       ├── parser.ts      # Slash command parsing
│   │       ├── input.ts       # readline + arrow keys
│   │       ├── renderer.ts    # ANSI frame rendering
│   │       ├── types.ts       # Core types
│   │       └── welcome.ts     # Hermes-style dashboard
│   ├── skills/             # Skills discovery system
│   │   ├── SkillManager.ts
│   │   └── index.ts
│   ├── config/             # Config manager & path resolution
│   ├── context/            # Context assembly & truncation
│   ├── harness/            # Agent loop orchestration
│   ├── permissions/        # Permission engine & file store
│   ├── providers/          # Provider implementations
│   ├── sessions/           # Session persistence
│   ├── tools/              # Tool definitions & executor
│   ├── tui/                # Terminal UI renderer
│   ├── types/              # Core type system
│   └── utils/              # FS helpers & logger
├── tests/                  # 71 tests across 12 suites
│   ├── playground/         # New: parser, registry, skills
│   └── ...                 # Existing test suites
├── dist/                   # Compiled output
├── package.json
└── tsconfig.json
```

</div>

---

## Testing

<div align="center">

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  npm test                                                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ▶ CLI Dispatch (Regression)                                                     │
│    ✔ should NOT silently exit when run with no args                              │
│    ✔ should show provider hint for nexus chat alias                              │
│    ✔ should show provider hint for nexus run alias                               │
│    ✔ should show help for nexus --help                                           │
│    ✔ should list providers command output                                        │
│    ✔ should suggest how to add a provider                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ▶ ConfigManager    ▶ ContextBuilder     ▶ AgentHarness                          │
│  ▶ PermissionEngine ▶ SessionStore     ▶ Tool Executor                           │
│  ▶ Provider Types  ▶ Tool Types                                            │
│  ▶ SlashCommand Parser  ▶ SlashCommandRegistry  ▶ SkillManager                   │
└──────────────────────────────────────────────────────────────────────────────────┘

  ℹ tests 71
  ℹ suites 12
  ℹ pass 71
  ℹ fail 0
```

</div>

All 71 tests pass consistently. Run with `npm test` or `npm run test:watch`.

---

## Roadmap

| Status | Feature |
|---|---|
| ✅ | Provider abstraction (OpenRouter, Anthropic, OpenAI, Ollama, LM Studio) |
| ✅ | Agent harness with tool loops |
| ✅ | 11 built-in tools (filesystem, terminal, git) |
| ✅ | Permission engine (4 modes, 13 categories) |
| ✅ | Context builder with truncation strategies |
| ✅ | Session persistence (CRUD) |
| ✅ | TUI with streaming and cost tracking |
| ✅ | Config manager (global + project) |
| ✅ | Interactive playground with slash commands |
| ✅ | Skills system (discovery, loading, command registry) |
| ✅ | Hermes-style dashboard with 3D layered boxes |
| ✅ | 71 passing tests |
| 🗺 | MCP server integration |
| 🗺 | Plugin system |
| 🗺 | Workflow engine |
| 🗺 | Multi-agent support |
| 🗺 | Web search tool |
| 🗺 | Structured output / JSON mode |
| 🗺 | Cross-platform TUI improvements |

---

## Project Status

<div align="center">

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   NEXUS v0.1.0 — Early development                                               │
│                                                                                  │
│   A working, tested foundation for a universal AI development                    │
│   platform. The core runtime — providers, harness, tools,                        │
│   permissions, context, sessions, playground, and skills —                       │
│   is implemented and tested.                                                     │
│                                                                                  │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                                  │
│   71 tests · 12 suites · TypeScript strict · Hermes-style dashboard              │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## Contributing

Contributions are welcome. Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes — ensure all 71 existing tests pass
4. Add tests for new functionality
5. Run `npm run typecheck` to verify types
6. Commit with a clear message
7. Push and open a pull request

**Requirements:**
- All new features must include tests
- TypeScript strict mode must pass (`npm run typecheck`)
- `npm test` must pass with zero failures
- Follow existing code style and naming conventions

---

## License

[MIT](LICENSE) — Copyright © 2026 NEXUS Contributors

---

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║    ┌──────────────────────────────────────────────────────────────────────┐      ║
║    │                                                                      │      ║
║    │      Build with every model.                                       │      ║
║    │      Route through every capability.                                │      ║
║    │      Operate from one terminal.                                     │      ║
║    │                                                                      │      ║
║    └──────────────────────────────────────────────────────────────────────┘      ║
║                                                                                  ║
║                                                                              ║
║    github.com/qtjg/nexus  ·  npmjs.com/package/nexus  ·  v0.1.0              ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

</div>
