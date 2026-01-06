# Migration Commands

This directory contains migration commands that help transform documentation files from one format to another.

## Overview

All migration commands extend [`BaseMigrateCommand`](./base-migrate-command.md) which provides:
- Recursive scanning of `.md` and `.mdx` files
- Automatic frontmatter extraction and parsing
- Consistent logging and error handling
- Unified summary display

## Available Commands

### [`migrate:layout-to-mode`](./layout-to-mode.md)
Migrates the `layout` property to `mode` in YAML frontmatter.

**Mapping:**
- `layout: single` → `mode: single`
- `layout: <other>` → `mode: custom`

**Example:**
```bash
upsun-docs migrate:layout-to-mode
upsun-docs migrate:layout-to-mode --path contents/docs
```

### `migrate:replace-vendor-name`
Replaces Hugo shortcodes `{{% vendor/name %}}` with Mintlify ConfigValue component.

**Transformation:**
- `{{% vendor/name %}}` → `<ConfigValue key="vendorName" />`

**Example:**
```bash
upsun-docs migrate:replace-vendor-name
```

### `migrate:replace-vendor-urlraw`
Replaces Hugo shortcodes `{{< vendor/urlraw "discord" >}}` with Mintlify ConfigValue component.

**Transformation:**
- `{{< vendor/urlraw "discord" >}}` → `<ConfigValue key="vendor.discord.url" />`

**Example:**
```bash
upsun-docs migrate:replace-vendor-urlraw
```

## Common Flags

All migration commands support:

- `--path <value>` or `-p <value>` - Directory to scan (default: `contents`)
- `--config <value>` or `-c <value>` - Config file path (default: `config.yaml`)

## Output Format

All commands produce consistent output:

```
ℹ Starting <migration description>
ℹ Scanning path: contents
ℹ Found 50 markdown files to check
📝 Processing: path/to/file.md
   <Detail 1>: <value>
   <Detail 2>: <value>
✅ <Success message>
============================================================
🔄 <Migration Name> Summary:
   Files processed: 1
   Files skipped: 49
   Total changes: 1
============================================================
✅ Migration completed successfully!
```

## Code Statistics

After refactoring with `BaseMigrateCommand`:

| File | Lines | Description |
|------|-------|-------------|
| `base-migrate-command.ts` | 327 | Base class (shared) |
| `layout-to-mode.ts` | 64 | Layout migration |
| `replace-vendor-name.ts` | 53 | Vendor name replacement |
| `replace-vendor-urlraw.ts` | 57 | Vendor URL replacement |
| **Total** | **501** | All migration code |

**Benefits:**
- ✅ ~70% code reduction per command (from ~150 lines to ~50 lines)
- ✅ Consistent behavior across all migrations
- ✅ Easy to add new migrations
- ✅ Better maintainability

## Creating New Migrations

To create a new migration command:

1. Create a new file extending `BaseMigrateCommand`
2. Implement the required abstract methods
3. Add your specific migration logic in `processFile()`

**Example:**
```typescript
import { BaseMigrateCommand, FileProcessingResult, FrontmatterData } from './base-migrate-command.js';

export default class MyMigration extends BaseMigrateCommand {
  static override description = 'My migration description';
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:my-migration';
  }

  protected getMigrationDescription(): string {
    return 'Starting my migration';
  }

  protected processFile(
    filePath: string,
    content: string,
    frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Your migration logic
    if (!needsChanges) {
      return { modified: false };
    }

    return {
      modified: true,
      newContent: transformedContent,
      message: 'Migration successful',
      details: {
        'Changed': 'something',
      },
    };
  }
}
```

See [`base-migrate-command.md`](./base-migrate-command.md) for detailed documentation.

## Best Practices

1. **Test with `--path` first** to limit scope
2. **Always check for patterns** before processing
3. **Provide detailed logs** with `details` object
4. **Handle edge cases** gracefully
5. **Use meaningful messages** for user feedback

## Related

- [Base Command Documentation](../../base-command.md)
- [Logger Documentation](../../utils/logger.md)
- [Configuration System](../../config/config.md)
