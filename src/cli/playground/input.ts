// NEXUS — Input Controller
// Handles multiline input, history, arrow keys, autocomplete
// Uses a clean custom prompt approach (no readline echo duplication)
import * as readline from 'readline';

const ESC = '\x1b';
const CSI = `${ESC}[`;

export class InputController {
  private rl: readline.Interface;
  private currentLine = '';
  private history: string[];
  private historyIndex = -1;
  private isMultiline = false;
  private multilineBuffer = '';
  private onComplete: (line: string) => Promise<void>;
  private onExit: () => void;
  private autocompleteFn?: (input: string) => string[];
  private partialLine = '';
  private promptText = '';

  constructor(opts: {
    onComplete: (line: string) => Promise<void>;
    onExit: () => void;
    initialHistory?: string[];
  }) {
    this.history = opts.initialHistory ?? [];
    this.onComplete = opts.onComplete;
    this.onExit = opts.onExit;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    this.setupHandlers();
  }

  setPrompt(text: string): void {
    this.promptText = text;
    this.writePrompt();
  }

  private writePrompt(): void {
    process.stdout.write(`${ESC}[?25l${ESC}[36m${this.promptText}${ESC}[37m`);
  }

  private writeLine(text: string): void {
    process.stdout.write(text);
  }

  prompt(): void {
    this.writePrompt();
  }

  private setupHandlers(): void {
    this.rl.on('line', (line) => {
      const rawLine = line;

      if (this.isMultiline) {
        this.multilineBuffer += rawLine + '\n';
        if (rawLine.trim() === '' && this.multilineBuffer.trim().length > 0) {
          const fullInput = this.multilineBuffer.trim();
          this.isMultiline = false;
          this.multilineBuffer = '';
          this.history.push(fullInput);
          this.historyIndex = this.history.length;
          process.stdout.write(`${ESC}[?25h`);
          process.stdout.write('\n');
          this.onComplete(fullInput).catch(() => {});
          this.prompt();
          process.stdout.write(`${ESC}[?25l`);
        } else {
          this.writeLine(rawLine + '\n');
          this.writePrompt();
        }
        return;
      }

      const trimmed = rawLine.trim();
      if (!trimmed) {
        this.prompt();
        return;
      }

      this.history.push(trimmed);
      this.historyIndex = this.history.length;
      process.stdout.write(`${ESC}[?25h`);
      process.stdout.write('\n');
      this.onComplete(trimmed).catch(() => {});
      this.prompt();
      process.stdout.write(`${ESC}[?25l`);
    });

    process.stdin.on('keypress', (ch: string, key: any) => {
      if (this.isMultiline) return;

      // Handle arrow keys
      if (key?.name === 'up') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.currentLine = this.history[this.historyIndex];
          this.rewriteCurrentLine();
        }
      } else if (key?.name === 'down') {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.currentLine = this.history[this.historyIndex];
          this.rewriteCurrentLine();
        } else {
          this.historyIndex = this.history.length;
          this.currentLine = '';
          this.clearCurrentLine();
        }
      } else if (key?.name === 'tab') {
        if (this.autocompleteFn) {
          const suggestions = this.autocompleteFn(this.currentLine);
          if (suggestions.length === 1) {
            this.currentLine = suggestions[0];
            this.rewriteCurrentLine();
          } else if (suggestions.length > 1) {
            const match = suggestions.filter((s) => s.startsWith(this.currentLine));
            if (match.length === 1) {
              this.currentLine = match[0];
              this.rewriteCurrentLine();
            }
          }
        }
      } else if (key?.name === 'left') {
        if (this.currentLine.length > 0) {
          this.currentLine = this.currentLine.slice(0, -1);
          this.rewriteCurrentLine();
        }
      } else if (key?.name === 'right') {
        if (this.currentLine.length > 0) {
          this.currentLine = this.currentLine.slice(0, -1);
          this.rewriteCurrentLine();
        }
      } else if (key?.name === 'backspace') {
        if (this.currentLine.length > 0) {
          this.currentLine = this.currentLine.slice(0, -1);
          this.rewriteCurrentLine();
        }
      } else if (key?.ctrl && key?.name === 'c') {
        process.stdout.write(`${ESC}[K${ESC}[?25l`);
        this.onExit();
      } else if (ch && ch.length === 1 && !key?.ctrl && !key?.meta) {
        // Regular printable character — echo it
        this.currentLine += ch;
        process.stdout.write(ch);
      }
    });
  }

  private rewriteCurrentLine(): void {
    // Erase current line, rewrite with updated content + prompt
    process.stdout.write(`${CSI}G${ESC}[K`);
    process.stdout.write(this.currentLine);
    process.stdout.write(`${ESC}[36m${this.promptText.slice(this.currentLine.length)}${ESC}[37m`);
  }

  private clearCurrentLine(): void {
    process.stdout.write(`${CSI}G${ESC}[K`);
  }

  close(): void {
    this.showCursor();
    this.rl.close();
  }

  showCursor(): void {
    process.stdout.write(`${ESC}[?25h`);
  }
}
