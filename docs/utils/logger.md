# Logger Utility

The Logger utility provides a modern logging facade on top of Pino with colorful output, emoji support, and context-based sub-loggers.

## Source Code

[`src/utils/logger.js`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js)

## Features

- Built on top of [Pino](https://getpino.io/) - fast JSON logger
- 6 log levels with emoji indicators
- Colorful console output with `pino-pretty`
- Sub-loggers for module-specific contexts
- Special methods for common events (success, failure, download, etc.)
- Performance measurement with `time()` method
- Automatic configuration from YAML

## Basic Usage

### Initialization (Application Startup)

The logger is a **singleton** - initialize it **once** at application startup:

```javascript
// app.js or index.js (entry point)
const Logger = require('./src/utils/logger');
const config = require('./src/utils/config');

// Load configuration once at startup
config.load('config.yaml');

// Logger auto-initializes from config
// OR manually initialize with custom options:
Logger.initialize({
  level: config.get('logger.level', 'info'),
  prettyPrint: config.get('logger.prettyPrint', true),
  enableEmojis: config.get('logger.enableEmojis', true)
});
```

### Using Logger in Modules

After initialization, **no need to reload** - just use it directly:

```javascript
// any-module.js
const Logger = require('./src/utils/logger');

// Simply get the logger (already initialized)
const logger = Logger.getLogger();

logger.info('Application started');
logger.success('Operation completed');
logger.error('Something went wrong', { error: err.message });
```

### Creating Module-Specific Loggers

```javascript
// database.js
const Logger = require('./src/utils/logger');

// Create a child logger with context (no initialization needed)
const logger = Logger.child('database');

logger.info('Connected'); // Output: [database] Connected
```

## Log Levels

The logger supports 6 verbosity levels (from most detailed to most critical):

```javascript
const logger = Logger.getLogger();

logger.trace('Internal technical details');     // 🔍 TRACE
logger.debug('Variable value:', { userId: 123 }); // 🐛 DEBUG
logger.info('Service started on port 3000');     // ℹ️ INFO
logger.warn('Deprecated API used');              // ⚠️ WARN
logger.error('Database connection failed');      // ❌ ERROR
logger.fatal('Fatal error, stopping application'); // 💀 FATAL
```

See emoji definitions in source:
- [Level emojis](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L4-L11)
- [Event emojis](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L16-L32)

### Change Level Dynamically

```javascript
// Get current level
console.log(logger.getLevel()); // 'info'

// Change level
logger.setLevel('debug');
```

## Sub-Loggers

Create contextual loggers for different modules:

```javascript
const Logger = require('./src/utils/logger');

// Create module-specific loggers
const dbLogger = Logger.child('database');
const apiLogger = Logger.child('api', { version: '1.0' });
const syncLogger = Logger.child('sync');

dbLogger.info('Connection established');  // [database] Connection established
apiLogger.info('Request received');       // [api] Request received
syncLogger.info('Sync completed');        // [sync] Sync completed
```

### Nested Sub-Loggers

```javascript
const dbLogger = Logger.child('database');
const queryLogger = dbLogger.child('query');

queryLogger.debug('SELECT * FROM users'); // [database:query] SELECT * FROM users
```

## Special Methods with Emojis

The logger provides convenience methods for common events:

```javascript
const logger = Logger.getLogger();

// Success/Failure
logger.success('Operation successful');
logger.failure('Operation failed');

// Start/Stop
logger.start('Starting service');
logger.stop('Stopping service');

// Download/Upload
logger.download('Downloading file.zip', { size: '2.5MB' });
logger.upload('Uploading to S3', { destination: 's3://bucket/file' });

// Custom emoji
logger.withEmoji('🎉', 'Celebration!', 'info');
```

See all available methods:
- [`success(msg, data)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L186-L192)
- [`failure(msg, data)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L194-L200)
- [`start(msg, data)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L202-L208)
- [`stop(msg, data)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L210-L216)
- [`download(msg, data)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L218-L224)
- [`upload(msg, data)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L226-L232)

## Performance Measurement

Measure execution time automatically:

```javascript
const logger = Logger.getLogger();

// Measure async function
await logger.time('Database query', async () => {
  const results = await db.query('SELECT * FROM users');
  return results;
});
// Output: ⏱️ Completed: Database query (150ms)

// Automatic error handling
try {
  await logger.time('Risky operation', async () => {
    throw new Error('Something went wrong');
  });
} catch (error) {
  // Output: ⏱️ Failed: Risky operation (50ms)
  // Error is re-thrown
}
```

## Configuration

The logger reads configuration from `config.yaml`:

```yaml
logger:
  level: info           # trace, debug, info, warn, error, fatal
  prettyPrint: true     # Use pino-pretty for colored output
  enableEmojis: true    # Enable emoji indicators
```

### Production Configuration

```yaml
logger:
  level: warn
  prettyPrint: false    # JSON output for log aggregation
  enableEmojis: false
```

## Complete Examples

### Example 1: Module-Specific Loggers

```javascript
const Logger = require('./src/utils/logger');

class DatabaseService {
  constructor() {
    this.logger = Logger.child('database');
  }

  async connect() {
    this.logger.start('Connecting to database');

    try {
      // Connection logic
      this.logger.success('Database connected');
    } catch (error) {
      this.logger.failure('Connection failed', { error: error.message });
      throw error;
    }
  }
}

class ApiService {
  constructor() {
    this.logger = Logger.child('api');
  }

  handleRequest(req) {
    this.logger.info('Request received', {
      method: req.method,
      path: req.path
    });
  }
}
```

### Example 2: Download Script

```javascript
// downloader.js (no need to load config here, already loaded at startup)
const Logger = require('./src/utils/logger');

// Just create child logger
const downloadLogger = Logger.child('downloader');

async function downloadFile(url, destination) {
  downloadLogger.start(`Downloading from ${url}`);

  try {
    await downloadLogger.time('Download operation', async () => {
      downloadLogger.debug('Connecting to server...', { url });
      // Download logic here
      downloadLogger.download('Download in progress...', { url, destination });
    });

    downloadLogger.success('File downloaded successfully', { destination });
    return true;
  } catch (error) {
    downloadLogger.failure('Download failed', { url, error: error.message });
    return false;
  }
}
```

### Example 3: Error Handling

```javascript
const Logger = require('./src/utils/logger');
const logger = Logger.child('error-handler');

async function riskyOperation() {
  try {
    logger.debug('Starting risky operation');
    // Operation logic

  } catch (error) {
    logger.error('Error caught', {
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });

    logger.failure('Operation failed');
    throw error;
  }
}
```

## API Reference

See complete API in source code:
- [`initialize(options)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L50-L94) - Initialize root logger
- [`getLogger()`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L96-L102) - Get root logger instance
- [`child(name, bindings)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L104-L127) - Create sub-logger
- [`time(label, fn)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/logger.js#L249-L266) - Measure execution time

## Best Practices

1. **Create sub-loggers per module** - Facilitates debugging and filtering
2. **Use appropriate log levels** - `debug` for dev, `info` for events, `error` for errors
3. **Add context objects** - Include relevant details in log data
4. **Measure performance** - Use `logger.time()` for long operations
5. **Use emoji methods** - Makes logs more readable and easier to scan
6. **Configure by environment** - Less verbose in production, detailed in development

## Related

- [Configuration documentation](./config.md)
- [Pino documentation](https://getpino.io/)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
