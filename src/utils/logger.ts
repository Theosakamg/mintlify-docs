import pino, { type Logger as PinoLogger } from 'pino';
import config from '../config/config.js';

/**
 * Log level type
 */
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Logger initialization options
 */
interface LoggerOptions {
  level?: LogLevel;
  prettyPrint?: boolean;
  enableEmojis?: boolean;
}

/**
 * Logger levels with emoji indicators
 */
const LEVEL_EMOJIS: Record<LogLevel, string> = {
  trace: '🔍',
  debug: '🐛',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  fatal: '💀'
};

/**
 * Special event emojis
 */
const EVENT_EMOJIS = {
  success: '✅',
  failure: '❌',
  start: '🚀',
  stop: '🛑',
  download: '⬇️',
  upload: '⬆️',
  process: '⚙️',
  network: '🌐',
  database: '🗄️',
  file: '📄',
  folder: '📁',
  user: '👤',
  security: '🔒',
  time: '⏱️',
  checkmark: '✓',
  cross: '✗'
} as const;

/**
 * Logger facade class providing abstraction over Pino
 * Supports multiple verbosity levels and emoji-enhanced output
 * Each logger instance has its own context
 */
class Logger {
  /**
   * Shared pino configuration
   */
  private static pinoConfig: pino.LoggerOptions | null = null;

  /**
   * Pino logger instance
   */
  private pinoLogger: PinoLogger;

  /**
   * Logger context/name
   */
  private context: string;

  /**
   * Public constructor
   * @param context - Logger context (e.g., 'sync-readme', 'github-download')
   * @param options - Optional logger configuration options
   */
  constructor(context: string, options: LoggerOptions = {}) {
    if (!Logger.pinoConfig) {
      Logger.initializeConfig(options);
    }

    this.context = context;

    // Use synchronous stdout destination to ensure chronological ordering
    const destination = pino.destination({
      dest: 1, // stdout
      sync: true
    });

    this.pinoLogger = pino({
      ...Logger.pinoConfig,
      base: { context }
    }, destination);
  }

