# Sync Readme Command

The `sync-readme` command synchronizes external content from GitHub and other sources into your documentation project.

## Overview

This command downloads files from remote sources (primarily GitHub repositories) and saves them locally in your project. It supports both public and private repositories, handles MDX conversion, and provides fallback content when downloads fail.

## Usage

### Basic Usage

```bash
# Synchronize all configured sources
upsun-docs sync-readme

# Use custom config file
upsun-docs sync-readme --config custom-config.yaml
```

## Configuration

Sources are configured in `config.yaml`:

```yaml
sync:
  cacheDir: contents/snippets/.cache
  fallbackContentPath: contents/snippets/waiting/default.mdx
  sources:
    - url: https://raw.githubusercontent.com/org/repo/main/README.md
      output: readme.mdx
      private: false
    - url: https://raw.githubusercontent.com/org/private-repo/main/docs/guide.md
      output: guide.mdx
      private: true
```

### Configuration Options

- `sync.cacheDir` - Directory where downloaded files are saved
- `sync.fallbackContentPath` - Path to fallback content when download fails
- `sync.sources[]` - Array of sources to synchronize
  - `url` - Remote file URL (GitHub raw content URL)
  - `output` - Output filename in cache directory
  - `private` - Whether the repository is private (requires `GITHUB_TOKEN`)

## Arguments and Flags

### Flags

- `-c, --config <value>` - Path to the configuration file (default: `config.yaml`)

## Features

### Automatic MDX Conversion

The command automatically cleans Markdown content for MDX compatibility:

- Removes HTML comments (`<!-- -->`)
- Converts self-closing tags (`<br>` → `<br />`)
- Fixes horizontal rules (`<hr>` → `<hr />`)
- Ensures proper image tag formatting

### Private Repository Support

For private repositories:

1. Set the `GITHUB_TOKEN` environment variable
2. Mark the source as `private: true` in configuration
3. Ensure the token has appropriate read permissions

```bash
# Set GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# Or use .env file
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env
```

### Fallback Content

When a download fails, the command:

1. Logs the error with details
2. Creates the output file with fallback content
3. Continues processing remaining sources
4. Reports partial success in the summary

## Output

The command provides:

1. **Real-time progress** - Shows download status for each source
2. **File size information** - Displays downloaded content size in KB
3. **Summary statistics** - Success/failure counts
4. **Error details** - Failed sources with error messages

### Example Output

```
🔽 Downloading from https://raw.githubusercontent.com/org/repo/main/README.md
✅ Saved to readme.mdx
   size: 42.5 KB

🔽 Downloading from https://raw.githubusercontent.com/org/docs/main/guide.md
✅ Saved to guide.mdx
   size: 18.3 KB

ℹ️ Synchronization complete
   total: 2
   success: 2
   failed: 0

✅ All sources synchronized successfully
```

## Exit Codes

- `0` - All sources synchronized successfully or partial success
- `1` - All sources failed to synchronize

## Integration

### In npm scripts

The command is already integrated in `package.json`:

```json
{
  "scripts": {
    "cache:generate": "node ./bin/run.js sync-readme",
    "cache:all": "npm run cache:clear && npm run cache:generate && ..."
  }
}
```

### In CI/CD Pipelines

```yaml
# Example GitHub Actions workflow
- name: Sync external content
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run build && node ./bin/run.js sync-readme
```

## Common Use Cases

### Syncing Documentation from Multiple Repos

Keep documentation in sync with source repositories:

```yaml
sources:
  - url: https://raw.githubusercontent.com/org/api/main/README.md
    output: api-readme.mdx
    private: false
  - url: https://raw.githubusercontent.com/org/sdk/main/docs/guide.md
    output: sdk-guide.mdx
    private: false
```

### Private Repository Content

Access content from private repositories:

```yaml
sources:
  - url: https://raw.githubusercontent.com/org/internal-docs/main/guide.md
    output: internal-guide.mdx
    private: true
```

### Pre-build Content Sync

Ensure content is fresh before building:

```bash
# Run before starting dev server
npm run cache:generate
npm run start
```

## Error Handling

### Common Issues

1. **Missing GITHUB_TOKEN**
   - Error: `Some sources are private but GITHUB_TOKEN is not set`
   - Solution: Set `GITHUB_TOKEN` environment variable

2. **Invalid URL**
   - Error: `Failed to download: 404 Not Found`
   - Solution: Verify the URL points to raw content

3. **Network Issues**
   - Error: `Failed to download: ECONNREFUSED`
   - Solution: Check network connectivity and URL accessibility

4. **Permission Denied**
   - Error: `Failed to download: 403 Forbidden`
   - Solution: Verify token has read access to repository

### Graceful Degradation

The command uses fallback content when downloads fail, allowing the build process to continue even if some sources are temporarily unavailable.

## Tips

- Run `sync-readme` regularly to keep content fresh
- Use private sources for internal documentation
- Configure fallback content that guides users to report issues
- Include `sync-readme` in your pre-build scripts
- Set up automated runs in CI/CD to ensure content is always current

## See Also

- [Check MDX command](./check-mdx.md) - Validate synchronized MDX files
- [Logger utility](./logger.md) - Logging system used by commands
- [Configuration](./config.md) - Configuration file format and options
- [Download GitHub utility](https://github.com/Theosakamg/mintlify-docs/blob/main/src/utils/download_github.ts) - GitHub content downloader
