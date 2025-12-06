import fs from "fs";
import path from "path";
import { compile } from "@mdx-js/mdx";

const targetPath = process.argv[2] || "contents";
const resolvedPath = path.resolve(process.cwd(), targetPath);

let totalFiles = 0;
let validFiles = 0;
let errorFiles = 0;
const errors = [];

/**
 * Recursively find all .mdx files in a directory
 */
function findMdxFiles(dir) {
  const mdxFiles = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        mdxFiles.push(...findMdxFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith(".mdx")) {
        mdxFiles.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Unable to read directory ${dir}:`, e.message);
  }
  
  return mdxFiles;
}

/**
 * Validate a single MDX file
 */
async function validateMdxFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    await compile(content);
    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err,
      position: err.position,
      line: err.line,
      column: err.column
    };
  }
}

/**
 * Main execution
 */
async function main() {
  const stats = fs.statSync(resolvedPath);
  let mdxFiles = [];
  
  if (stats.isDirectory()) {
    console.log(`🔍 Analyzing all MDX files in: ${resolvedPath}\n`);
    mdxFiles = findMdxFiles(resolvedPath);
  } else if (stats.isFile() && resolvedPath.endsWith(".mdx")) {
    console.log(`🔍 Analyzing MDX file: ${resolvedPath}\n`);
    mdxFiles = [resolvedPath];
  } else {
    console.error("❌ Please provide a valid .mdx file or directory path");
    process.exit(1);
  }
  
  if (mdxFiles.length === 0) {
    console.log("⚠️  No .mdx files found");
    process.exit(0);
  }
  
  totalFiles = mdxFiles.length;
  console.log(`📁 Found ${totalFiles} MDX file(s) to validate\n`);
  
  for (const file of mdxFiles) {
    const relativePath = path.relative(process.cwd(), file);
    process.stdout.write(`Checking ${relativePath}... `);
    
    const result = await validateMdxFile(file);
    
    if (result.success) {
      validFiles++;
      console.log("✅");
    } else {
      errorFiles++;
      console.log("❌");
      errors.push({
        file: relativePath,
        ...result
      });
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`📊 Validation Summary:`);
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Valid: ${validFiles} ✅`);
  console.log(`   Errors: ${errorFiles} ❌`);
  console.log("=".repeat(60));
  
  if (errors.length > 0) {
    console.log("\n❌ ERRORS DETECTED:\n");
    
    errors.forEach((err, index) => {
      console.log(`${index + 1}. ${err.file}`);
      if (err.line != null) {
        console.log(`   Line: ${err.line}, Column: ${err.column}`);
      }
      if (err.position) {
        console.log(`   Position:`, err.position);
      }
      console.log(`   Error: ${err.error.message}`);
      console.log("");
    });
    
    process.exit(1);
  } else {
    console.log("\n✅ All MDX files are valid!\n");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
