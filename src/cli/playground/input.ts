// NEXUS — Input Controller
// Handles multiline input, history, arrow keys, autocomplete
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

  constructor(opts: {
    onComplete: (line: string) => Promise<void>;
    onExit: () => void;
    initialHistory?: string[];
  }) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '',
      terminal: true,
    });
    this.history = opts.initialHistory ?? [];
    this.onComplete = opts.onComplete;
    this.onExit = opts.onExit;
    this.setupHandlers();
  }

  setAutocomplete(fn: (input: string) => string[]) {
    this.autocompleteFn = fn;
  }

  prompt(): void {
    this.rl.prompt();
  }

  private setupHandlers(): void {
    this.rl.on('line', async (line) => {
      const rawLine = line;

      if (this.isMultiline) {
        this.multilineBuffer += rawLine + '\n';
        if (rawLine.trim() === '' && this.multilineBuffer.trim().length > 0) {
          const fullInput = this.multilineBuffer.trim();
          this.isMultiline = false;
          this.multilineBuffer = '';
          this.history.push(fullInput);
          this.historyIndex = this.history.length;
          await this.onComplete(fullInput);
        } else {
          this.rl.prompt();
        }
        return;
      }

      const trimmed = rawLine.trim();
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      // Multiline trigger
      if (trimmed.startsWith('> ') && trimmed.length > 2) {
        this.isMultiline = true;
        this.multilineBuffer = trimmed.slice(2) + '\n';
        process.stdout.write(`${ESC}[36m  (multiline mode — send blank line to finish)${ESC}[0m\n`);
        this.rl.prompt();
        return;
      }

      this.history.push(trimmed);
      this.historyIndex = this.history.length;
      await this.onComplete(trimmed);
    });

    // Handle arrow keys and special keys
    process.stdin.on('keypress', (ch: string, key: any) => {
      if (this.isMultiline) return;

      if (key?.name === 'up') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.currentLine = this.history[this.historyIndex];
          this.clearCurrentLine();
          process.stdout.write(this.currentLine);
        }
      } else if (key?.name === 'down') {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.currentLine = this.history[this.historyIndex];
          this.clearCurrentLine();
          process.stdout.write(this.currentLine);
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
            this.clearCurrentLine();
            process.stdout.write(this.currentLine);
          } else if (suggestions.length > 1) {
            const match = suggestions.filter((s) => s.startsWith(this.currentLine));
            if (match.length === 1) {
              this.currentLine = match[0];
              this.clearCurrentLine();
              process.stdout.write(this.currentLine);
            }
          }
        }
      } else if (key?.name === 'c' && key.ctrl) {
        process.stdout.write(`${ESC}[K${ESC}[?25l`);
        this.onExit();
      }
    });
  }

  private clearCurrentLine(): void {
    process.stdout.write(`${CSI}G${ESC}[K`);
  }

  close(): void {
    this.rl.close();
  }
}
