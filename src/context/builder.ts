// Context Builder — NEXUS
// Assembles context from project files, git state, session history, etc.

import type { Message } from '../types/index.js';
import type { ToolCall, ToolResult } from '../types/index.js';
import type { ContextConfig, ProjectInfo } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('context');

export class ContextBuilder {
  private config: ContextConfig;
  private projectInfo?: ProjectInfo;

  constructor(config: ContextConfig) {
    this.config = config;
  }

  setProjectInfo(info: ProjectInfo): void {
    this.projectInfo = info;
  }

  async build(
    messages: Message[],
    toolCalls: ToolCall[] = [],
    toolResults: ToolResult[] = []
  ): Promise<Message[]> {
    const context: Message[] = [];

    // Add system context
    const systemMsg = messages.find((m) => m.role === 'system');
    if (systemMsg) {
      context.push(systemMsg);
    }

    // Add project context (only at start)
    if (messages.length <= 2 && this.projectInfo && this.config.includeProjectFiles) {
      const projectContext = await this.buildProjectContext();
      if (projectContext) {
        context.push({
          id: 'ctx_project',
          role: 'system',
          content: projectContext,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Add relevant tool results
    if (this.config.includeToolResults) {
      for (const result of toolResults) {
        context.push({
          id: `ctx_tool_${result.callId}`,
          role: 'tool',
          toolCallId: result.callId,
          content: result.content,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Add conversation messages (excluding system)
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    context.push(...conversationMessages);

    // Apply context management strategy
    return this.manageContext(context);
  }

  private async buildProjectContext(): Promise<string | null> {
    if (!this.projectInfo) return null;

    const parts: string[] = [];
    const projectRoot = this.projectInfo.path;

    parts.push(`# Project Context`);
    parts.push(`Path: ${this.projectInfo.path}`);
    parts.push(`Language: ${this.projectInfo.language || 'unknown'}`);
    parts.push(`Framework: ${this.projectInfo.framework || 'unknown'}`);
    parts.push('');

    // Read package files
    const pkgFiles = [
      'package.json',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'requirements.txt',
      'README.md',
    ];

    for (const file of pkgFiles) {
      const filePath = path.join(projectRoot, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          const maxLen = file === 'README.md' ? 2000 : 500;
          parts.push(`## ${file}`);
          parts.push(content.length > maxLen ? content.slice(0, maxLen) + '... [truncated]' : content);
          parts.push('');
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    // List src directory
    const srcPath = path.join(projectRoot, 'src');
    try {
      const entries = await fs.readdir(srcPath, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile() && !e.name.startsWith('.')).slice(0, 20);
      if (files.length > 0) {
        parts.push('## Source Files');
        for (const f of files) {
          parts.push(`- ${f.name}`);
        }
        parts.push('');
      }
    } catch {
      // No src directory
    }

    // Git status
    if (this.config.includeGitStatus) {
      try {
        const { execSync } = await import('child_process');
        const status = execSync('git status --short', {
          cwd: projectRoot,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024,
        }).trim();
        if (status) {
          parts.push('## Git Status');
          parts.push(status);
          parts.push('');
        }
      } catch {
        // Not a git repo
      }
    }

    return parts.join('\n') || null;
  }

  private manageContext(messages: Message[]): Message[] {
    // Token budget management
    const maxTokens = this.config.maxTokens;
    let totalTokens = 0;
    const result: Message[] = [];

    for (const msg of messages) {
      const msgTokens = this.estimateTokens(msg.content);
      if (totalTokens + msgTokens > maxTokens) {
        // Truncate or summarize
        if (this.config.strategy === 'truncate' && msg.role !== 'system') {
          // Keep only the last N messages that fit
          break;
        }
        // Default: add what fits
        const remaining = maxTokens - totalTokens;
        if (remaining > 0 && msg.content.length > remaining * 4) {
          msg.content = msg.content.slice(0, remaining * 4) + '... [truncated]';
        }
      }
      totalTokens += msgTokens;
      result.push(msg);
    }

    return result;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
