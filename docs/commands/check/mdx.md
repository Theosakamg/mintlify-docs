# Check MDX Command

The `check-mdx` command validates MDX files for syntax errors throughout your documentation project.

## Overview

This command recursively scans directories or validates individual MDX files to ensure they compile correctly. It uses the official `@mdx-js/mdx` compiler to detect syntax errors, unclosed tags, and other MDX-specific issues.

## Usage

### Basic Usage

```bash
# Validate all MDX files in the default 'contents' directory
upsun-docs check-mdx

# Validate a specific directory
upsun-docs check-mdx contents/ai

# Validate a single file
upsun-docs check-mdx contents/articles/ai.mdx
```

### Using Flags

```bash
# Specify path with --path flag
upsun-docs check-mdx --path contents/api

# Use custom config file
upsun-docs check-mdx --config custom-config.yaml
```

## Arguments and Flags

### Arguments

- `[TARGET]` - Optional path to MDX file or directory to validate (alternative to `--path` flag)

### Flags

- `-p, --path <value>` - Path to MDX file or directory to validate (default: `contents`)
- `-c, --config <value>` - Path to the configuration file

## Output

The command provides:

1. **Real-time progress** - Shows validation status for each file as it's processed
2. **Summary statistics** - Total files, valid files, and error count
3. **Detailed error reports** - For files with errors, includes:
   - File path
   - Line and column numbers
   - Error message
   - Position information

### Example Output

```
✅ contents/ai/claude-code.mdx
✅ contents/ai/cursor.mdx
❌ contents/articles/broken.mdx

============================================================
📊 Validation Summary:
   Total files: 3
   Valid: 2 ✅
   Errors: 1 ❌
============================================================

❌ ERRORS DETECTED:

1. contents/articles/broken.mdx
   Line: 15, Column: 38
   Error: Expected a closing tag for `<div>` (15:38-15:43) before the end of `paragraph`
```

## Exit Codes

- `0` - All files are valid
- `1` - One or more files have errors or validation failed

## Integration

### In npm scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "check:mdx": "upsun-docs check-mdx contents",
    "check:mdx:ai": "upsun-docs check-mdx contents/ai"
  }
}
```

### In CI/CD Pipelines

```yaml
# Example GitHub Actions workflow
- name: Validate MDX files
  run: npm run build && node ./bin/run.js check-mdx
```

## Common Use Cases

### Pre-commit Validation

Validate MDX files before committing changes:

```bash
upsun-docs check-mdx contents/
```

### Focused Directory Validation

Check only specific sections of your documentation:

```bash
# Check API documentation
upsun-docs check-mdx contents/api

# Check articles
upsun-docs check-mdx contents/articles
```

### Single File Debugging

Quickly validate a specific file you're working on:

```bash
upsun-docs check-mdx contents/articles/new-feature.mdx
```

## Error Types

Common errors detected by the command:

1. **Unclosed HTML tags** - `<div>` without `</div>`
2. **Invalid JSX syntax** - Malformed component usage
3. **Unescaped special characters** - Characters that need escaping in MDX
4. **Invalid frontmatter** - YAML syntax errors in frontmatter
5. **Import/export errors** - Invalid JavaScript imports or exports

## Tips

- Run `check-mdx` regularly during development to catch errors early
- Use it as part of your CI/CD pipeline to prevent deploying broken documentation
- For large projects, validate specific directories to speed up the process
- Check individual files when debugging specific issues

## See Also

- [sync-readme command](./sync-readme.md) - Synchronize external content
- [Logger utility](./logger.md) - Logging system used by commands
- [Configuration](./config.md) - Global configuration options
