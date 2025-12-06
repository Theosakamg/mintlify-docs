# Sync External README Files

This script synchronizes external README files from GitHub repositories into the documentation.

## Configuration

### Public Repositories

For public repositories, simply add them to the `SOURCES` array:

```javascript
{
  url: "https://raw.githubusercontent.com/org/repo/main/README.md",
  output: path.join(__dirname, "../snippets/sdk/readme.mdx"),
  private: false
}
```

### Private Repositories

For private repositories:

1. **Create a GitHub Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (Full control of private repositories)
   - Copy the generated token

2. **Set the environment variable:**
   ```bash
   export GITHUB_TOKEN=ghp_your_token_here
   ```

   Or add it to your `.env` file:
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   ```

3. **Configure the source:**
   ```javascript
   {
     url: "https://raw.githubusercontent.com/org/private-repo/main/README.md",
     output: path.join(__dirname, "../snippets/sdk/readme.mdx"),
     private: true  // Set to true
   }
   ```

## Usage

```bash
# Sync all sources
npm run cache:generate

# The script runs automatically before build/start
npm run build
npm start
```

## Security Notes

- **Never commit** your GitHub token to version control
- Add `.env` to `.gitignore`
- Use environment variables in CI/CD pipelines
- Rotate tokens regularly
- Use tokens with minimal required scopes
