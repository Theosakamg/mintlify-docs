import {Hook, Parser} from '@oclif/core';
import path from 'node:path';

import {globalFlags} from '../../config.js';
import config from '../../config/config.js';
import Logger from '../../utils/logger.js';

const hook: Hook<'init'> = async function (_options) {
  try {
    // Parse command-line arguments to extract config path using oclif parser
    let customConfigPath: string | undefined;

    try {
      const parsed = await Parser.parse(_options.argv, {
        flags: globalFlags,
        strict: false, // Allow other flags and args to pass through
      });

      customConfigPath = parsed.flags.config;
    } catch {
      // Ignore parsing errors, fall back to default config
    }

    // Load configuration from custom path or default config.yaml
    // Support both absolute and relative paths
    // Note: Command-specific config flags should be handled in the command's run() method
    const configPath = customConfigPath
      ? path.isAbsolute(customConfigPath)
        ? customConfigPath
        : path.resolve(process.cwd(), customConfigPath)
      : path.resolve(process.cwd(), 'config.yaml');

    config.load(configPath);

    // Create main application logger
    const logger = new Logger('app');

    // Log application startup
    logger.start(`Starting ${config.app.name} v${config.app.version}`);
    logger.info(`Environment: ${config.app.environment}`);
    logger.info(`Log level: ${logger.getLevel()}`);

    logger.success('Application initialized successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to initialize application: ${message}\n`);
  }
};

export default hook;
