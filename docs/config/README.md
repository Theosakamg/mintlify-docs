# Configuration Documentation

Documentation for the configuration system in upsun-docs.

## Files

- [config-manager.md](./config-manager.md) - Complete configuration manager documentation with TypeScript examples
- [../utils/config.md](../utils/config.md) - Legacy JavaScript configuration utility documentation

## Quick Reference

### TypeScript Configuration Access

```typescript
import config from './config/config.js';

// Typed access to configuration
config.logger.level      // 'info' | 'debug' | ...
config.app.name          // string
config.app.folder        // string ('contents')
config.github.token      // string
config.sync.cacheDir     // string
```

### Configuration File Structure

```yaml
logger:
  level: info
  prettyPrint: true
  enableEmojis: false

app:
  name: upsun-docs
  environment: development
  folder: contents

github:
  token: ${GITHUB_TOKEN}

sync:
  cacheDir: contents/snippets/.cache
  fallbackContentPath: contents/snippets/common/notContent.mdx
  sources: [...]
```

## See Also

- [Logger Documentation](../utils/logger.md)
- [Command Documentation](../commands/)
