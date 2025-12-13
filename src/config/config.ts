/**
 * Application configuration structure
 * Provides typed access to configuration values
 */

import ConfigManager, {Config as UpsunDocConfig} from './config-manager.js';

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint: boolean;
  enableEmojis: boolean;
}

/**
 * Application configuration
 */
interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  folder: string;
}

/**
 * GitHub configuration
 */
interface GithubConfig {
  token: string;
}

/**
 * Sync source configuration
 */
interface SyncSource {
  url: string;
  output: string;
  private: boolean;
}

/**
 * Sync configuration
 */
interface SyncConfig {
  cacheDir: string;
  fallbackContentPath: string;
  sources: SyncSource[];
}

/**
 * Complete configuration structure
 */
interface Config {
  logger: LoggerConfig;
  app: AppConfig;
  github: GithubConfig;
  sync: SyncConfig;
}

/**
 * Typed configuration accessor class
 */
class TypedConfig {
  private get manager(): UpsunDocConfig {
    return ConfigManager;
  }

  /**
   * Load configuration file
   * @param filePath - Path to YAML configuration file
   */
  load(filePath: string): void {
    this.manager.load(filePath);
  }

  /**
   * Load multiple configuration files
   * @param filePaths - Array of paths to YAML configuration files
   */
  loadMultiple(filePaths: string[]): void {
    this.manager.loadMultiple(filePaths);
  }

  /**
   * Get logger configuration
   */
  get logger(): LoggerConfig {
    return {
      level: this.manager.get<LoggerConfig['level']>('logger.level', 'info'),
      prettyPrint: this.manager.get<boolean>('logger.prettyPrint', true),
      enableEmojis: this.manager.get<boolean>('logger.enableEmojis', true),
    };
  }

  /**
   * Get application configuration
   */
  get app(): AppConfig {
    return {
      name: this.manager.get<string>('app.name', 'application'),
      version: this.manager.getVersionFromPackageJson(),
      environment: this.manager.get<AppConfig['environment']>('app.environment', 'development'),
      folder: this.manager.get<string>('app.folder', 'contents'),
    };
  }

  /**
   * Get GitHub configuration
   */
  get github(): GithubConfig {
    return {
      token: this.manager.get<string>('github.token', process.env.GITHUB_TOKEN || ''),
    };
  }

  /**
   * Get sync configuration
   */
  get sync(): SyncConfig {
    return {
      cacheDir: this.manager.get<string>('sync.cacheDir', 'contents/snippets/.cache'),
      fallbackContentPath: this.manager.get<string>(
        'sync.fallbackContentPath',
        'contents/snippets/common/notContent.mdx',
      ),
      sources: this.manager.get<SyncSource[]>('sync.sources', []),
    };
  }

  /**
   * Access to underlying config manager for advanced use
   */
  get raw(): UpsunDocConfig {
    return this.manager;
  }
}

// Create and export singleton instance
const typedConfig = new TypedConfig();
export default typedConfig;
export type {
  AppConfig, Config, GithubConfig, LoggerConfig, SyncConfig, SyncSource,
};
