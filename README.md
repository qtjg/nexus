# NEXUS — Universal AI Developer Platform

A universal AI development environment for the terminal.

## What is NEXUS?

NEXUS is a model-independent, provider-independent AI workspace that gives developers:

- **Universal model access** — Connect to Claude, GPT, Gemini, DeepSeek, Ollama, and more
- **Agent harness** — Autonomous agents with tool use, permissions, and memory
- **Extensible architecture** — Skills, MCP servers, plugins, and workflows
- **Local-first** — Use local models via Ollama or LM Studio
- **Provider-agnostic** — Route between providers with fallback
- **Secure by default** — Explicit permissions, sandboxing, audit trails

## Quick Start

```bash
# Install
npm install -g nexus

# Initialize
nexus init

# Start interactive session
nexus

# Configure a provider
nexus provider add openrouter --api-key $OPENROUTER_API_KEY

# Use a model
nexus model use claude/sonnet

# Run in a project
cd my-project
nexus
```

## Architecture

```
NEXUS CLI
  └── TUI
      └── Core
          ├── Harness (agent loops, tools, permissions)
          ├── Context (assembly, truncation, memory)
          ├── Session (persistence, history)
          ├── Providers (OpenRouter, Anthropic, OpenAI, local)
          ├── Tools (filesystem, terminal, git, web)
          ├── Permissions (granular, auditable)
          └── Extensions (skills, MCP, plugins, workflows)
```

## MVP Features

- Cross-platform CLI (Windows, macOS, Linux)
- Interactive terminal experience
- Provider abstraction (OpenRouter, Anthropic, OpenAI, local endpoints)
- Model switching and routing
- Filesystem, terminal, and git tools
- Basic agent harness with tool calls
- Permission system
- Session history
- Local model support

## Configuration

```bash
# List providers
nexus providers

# Add a provider
nexus provider add anthropic --api-key $ANTHROPIC_API_KEY

# List models
nexus models

# Use a model
nexus model use anthropic/claude-sonnet-4

# Check status
nexus doctor
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck
```

## Philosophy

> The model is replaceable. The environment, harness, tools, workflows, permissions, and developer experience are the product.

NEXUS is not a chatbot. It's an AI development environment.

## License

MIT
