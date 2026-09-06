// TUI — NEXUS Terminal UI
// Rich terminal interface with streaming, status, and controls

import type { StreamChunk, HarnessEventPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class TUI {
  private buffer: string = '';
  private lines: string[] = [];
  private streaming: boolean = false;
  private currentModel: string = '';
  private tokenCount: number = 0;
  private costEstimate: number = 0;
  private iterations: number = 0;
  private status: 'idle' | 'running' | 'awaiting_permission' | 'completed' | 'error' = 'idle';
  private statusMessage: string = '';

  constructor(model?: string) {
    if (model) this.currentModel = model;
  }

  setModel(model: string): void {
    this.currentModel = model;
    this.render();
  }

  setStatus(status: 'idle' | 'running' | 'awaiting_permission' | 'completed' | 'error', message?: string): void {
    this.status = status;
    if (message) this.statusMessage = message;
    this.render();
  }

  pushChunk(chunk: StreamChunk): void {
    if (chunk.type === 'text') {
      this.buffer += chunk.content;
      this.render();
    } else if (chunk.type === 'usage') {
      this.tokenCount = chunk.usage.total;
      this.render();
    } else if (chunk.type === 'cost') {
      this.costEstimate += chunk.cost;
      this.render();
    }
  }

  onEvent(event: HarnessEventPayload): void {
    if (event.type === 'agent.started') {
      this.iterations = 0;
      this.streaming = true;
      this.setStatus('running', 'Starting agent...');
    } else if (event.type === 'tool.requested') {
      this.setStatus('running', `Tool: ${event.data.toolName}`);
    } else if (event.type === 'tool.completed') {
      this.iterations++;
      this.setStatus('running', `Tool completed (${this.iterations} iterations)`);
    } else if (event.type === 'agent.completed') {
      this.streaming = false;
      this.setStatus('completed', 'Done');
      this.render();
    } else if (event.type === 'agent.failed') {
      this.streaming = false;
      this.setStatus('error', event.data.error as string);
      this.render();
    }
  }

  private render(): void {
    // Simple terminal render — in a real implementation this would use a TUI library
    process.stdout.write('\x1b[H\x1b[2J'); // Clear screen

    const statusColors: Record<string, string> = {
      idle: '\x1b[36m',
      running: '\x1b[33m',
      awaiting_permission: '\x1b[31m',
      completed: '\x1b[32m',
      error: '\x1b[31m',
    };
    const reset = '\x1b[0m';
    const color = statusColors[this.status] || reset;

    process.stdout.write(`\x1b[36m╭────────────────────────────────────────────────────────╮${reset}\n`);
    process.stdout.write(`\x1b[36m│\x1b[37m NEXUS                      \x1b[33m${this.currentModel || 'Model'}\x1b[37m                    │${reset}\n`);
    process.stdout.write(`\x1b[36m├────────────────────────────────────────────────────────┤${reset}\n`);

    if (this.status === 'running' || this.streaming) {
      process.stdout.write(`\x1b[33m│  ${color}◉ ${this.statusMessage || 'Processing...'}${reset}\x1b[36m                                              │${reset}\n`);
    }

    process.stdout.write(`\x1b[36m│${reset}\n`);

    // Show streaming content
    if (this.buffer) {
      const wrapped = this.wrapText(this.buffer, 56);
      for (const line of wrapped) {
        process.stdout.write(`\x1b[36m│ \x1b[37m${line}${reset}\x1b[36m │${reset}\n`);
      }
    } else {
      process.stdout.write(`\x1b[36m│ \x1b[90m> Type your request...\x1b[39m\x1b[36m                                              │${reset}\n`);
    }

    process.stdout.write(`\x1b[36m│${reset}\n`);
    process.stdout.write(`\x1b[36m├────────────────────────────────────────────────────────┤${reset}\n`);
    process.stdout.write(`\x1b[36m│\x1b[90m  Tokens: ${String(this.tokenCount).padEnd(12)} Cost: $\x1b[37m${this.costEstimate.toFixed(3).padEnd(8)}\x1b[90m Iterations: ${String(this.iterations).padEnd(4)}  │${reset}\n`);
    process.stdout.write(`\x1b[36m╰────────────────────────────────────────────────────────╯${reset}\n`);
  }

  private wrapText(text: string, width: number): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).trim().length > width) {
        lines.push(current.padEnd(width));
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) lines.push(current.padEnd(width));
    return lines;
  }

  clear(): void {
    this.buffer = '';
    this.tokenCount = 0;
    this.costEstimate = 0;
    this.iterations = 0;
    this.render();
  }
}

export function createTUI(model?: string): TUI {
  return new TUI(model);
}
