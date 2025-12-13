import dotenv from 'dotenv';
import {dump, load} from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

import Logger from '../utils/logger.js';

/**
 * Type for configuration object (can be deeply nested)
 */
type ConfigData = Record<string, unknown>;

/**
 * Configuration utility class for managing YAML-based configuration files
 * Provides singleton pattern to ensure single source of truth for configuration
 */
class Config {
  /**
   * Singleton instance
   */
  private static instance: Config | null = null;
  /**
   * Configuration data
   */
  private config: ConfigData = {};
  /**
   * Default configuration file path
   */
  private configPath: string | null = null;
  private _logger: Logger | null = null;

  private get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger('config-manager');
    }

    return this._logger;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    if (Config.instance) {
      // eslint-disable-next-line no-constructor-return
      return Config.instance;
    }

    Config.instance = this;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    return Config.instance;
  }

  /**
   * Replace environment variables in string
   * @param str - String with ${VAR_NAME} placeholders
   * @returns String with replaced values
   */
  private replaceEnvVars(str: string): string {
    return str.replaceAll(/\$\{([^}]+)\}/g, (match, varName) => process.env[varName] || match);
  }

  /**
   * Recursively replace environment variables in config object
   * @param obj - Configuration object
   * @returns Object with replaced environment variables
   */
  private processEnvVars(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.replaceEnvVars(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processEnvVars(item));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processEnvVars(value);
      }

      return result;
    }

    return obj;
  }

  /**
   * Load configuration from YAML file
   * @param filePath - Path to the YAML configuration file
   * @returns Config instance for chaining
   * @throws Error if file cannot be read or parsed
   */
  load(filePath: string): Config {
    try {
      // Load environment variables from .env file
      this.logger.info('Loading configuration from environement variables file (.env)');
      dotenv.config({quiet: true});

      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

      let fileContent: string;
      try {
        this.logger.info(`Reading configuration file from ${absolutePath}`);
        fileContent = fs.readFileSync(absolutePath, 'utf8');
      } catch {
        throw new Error(`Configuration file not found: ${absolutePath}`);
      }

      const rawConfig = (load(fileContent) as ConfigData) || {};

      // Process environment variables in configuration
      this.config = this.processEnvVars(rawConfig) as ConfigData;
      this.configPath = absolutePath;

      return this;
    } catch (error) {
      if (error instanceof Error && error.name === 'YAMLException') {
        throw new Error(`Invalid YAML in configuration file: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Load configuration from multiple YAML files (merged in order)
   * @param filePaths - Array of paths to YAML configuration files
   * @returns Config instance for chaining
   */
  loadMultiple(filePaths: string[]): Config {
    this.config = {};

    for (const filePath of filePaths) {
      try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

        try {
          const fileContent = fs.readFileSync(absolutePath, 'utf8');
          const partialConfig = (load(fileContent) as ConfigData) || {};
          this.config = this.deepMerge(this.config, partialConfig);
        } catch {
          // File doesn't exist or can't be read, skip it
        }
      } catch (error) {
        // Continue with other files if one fails
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not load config file ${filePath}: ${message}`);
      }
    }

    return this;
  }

  /**
   * Get configuration value by key path (supports nested keys with dot notation)
   * @param keyPath - Key path (e.g., 'logger.level' or 'database.host')
   * @param defaultValue - Default value if key not found
   * @returns Configuration value
   *
   * @example
   * config.get('logger.level', 'info');
   * config.get('database.host', 'localhost');
   */
  get<T>(keyPath: string, defaultValue: T): T;
  get<T>(keyPath: string, defaultValue?: T): T | undefined;
  get<T>(keyPath: string, defaultValue?: T): T | undefined {
    const keys = keyPath.split('.');
    let value: unknown = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }

    return value as T;
  }

  /**
   * Set configuration value by key path
   * @param keyPath - Key path (e.g., 'logger.level')
   * @param value - Value to set
   * @returns Config instance for chaining
   */
  set(keyPath: string, value: unknown): Config {
    const keys = keyPath.split('.');
    let current: ConfigData = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }

      current = current[key] as ConfigData;
    }

    const lastKey = keys.at(-1)!;
    current[lastKey] = value;
    return this;
  }

  /**
   * Check if configuration key exists
   * @param keyPath - Key path to check
   * @returns True if key exists
   */
  has(keyPath: string): boolean {
    const keys = keyPath.split('.');
    let value: unknown = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all configuration as object
   * @returns Complete configuration object
   */
  getAll(): ConfigData {
    return {...this.config};
  }

  /**
   * Get configuration file path
   * @returns Path to loaded configuration file
   */
  getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * Save current configuration to YAML file
   * @param filePath - Path where to save the configuration
   * @returns Config instance for chaining
   */
  save(filePath: string | null = null): Config {
    const targetPath = filePath || this.configPath;

    if (!targetPath) {
      throw new Error('No file path specified and no default path available');
    }

    const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);

    const yamlContent = dump(this.config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    fs.writeFileSync(absolutePath, yamlContent, 'utf8');

    if (!filePath) {
      this.configPath = absolutePath;
    }

    return this;
  }

  /**
   * Reset configuration to empty state
   * @returns Config instance for chaining
   */
  reset(): Config {
    this.config = {};
    this.configPath = null;
    return this;
  }

  /**
   * Deep merge two objects
   * @param target - Target object
   * @param source - Source object
   * @returns Merged object
   */
  private deepMerge(target: ConfigData, source: ConfigData): ConfigData {
    const result: ConfigData = {...target};

    for (const key in source) {
      if (Object.hasOwn(source, key)) {
        result[key] = source[key] instanceof Object
          && !Array.isArray(source[key])
          && key in target
          && target[key] instanceof Object
          && !Array.isArray(target[key])
          ? this.deepMerge(target[key] as ConfigData, source[key] as ConfigData)
          : source[key];
      }
    }

    return result;
  }

  /**
   * Get version from package.json
   * @param packageJsonPath - Optional path to package.json (defaults to project root)
   * @returns Version string from package.json or '0.0.0' if not found
   */
  getVersionFromPackageJson(packageJsonPath?: string): string {
    try {
      const targetPath = packageJsonPath || path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      return packageJson.version || '0.0.0';
    } catch {
      this.logger.warn('Could not read version from package.json, using default 0.0.0');
      return '0.0.0';
    }
  }
}

// Export class and singleton instance
export {Config};
export default Config.getInstance();
