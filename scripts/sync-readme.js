#!/usr/bin/env node

import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const CACHE_DIR = path.join(__dirname, "../contents/snippets/.cache");
const FALLBACK_CONTENT_PATH = path.join(__dirname, "../contents/snippets/common/notContent.mdx");

// GitHub Personal Access Token (from environment variable)
// Create one at: https://github.com/settings/tokens
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const SOURCES = [
  {
    url: "https://raw.githubusercontent.com/upsun/upsun-sdk-php/main/README.md",
    output: path.join(CACHE_DIR, "sdk/php-readme.mdx"),
    private: false
  },
  {
    url: "https://raw.githubusercontent.com/upsun/upsun-sdk-node/main/README.md",
    output: path.join(CACHE_DIR, "sdk/js-readme.mdx"),
    private: true
  },
  {
    url: "https://raw.githubusercontent.com/upsun/upsun-sdk-python/main/README.md",
    output: path.join(CACHE_DIR, "sdk/python-readme.mdx"),
    private: true
  },
  {
    url: "https://raw.githubusercontent.com/upsun/upsun-sdk-go/main/README.md",
    output: path.join(CACHE_DIR, "sdk/go-readme.mdx"),
    private: true
  },
  {
    url: "https://meta.upsun.com/openapi.json",
    output: path.join(CACHE_DIR, "openapi/meta-openapi.json"),
    private: true
  },
  // {
  //   url: "https://xxx/openapi.json",
  //   output: path.join(CACHE_DIR, "openapi/openapi.json"),
  //   private: true
  // },
  {
    url: "https://raw.githubusercontent.com/upsun/pluginapp-starter/main/README.md",
    output: path.join(CACHE_DIR, "plugin-app/starterkit-readme.mdx"),
    private: true
  },
  {
    url: "https://raw.githubusercontent.com/upsun/pluginapp-sdk-node/main/README.md",
    output: path.join(CACHE_DIR, "plugin-app/sdk-node-readme.mdx"),
    private: true
  }
];

function downloadContent(url, isPrivate = false) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'GET',
      headers: {}
    };

    // Add authentication for private repos
    if (isPrivate) {
      if (!GITHUB_TOKEN) {
        reject(new Error('GITHUB_TOKEN environment variable is required for private repositories'));
        return;
      }
      options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      options.headers['User-Agent'] = 'Node.js';
    }

    https.get(options, res => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadContent(res.headers.location, isPrivate)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Handle errors
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} for ${url}`));
        return;
      }

      let data = "";
      
      res.on("data", chunk => {
        data += chunk;
      });
      
      res.on("end", () => {
        resolve(data);
      });
      
      res.on("error", err => {
        reject(err);
      });
    }).on("error", err => {
      reject(err);
    });
  });
}

function cleanMarkdownForMDX(content) {
  return content
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Replace self-closing <br> tags with <br />
    .replace(/<br>/g, '<br />')
    // Replace <hr> tags with <hr />
    .replace(/<hr>/g, '<hr />')
    // Replace <img ...> tags with <img ... />
    .replace(/<img ([^>]+)>/g, '<img $1 />');
    // // Clean multiple spaces
    // .replace(/\s+$/gm, '');
}

async function syncAll() {
  console.log("🔄 Synchronizing external content...\n");
  
  if (SOURCES.some(s => s.private) && !GITHUB_TOKEN) {
    console.error("⚠️  Warning: Some sources are private but GITHUB_TOKEN is not set.");
    console.error("   Set it with: export GITHUB_TOKEN=your_token_here\n");
  }
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const source of SOURCES) {
    try {
      console.log(`📥 Downloading from ${source.url}...`);
      const content = await downloadContent(source.url, source.private);
      
      // Clean the content for MDX
      const cleanedContent = cleanMarkdownForMDX(content);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(source.output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(source.output, cleanedContent, 'utf-8');
      console.log(`✅ Saved to ${source.output}\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error for ${source.url}: ${error.message}`);
      console.log(`📝 Creating fallback content for ${source.output}...\n`);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(source.output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Read and write fallback content
      const fallbackContent = fs.readFileSync(FALLBACK_CONTENT_PATH, 'utf-8');
      fs.writeFileSync(source.output, fallbackContent, 'utf-8');
      
      errorCount++;
      errors.push({ url: source.url, error: error.message });
      // Continue with next source instead of exiting
    }
  }
  
  console.log("✨ Synchronization complete!");
  console.log(`   Success: ${successCount}/${SOURCES.length}`);
  
  if (errorCount > 0) {
    console.error(`   Failed: ${errorCount}/${SOURCES.length}\n`);
    console.error("Failed sources:");
    errors.forEach(({ url, error }) => {
      console.error(`  - ${url}: ${error}`);
    });
    
    if (successCount === 0) {
      console.error("\n❌ All sources failed. Aborting.");
      throw new Error('All sources failed to synchronize');
    } else {
      console.warn("\n⚠️  Some sources failed but continuing with available content.");
    }
  }
  
  return {
    success: successCount,
    failed: errorCount,
    total: SOURCES.length,
    errors
  };
}

// Only run if executed directly (not imported as module)
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAll()
    .then((result) => {
      process.exit(result.failed === result.total ? 1 : 0);
    })
    .catch((error) => {
      console.error('Synchronization failed:', error.message);
      process.exit(1);
    });
}