  /**
   * Initialize pino configuration (called once)
   * @param options - Logger configuration options
   */
  private static initializeConfig(options: LoggerOptions = {}): void {
    if (Logger.pinoConfig) {
      return;
    }

    // Load configuration - use defaults if config not yet loaded
    let configLogger;
    try {
      configLogger = config.logger;
    } catch {
      configLogger = { level: 'info' as LogLevel, prettyPrint: true, enableEmojis: true };
    }

    const level = options.level || configLogger.level;
    const prettyPrint = options.prettyPrint !== undefined
      ? options.prettyPrint
      : configLogger.prettyPrint;
    const enableEmojis = options.enableEmojis !== undefined
      ? options.enableEmojis
      : configLogger.enableEmojis;

    Logger.pinoConfig = {
      level,
      ...(prettyPrint && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,levelLabel,levelEmoji,emoji,context',
            messageFormat: enableEmojis
              ? '{levelEmoji} [{context}] {msg}'
              : '[{context}] {msg}',
            customColors: 'info:blue,warn:yellow,error:red,debug:gray',
            singleLine: true,
            sync: true
          }
        }
      }),
      formatters: prettyPrint ? {
        level: (label: string) => {
          return {
            levelEmoji: enableEmojis ? LEVEL_EMOJIS[label as LogLevel] || '' : ''
          };
        }
      } : undefined
    };
  }

  /**
   * Set logger level dynamically
   * @param level - Log level (trace, debug, info, warn, error, fatal)
   */
  setLevel(level: LogLevel): void {
    this.pinoLogger.level = level;
  }

  /**
   * Get current logger level
   * @returns Current log level
   */
  getLevel(): string {
    return this.pinoLogger.level;
  }

  /**
   * Log trace message
   * @param msg - Message or object to log
   * @param args - Additional arguments
   */
  trace(msg: string | object, ...args: any[]): void {
    this.pinoLogger.trace(msg, ...args);
  }

  /**
   * Log debug message
   * @param msg - Message or object to log
   * @param args - Additional arguments
   */
  debug(msg: string | object, ...args: any[]): void {
    this.pinoLogger.debug(msg, ...args);
  }

  /**
   * Log info message
   * @param msg - Message or object to log
   * @param args - Additional arguments
   */
  info(msg: string | object, ...args: any[]): void {
    this.pinoLogger.info(msg, ...args);
  }

  /**
   * Log warning message
   * @param msg - Message or object to log
   * @param args - Additional arguments
   */
  warn(msg: string | object, ...args: any[]): void {
    this.pinoLogger.warn(msg, ...args);
  }

  /**
   * Log error message
   * @param msg - Message or object to log
   * @param args - Additional arguments
   */
  error(msg: string | object, ...args: any[]): void {
    this.pinoLogger.error(msg, ...args);
  }

  /**
   * Log fatal message
   * @param msg - Message or object to log
   * @param args - Additional arguments
   */
  fatal(msg: string | object, ...args: any[]): void {
    this.pinoLogger.fatal(msg, ...args);
  }

  /**
   * Log success message with emoji
   * @param msg - Success message
   * @param data - Additional data to log
   */
  success(msg: string, data: Record<string, unknown> = {}): void {
    this.pinoLogger.info({ ...data, emoji: EVENT_EMOJIS.success }, `${EVENT_EMOJIS.success} ${msg}`);
  }

  /**
   * Log failure message with emoji
   * @param msg - Failure message
   * @param data - Additional data to log
   */
  failure(msg: string, data: Record<string, unknown> = {}): void {
    this.pinoLogger.error({ ...data, emoji: EVENT_EMOJIS.failure }, `${EVENT_EMOJIS.failure} ${msg}`);
  }

  /**
   * Log start event with emoji
   * @param msg - Start message
   * @param data - Additional data to log
   */
  start(msg: string, data: Record<string, unknown> = {}): void {
    this.pinoLogger.info({ ...data, emoji: EVENT_EMOJIS.start }, `${EVENT_EMOJIS.start} ${msg}`);
  }

  /**
   * Log stop event with emoji
   * @param msg - Stop message
   * @param data - Additional data to log
   */
  stop(msg: string, data: Record<string, unknown> = {}): void {
    this.pinoLogger.info({ ...data, emoji: EVENT_EMOJIS.stop }, `${EVENT_EMOJIS.stop} ${msg}`);
  }

  /**
   * Log download event with emoji
   * @param msg - Download message
   * @param data - Additional data to log (e.g., { file: 'example.zip', size: '10MB' })
   */
  download(msg: string, data: Record<string, unknown> = {}): void {
    this.pinoLogger.info({ ...data, emoji: EVENT_EMOJIS.download }, `${msg}`);
  }

  /**
   * Log upload event with emoji
   * @param msg - Upload message
   * @param data - Additional data to log
   */
  upload(msg: string, data: Record<string, unknown> = {}): void {
    this.pinoLogger.info({ ...data, emoji: EVENT_EMOJIS.upload }, `${msg}`);
  }

  /**
   * Log with custom emoji
   * @param emoji - Custom emoji
   * @param msg - Message
   * @param level - Log level (default: 'info')
   * @param data - Additional data to log
   */
  withEmoji(emoji: string, msg: string, level: LogLevel = 'info', data: Record<string, unknown> = {}): void {
    this.pinoLogger[level]({ ...data, emoji }, `${emoji} ${msg}`);
  }



  /**
   * Get logger context
   * @returns Logger context
   */
  getContext(): string {
    return this.context;
  }

  /**
   * Measure execution time of a function
   * @param label - Label for the operation
   * @param fn - Function to execute
   * @returns Result of the function
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.debug(`⏱️  Starting: ${label}`);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`⏱️  Completed: ${label} (${duration}ms)`, { duration, label });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);
      this.error(`⏱️  Failed: ${label} (${duration}ms)`, { duration, label, error: message });
      throw error;
    }
  }

  /**
   * Get available event emojis
   * @returns Event emojis mapping
   */
  static getEventEmojis(): typeof EVENT_EMOJIS {
    return { ...EVENT_EMOJIS };
  }
}

export default Logger;
