# Utilities Documentation

This section provides documentation for the utility modules available in the project.

## Available Utilities

- **[Configuration](./utils/config.md)** - YAML-based configuration management
- **[Logger](./utils/logger.md)** - Modern logging with Pino, emojis, and colors

## Available Commands

- **[Check MDX](./commands/check-mdx.md)** - Validate MDX files for syntax errors
- **[Sync Readme](./commands/sync-readme.md)** - Synchronize external content from GitHub

## Getting Started

All utilities are located in the `src/utils/` directory and follow these principles:

1. **Singleton pattern** for shared state management
2. **Clean abstraction** over third-party libraries
3. **TypeScript-ready** with JSDoc comments
4. **Production-ready** with environment-specific configurations

## Quick Start

```javascript
// Load configuration
const config = require('./src/utils/config');
config.load('config.yaml');

// Use logger
const Logger = require('./src/utils/logger');
const logger = Logger.getLogger();

logger.info('Application started');
logger.success('Operation completed');
```

## Best Practices

1. **Use sub-loggers** for different modules
2. **Reference configuration** instead of hardcoding values
3. **Add context** to log messages with objects
4. **Configure by environment** (dev vs production)

## Contributing

When adding new utilities:

1. Follow the singleton pattern where appropriate
2. Add comprehensive JSDoc comments
3. Create documentation in this folder
4. Add examples and best practices
5. Reference source code instead of duplicating definitions
