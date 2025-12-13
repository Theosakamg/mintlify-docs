# Configuration Utility

The Configuration utility provides centralized management of YAML-based configuration files using a singleton pattern.

## Source Code

[`src/utils/config.js`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js)

## Features

- Singleton pattern for centralized configuration
- YAML file format support
- Dot notation for nested values (`config.get('logger.level')`)
- Multiple file merging
- Save/load configuration dynamically

## Basic Usage

### Loading Configuration

```javascript
const config = require('./src/utils/config');

// Load single file
config.load('config.yaml');

// Load multiple files (merged in order)
config.loadMultiple(['config.yaml', 'config.local.yaml', 'config.production.yaml']);
```

### Accessing Values

```javascript
// Get value with default
const logLevel = config.get('logger.level', 'info');

// Get nested value
const dbHost = config.get('database.host', 'localhost');

// Check if key exists
if (config.has('api.baseUrl')) {
  const apiUrl = config.get('api.baseUrl');
}

// Get all configuration
const allConfig = config.getAll();
```

### Modifying Configuration

```javascript
// Set value
config.set('logger.level', 'debug');

// Set nested value
config.set('api.timeout', 10000);

// Chaining
config.set('app.name', 'my-app').set('app.version', '2.0.0');
```

### Saving Configuration

```javascript
// Save to original file
config.save();

// Save to new file
config.save('config.backup.yaml');
```

## API Reference

See the complete API in the source code:

- [`load(filePath)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js#L43-L65) - Load configuration from file
- [`loadMultiple(filePaths)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js#L67-L89) - Load and merge multiple files
- [`get(keyPath, defaultValue)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js#L91-L110) - Get configuration value
- [`set(keyPath, value)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js#L112-L129) - Set configuration value
- [`has(keyPath)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js#L131-L146) - Check if key exists
- [`save(filePath)`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/config.js#L163-L184) - Save configuration to file

## Configuration File Example

```yaml
# config.yaml
logger:
  level: info
  prettyPrint: true
  enableEmojis: true

app:
  name: my-application
  # Note: version is automatically read from package.json
  environment: development

database:
  host: localhost
  port: 5432
  name: mydb
```

## Environment-Specific Configuration

```javascript
const env = process.env.NODE_ENV || 'development';
const configFile = env === 'production' ? 'config.production.yaml' : 'config.yaml';

config.load(configFile);
```

## Best Practices

1. **Use dot notation** for cleaner access to nested values
2. **Provide defaults** when getting values to prevent undefined errors
3. **Environment-specific files** for different deployment targets
4. **Don't commit sensitive data** in config files (use environment variables)
5. **Validate configuration** at startup to catch errors early

## Example: Complete Application Setup

```javascript
const config = require('./src/utils/config');

// Load configuration based on environment
const configFiles = ['config.yaml'];
if (process.env.NODE_ENV === 'production') {
  configFiles.push('config.production.yaml');
} else if (process.env.NODE_ENV === 'development') {
  configFiles.push('config.local.yaml');
}

config.loadMultiple(configFiles);

// Use configuration throughout application
const appName = config.get('app.name');
const appPort = config.get('app.port', 3000);
const dbConfig = {
  host: config.get('database.host', 'localhost'),
  port: config.get('database.port', 5432),
  database: config.get('database.name', 'mydb'),
};

console.log(`Starting ${appName} on port ${appPort}`);
```
