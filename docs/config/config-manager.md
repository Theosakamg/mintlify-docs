# Configuration Manager

The Configuration Manager provides centralized management of YAML-based configuration files with TypeScript support and environment variable substitution.

## Source Code

- [`src/config/config-manager.ts`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/config/config-manager.ts) - Core configuration manager
- [`src/config/config.ts`](https://github.com/Theosakamg/mintlify-docs/blob/main/src/config/config.ts) - Typed configuration accessor

## Features

- **Singleton Pattern**: Ensures single source of truth for configuration
- **TypeScript Support**: Fully typed configuration access
- **YAML Format**: Human-readable configuration files
- **Environment Variables**: Support for `${VAR_NAME}` substitution
- **Dot Notation**: Access nested values with `config.get('logger.level')`
- **Multiple Files**: Load and merge multiple configuration files
- **Hot Reload**: Load configuration dynamically at runtime

## Configuration Structure

### Complete Configuration Interface

```typescript
interface Config {
  logger: LoggerConfig;
  app: AppConfig;
  github: GithubConfig;
  sync: SyncConfig;
  check: CheckConfig;
}
```

### Logger Configuration

```typescript
interface LoggerConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint: boolean;
  enableEmojis: boolean;
}
```

### App Configuration

```typescript
interface AppConfig {
  name: string;
  version: string;  // Automatically read from package.json
  environment: 'development' | 'production' | 'test';
  folder: string;   // Base folder for content files
}
```

### GitHub Configuration

```typescript
interface GithubConfig {
  token: string;  // Supports ${GITHUB_TOKEN} from environment
}
```

### Sync Configuration

```typescript
interface SyncConfig {
  cacheDir: string;
  fallbackContentPath: string;
  sources: SyncSource[];
}

interface SyncSource {
  url: string;
  output: string;
  private: boolean;
}
```

### Check Configuration

```typescript
interface CheckConfig {
  validHeaderFields: string[];
  categories: CheckCategory[];
}

interface CheckCategory {
  name: string;
  pathPattern: string;  // Regex pattern as string
  requiredFields: string[];
  optionalFields: string[];
}
```

## Usage

### Basic TypeScript Usage

```typescript
import config from './config/config.js';

// Access configuration with full type safety
const logLevel = config.logger.level;          // Type: 'trace' | 'debug' | ...
const appName = config.app.name;               // Type: string
const environment = config.app.environment;    // Type: 'development' | 'production' | 'test'
const contentFolder = config.app.folder;       // Type: string

// Access GitHub configuration
const token = config.github.token;

// Access sync configuration
const cacheDir = config.sync.cacheDir;
const sources = config.sync.sources;

// Access check configuration
const validFields = config.check.validHeaderFields;
const categories = config.check.categories;
```

### Advanced Usage with Raw Config Manager

```typescript
import config from './config/config.js';

// Access raw config manager for custom keys
const customValue = config.raw.get('custom.key', 'default');
const hasCustomKey = config.raw.has('custom.key');

// Set custom values
config.raw.set('custom.key', 'value');

// Get all configuration
const allConfig = config.raw.getAll();
```

### Loading Configuration Files

Configuration is automatically loaded by the init hook, but you can load manually:

```typescript
import ConfigManager from './config/config-manager.js';

// Load single file
ConfigManager.load('config.yaml');

// Load environment variables from .env
ConfigManager.loadEnv('.env');

// Load multiple files (merged in order)
ConfigManager.loadMultiple(['config.yaml', 'config.local.yaml']);
```

## Configuration File Format

### Example config.yaml

```yaml
# Logger Configuration
logger:
  level: info
  prettyPrint: true
  enableEmojis: false

# Application Settings
app:
  name: upsun-docs
  environment: development
  folder: contents

# GitHub Configuration
github:
  # Supports environment variable substitution
  token: ${GITHUB_TOKEN}

# Sync Configuration
sync:
  cacheDir: contents/snippets/.cache
  fallbackContentPath: contents/snippets/common/notContent.mdx

  sources:
    - url: https://raw.githubusercontent.com/org/repo/main/README.md
      output: sdk/readme.mdx
      private: false

    - url: https://api.example.com/data.json
      output: api/data.json
      private: true

# Check Configuration
check:
  validHeaderFields:
    - title
    - description
    - icon
    - date
    - tag
    - rss

  categories:
    - name: articles
      pathPattern: ^articles/
      requiredFields:
        - title
        - date
      optionalFields:
        - description
        - tag

    - name: api
      pathPattern: ^api/
      requiredFields:
        - title
      optionalFields:
        - description
        - icon
```

## Environment Variables

The configuration manager supports environment variable substitution using the `${VAR_NAME}` syntax:

```yaml
github:
  token: ${GITHUB_TOKEN}

api:
  key: ${API_KEY}
  secret: ${API_SECRET}
```

### Loading Environment Variables

```typescript
import ConfigManager from './config/config-manager.js';

// Load from .env file
ConfigManager.loadEnv('.env');

// Now ${VAR_NAME} in config.yaml will be replaced
ConfigManager.load('config.yaml');
```

## Using in Commands

### Example: Check Header Command

```typescript
import config from '../../config/config.js';
import UpsunDocCommand from '../../base-command.js';

export default class CheckHeader extends UpsunDocCommand {
  public async run(): Promise<void> {
    const {args} = await this.parse(CheckHeader);

    // Use configured content folder as default
    const defaultPath = config.app.folder;
    const targetPath = args.path || defaultPath;

    // Use configuration values
    this.log(`Checking headers in: ${targetPath}`);
  }
}
```

### Example: Sync Command

```typescript
import config from '../config/config.js';

export default class SyncReadme extends UpsunDocCommand {
  public async run(): Promise<void> {
    // Get sync configuration
    const cacheDir = config.sync.cacheDir;
    const sources = config.sync.sources;
    const token = config.github.token;

    // Use configuration for sync operations
    for (const source of sources) {
      await this.downloadFile(source.url, source.output, token);
    }
  }
}
```

### Example: Check Header Command

```typescript
import config from '../../config/config.js';

export default class CheckHeader extends UpsunDocCommand {
  public async run(): Promise<void> {
    // Get check configuration
    const checkConfig = config.check;
    const validFields = new Set(checkConfig.validHeaderFields);

    // Compile regex patterns from config
    const categories = checkConfig.categories.map((cat) => ({
      ...cat,
      pathPattern: new RegExp(cat.pathPattern),
    }));

    // Use configuration for validation
    for (const field of Object.keys(frontmatter)) {
      if (!validFields.has(field)) {
        warnings.push(`Unknown field: ${field}`);
      }
    }
  }
}
```## API Reference

### ConfigManager Methods

- `load(filePath: string)` - Load configuration from YAML file
- `loadEnv(envPath?: string)` - Load environment variables from .env file
- `loadMultiple(filePaths: string[])` - Load and merge multiple files
- `get<T>(keyPath: string, defaultValue?: T)` - Get configuration value
- `set(keyPath: string, value: unknown)` - Set configuration value
- `has(keyPath: string)` - Check if key exists
- `getAll()` - Get all configuration
- `save(filePath?: string)` - Save configuration to YAML file
- `getVersionFromPackageJson()` - Get version from package.json

### TypedConfig Properties

- `config.logger` - Logger configuration
- `config.app` - Application configuration
- `config.github` - GitHub configuration
- `config.sync` - Sync configuration
- `config.raw` - Raw config manager instance

## Best Practices

1. **Use TypeScript Interface**: Access configuration through typed properties for type safety
2. **Environment Variables**: Use `${VAR_NAME}` for sensitive data, never commit secrets
3. **Default Values**: Always provide sensible defaults in the interface getters
4. **Single Source of Truth**: Use the singleton pattern, don't create multiple instances
5. **Validation**: Validate critical configuration values at application startup
6. **Documentation**: Keep configuration structure documented with comments

## Example: Full Application Setup

```typescript
import config from './config/config.js';
import ConfigManager from './config/config-manager.js';

async function initializeApp() {
  // Load environment variables
  ConfigManager.loadEnv('.env');

  // Load configuration files
  const env = process.env.NODE_ENV || 'development';
  const configFiles = ['config.yaml'];

  if (env === 'production') {
    configFiles.push('config.production.yaml');
  } else {
    configFiles.push('config.local.yaml');
  }

  ConfigManager.loadMultiple(configFiles);

  // Access typed configuration
  console.log('Starting', config.app.name, 'v' + config.app.version);
  console.log('Environment:', config.app.environment);
  console.log('Content folder:', config.app.folder);
  console.log('Log level:', config.logger.level);

  // Validate critical configuration
  if (!config.github.token) {
    throw new Error('GitHub token is required');
  }

  return config;
}
```
