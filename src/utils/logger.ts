export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const DEFAULT_LEVEL: LogLevel = 'info';

export class Logger {
  private prefix: string;
  private level: LogLevel;

  constructor(prefix: string, level: LogLevel = DEFAULT_LEVEL) {
    this.prefix = prefix;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  trace(message: string, ...args: unknown[]): void {
    this.log('trace', message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[level] > LOG_LEVELS[this.level]) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}] ${message} ${args.length ? JSON.stringify(args) : ''}`;

    const colors: Record<LogLevel, string> = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[32m',
      debug: '\x1b[36m',
      trace: '\x1b[90m',
    };
    const reset = '\x1b[0m';

    if (level === 'error' || level === 'warn') {
      console.error(`${colors[level]}${logEntry}${reset}`);
    } else if (level === 'info') {
      console.log(`${colors[level]}${logEntry}${reset}`);
    } else {
      console.debug(logEntry);
    }
  }
}

export const logger = new Logger('nexus');
