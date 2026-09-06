// NEXUS — Renderer
// Streaming output renderer with ANSI escapes, tool display, scrollback
import * as readline from 'readline';
import type { RenderState, ToolRenderInfo } from './types.js';

const ESC = '\x1b';
const CSI = `${ESC}[`;

export class Renderer {
  private buffer: string[] = [];
  private scrollback: string[] = [];
  private scrollbackLimit = 500;
  private isRunning = false;
  private responseBuffer = '';
  private renderState: RenderState;
  private rl: readline.Interface;
  private onStatusChange?: (status: RenderState) => void;

  constructor(opts?: { onStatusChange?: (status: RenderState) => void }) {
    this.renderState = this.createInitialState();
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this.onStatusChange = opts?.onStatusChange;
  }

  private createInitialState(): RenderState {
    return {
      model: 'unknown',
      provider: 'unknown',
      project: 'unknown',
      mode: 'normal' as const,
      sessionId: 'unknown',
      tokensUsed: 0,
      costEstimate: 0,
      iterations: 0,
      status: 'idle',
      statusMessage: '',
      toolActivity: [],
      responseBuffer: '',
    };
  }

  setState(state: Partial<RenderState>): void {
    this.renderState = { ...this.renderState, ...state };
    this.onStatusChange?.(this.renderState);
  }

  getState(): RenderState {
    return this.renderState;
  }

  clearScreen(): void {
    process.stdout.write(`${CSI}2J${CSI}H`);
    this.buffer = [];
  }

  // Render the playground frame
  render(remaining?: string): void {
    const lines = this.buildFrame(remaining);
    const lineCount = lines.length;

    // If we already rendered, move cursor back to top and clear
    if (this.buffer.length > 0) {
      // Move to top-left, clear everything, rewrite
      process.stdout.write(`${CSI}H`);
      for (let i = 0; i < lineCount; i++) {
        process.stdout.write(`${CSI}2K${lines[i]}`);
      }
      // Clear any remaining lines from previous render
      const prevCount = this.buffer.length;
      for (let i = lineCount; i < prevCount; i++) {
        process.stdout.write(`${CSI}2K`);
      }
    } else {
      for (const line of lines) {
        process.stdout.write(`${line}\n`);
      }
    }

    this.buffer = lines;
  }

  private buildFrame(remaining?: string): string[] {
    const lines: string[] = [];
    const state = this.renderState;

    // Header
    lines.push(`${ESC}[36m╔═══ NEXUS Playground ═══════════════════════════════════════╗${ESC}[0m`);
    lines.push(`${ESC}[36m║${ESC}[37m  Model: ${state.model.padEnd(34)}${ESC}[36m║${ESC}[0m`);
    lines.push(`${ESC}[36m║${ESC}[37m  Provider: ${state.provider.padEnd(33)}${ESC}[36m║${ESC}[0m`);
    lines.push(`${ESC}[36m║${ESC}[37m  Project: ${state.project.padEnd(32)}${ESC}[36m║${ESC}[0m`);
    lines.push(`${ESC}[36m║${ESC}[37m  Session: ${state.sessionId.padEnd(32)}${ESC}[36m║${ESC}[0m`);
    lines.push(`${ESC}[36m╠══════════════════════════════════════════════════════════════╣${ESC}[0m`);

    // Status bar
    const statusColors: Record<string, string> = {
      idle: '37',
      running: '33',
      awaiting_permission: '31',
      completed: '32',
      error: '31',
      cancelled: '35',
    };
    const sc = statusColors[state.status] ?? '37';
    lines.push(`${ESC}[36m║${ESC}[${sc}m  Status: ${state.status}${state.statusMessage ? ` — ${state.statusMessage}` : ''}${' '.repeat(25 - state.status.length - (state.statusMessage?.length ?? 0))}${ESC}[36m║${ESC}[0m`);

    // Metrics
    const metrics = `Tokens: ${state.tokensUsed} | Cost: $${state.costEstimate.toFixed(4)} | Iter: ${state.iterations}`;
    lines.push(`${ESC}[36m║${ESC}[90m  ${metrics.padEnd(50)}${ESC}[36m║${ESC}[0m`);

    // Tool activity
    if (state.toolActivity.length > 0) {
      const lastTool = state.toolActivity[state.toolActivity.length - 1];
      const toolColor = lastTool.isError ? '31' : '36';
      const toolLine = `  Tool: ${lastTool.name}${lastTool.durationMs != null ? ` (${lastTool.durationMs}ms)` : ''}`;
      lines.push(`${ESC}[36m║${ESC}[${toolColor}m${toolLine.padEnd(50)}${ESC}[36m║${ESC}[0m`);
    } else {
      lines.push(`${ESC}[36m║${ESC}[90m  ${' '.padEnd(50)}${ESC}[36m║${ESC}[0m`);
    }

    lines.push(`${ESC}[36m╚══════════════════════════════════════════════════════════════╝${ESC}[0m`);
    lines.push('');

    // Conversation history + current response
    const availableLines = process.stdout.rows - lines.length - 4; // Reserve for input
    const msgs = this.scrollback.slice(-availableLines);
    for (const msg of msgs) {
      const wrapped = this.wrapText(msg, 60);
      for (const w of wrapped) {
        lines.push(`  ${w}`);
      }
      lines.push('');
    }

    // Current streaming response
    if (remaining) {
      const wrapped = this.wrapText(remaining, 60);
      for (const w of wrapped) {
        lines.push(`  ${ESC}[37m${w}${ESC}[0m`);
      }
    }

    return lines;
  }

