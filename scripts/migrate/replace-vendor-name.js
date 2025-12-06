#!/usr/bin/env node

/**
 * Script to replace Hugo shortcodes with Mintlify ConfigValue component
 * Usage: node scripts/replace-vendor-name.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}Starting replacement of {{% vendor/name %}} with ConfigValue component${colors.reset}\n`);

// Find all .md and .mdx files in docs directory recursively
const docsPath = path.join(__dirname, '..', 'docs');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function processFiles() {
  try {
    const files = getAllFiles(docsPath);

    let processedCount = 0;
    let replacedCount = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check if file contains the pattern
      if (!content.includes('{{% vendor/name %}}')) {
        continue;
      }

      processedCount++;
      console.log(`${colors.green}Processing: ${path.relative(process.cwd(), file)}${colors.reset}`);

      // Replace the shortcode with ConfigValue component
      let newContent = content.replace(/\{\{%\s*vendor\/name\s*%\}\}/g, '<ConfigValue key="vendorName" />');
      
      // Count replacements
      const matches = (content.match(/\{\{%\s*vendor\/name\s*%\}\}/g) || []).length;
      replacedCount += matches;
      
      // Write the file back
      fs.writeFileSync(file, newContent, 'utf8');
      
      console.log(`  ✓ Replaced ${matches} occurrence(s) in ${path.basename(file)}`);
    }

    console.log(`\n${colors.blue}Replacement completed!${colors.reset}`);
    console.log(`${colors.green}Processed ${processedCount} file(s)${colors.reset}`);
    console.log(`${colors.green}Replaced ${replacedCount} occurrence(s)${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

processFiles();