  private wrapText(text: string, width: number): string[] {
    if (text.length <= width) return [text];
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += width) {
      lines.push(text.slice(i, i + width));
    }
    return lines;
  }

  // Stream a chunk of text
  streamChunk(chunk: string): void {
    this.responseBuffer += chunk;
    // Only re-render if we're in the middle of streaming (not at end)
    this.render(this.responseBuffer);
  }

  // Finalize a response (clear buffer, add to scrollback)
  finalizeResponse(): void {
    const content = this.responseBuffer.trim();
    this.responseBuffer = '';
    if (content) {
      this.addScrollback(content);
    }
    this.render();
  }

  addScrollback(text: string): void {
    this.scrollback.push(text);
    if (this.scrollback.length > this.scrollbackLimit) {
      this.scrollback = this.scrollback.slice(-this.scrollbackLimit);
    }
  }

  appendTool(tool: ToolRenderInfo): void {
    this.renderState.toolActivity = [...this.renderState.toolActivity, tool];
    this.render();
  }

  clearToolActivity(): void {
    this.renderState.toolActivity = [];
    this.render();
  }

  // Print a message directly (for errors, info, etc.)
  print(text: string): void {
    // Clear current render
    process.stdout.write(`${CSI}H${ESC}[?25l`); // Hide cursor, move to top
    const lines = text.split('\n');
    for (const line of lines) {
      process.stdout.write(`${ESC}[2K${line}\n`);
    }
    // Restore position
    const pos = lines.length;
    process.stdout.write(`${CSI}${pos}G${ESC}[?25h`);
  }

  // Clear the rendering area
  clear(): void {
    this.buffer = [];
    this.scrollback = [];
    this.responseBuffer = '';
  }

  setRunning(running: boolean): void {
    this.isRunning = running;
    this.renderState.status = running ? 'running' : 'idle';
    this.renderState.statusMessage = running ? 'Processing...' : '';
    this.render();
  }

  setLoading(msg: string): void {
    this.renderState.status = 'idle' as const;
    this.renderState.statusMessage = msg;
    this.render();
  }

  setError(msg: string): void {
    this.renderState.status = 'error';
    this.renderState.statusMessage = msg;
    this.render();
  }

  hideCursor(): void {
    process.stdout.write(`${ESC}[?25l`);
  }

  showCursor(): void {
    process.stdout.write(`${ESC}[?25h`);
  }

  close(): void {
    this.showCursor();
  }
}
