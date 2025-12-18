import {Flags} from '@oclif/core';
import fs from 'node:fs';
import path from 'node:path';

import UpsunDocCommand from './base-command.js';
import {globalFlags} from './config.js';
import Logger from './utils/logger.js';

/**
 * Migration summary interface
 */
export interface MigrationSummary {
  processedFiles: number;
  skippedFiles: number;
  totalReplacements: number;
  errors: string[];
}

/**
 * Frontmatter extraction result
 */
export interface FrontmatterData {
  hasFrontmatter: boolean;
  frontmatter: string;
  frontmatterObject: Record<string, any>;
  body: string;
  startDelimiter: string;
}

/**
 * File processing result
 */
export interface FileProcessingResult {
  modified: boolean;
  newContent?: string;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Base class for migration commands
 * Provides common functionality for scanning files and processing frontmatter
 */
export abstract class BaseMigrateCommand extends UpsunDocCommand {
  static baseFlags = {
    ...globalFlags,
    path: Flags.string({
      char: 'p',
      default: 'contents',
      description: 'Path to scan for markdown files (relative to workspace root)',
    }),
  };

  protected logger!: Logger;
  protected workspaceRoot!: string;
  protected scanPath!: string;

  /**
   * Get the logger name for the command
   */
  protected abstract getLoggerName(): string;

  /**
   * Get the migration description message
   */
  protected abstract getMigrationDescription(): string;

  /**
   * Process a single file and return the result
   * @param filePath - Absolute path to the file
   * @param content - File content
   * @param frontmatter - Extracted frontmatter data
   */
  protected abstract processFile(
    filePath: string,
    content: string,
    frontmatter: FrontmatterData,
  ): Promise<FileProcessingResult> | FileProcessingResult;

  /**
   * Get custom summary label (default: 'Migration Summary')
   */
  protected getSummaryLabel(): string {
    return 'Migration Summary';
  }

  /**
   * Initialize the command
   */
  protected async initialize(flags: any): Promise<void> {
    this.logger = new Logger(this.getLoggerName());
    this.workspaceRoot = process.cwd();
    this.scanPath = path.join(this.workspaceRoot, flags.path || 'contents');

    this.logger.info(this.getMigrationDescription());
    this.logger.info(`Scanning path: ${flags.path || 'contents'}`);
  }

  /**
   * Get all .md and .mdx files recursively
   */
  protected getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          this.getAllFiles(filePath, arrayOfFiles);
        } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
          arrayOfFiles.push(filePath);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error reading directory ${dirPath}: ${message}`);
    }

    return arrayOfFiles;
  }

  /**
   * Parse simple YAML frontmatter into object
   */
  protected parseFrontmatter(frontmatter: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = frontmatter.split('\n');

    let currentKey: string | null = null;
    let currentValue: any = null;
    let isArray = false;

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Check if it's an array item
      if (line.trim().startsWith('-')) {
        if (currentKey && isArray) {
          const value = line.trim().slice(1).trim();
          if (Array.isArray(currentValue)) {
            currentValue.push(value);
          }
        }

        continue;
      }

      // Check if it's a key-value pair
      const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
      if (match && match[2] && match[3]) {
        // Save previous key-value if exists
        if (currentKey) {
          result[currentKey] = currentValue;
        }

        const key = match[2].trim();
        const value = match[3].trim();

        currentKey = key;
        isArray = false;

        if (value === '') {
          // Might be an array or multiline value
          currentValue = [];
          isArray = true;
        } else if (value.startsWith("'") || value.startsWith('"')) {
          // String value with quotes
          currentValue = value.slice(1, -1);
        } else if (!Number.isNaN(Number(value))) {
          // Numeric value
          currentValue = Number(value);
        } else if (value === 'true' || value === 'false') {
          // Boolean value
          currentValue = value === 'true';
        } else {
          // Regular string
          currentValue = value;
        }
      }
    }

    // Save last key-value
    if (currentKey) {
      result[currentKey] = currentValue;
    }

    return result;
  }

  /**
   * Extract YAML frontmatter from content
   */
  protected extractFrontmatter(content: string): FrontmatterData {
    const yamlRegex = /^(---)\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(yamlRegex);

    if (match && match[1] && match[2] && match[3]) {
      const frontmatter = match[2];
      return {
        body: match[3],
        frontmatter,
        frontmatterObject: this.parseFrontmatter(frontmatter),
        hasFrontmatter: true,
        startDelimiter: match[1],
      };
    }

    return {
      body: content,
      frontmatter: '',
      frontmatterObject: {},
      hasFrontmatter: false,
      startDelimiter: '',
    };
  }

  /**
   * Process all files in the scan path
   */
  protected async processAllFiles(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      errors: [],
      processedFiles: 0,
      skippedFiles: 0,
      totalReplacements: 0,
    };

    const files = this.getAllFiles(this.scanPath);
    this.logger.info(`Found ${files.length} markdown files to check`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const frontmatterData = this.extractFrontmatter(content);

        // Process the file
        const result = await this.processFile(file, content, frontmatterData);

        if (!result.modified) {
          summary.skippedFiles++;
          continue;
        }

        // Log processing
        const relativePath = path.relative(this.workspaceRoot, file);
        this.logger.info(`📝 Processing: ${relativePath}`);

        if (result.details) {
          for (const [key, value] of Object.entries(result.details)) {
            this.logger.info(`   ${key}: ${value}`);
          }
        }

        // Write the file back
        if (result.newContent) {
          fs.writeFileSync(file, result.newContent, 'utf8');
        }

        summary.totalReplacements++;
        summary.processedFiles++;

        if (result.message) {
          this.logger.success(`✅ ${result.message}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const relativePath = path.relative(this.workspaceRoot, file);
        const errorMsg = `Failed to process ${relativePath}: ${message}`;
        summary.errors.push(errorMsg);
        this.logger.error(`❌ ${errorMsg}`);
      }
    }

    return summary;
  }

  /**
   * Display migration summary
   */
  protected displaySummary(summary: MigrationSummary): void {
    this.logger.info('='.repeat(60));
    this.logger.info(`🔄 ${this.getSummaryLabel()}:`);
    this.logger.info(`   Files processed: ${summary.processedFiles}`);
    this.logger.info(`   Files skipped: ${summary.skippedFiles}`);
    this.logger.info(`   Total changes: ${summary.totalReplacements}`);

    if (summary.errors.length > 0) {
      this.logger.info(`   Errors: ${summary.errors.length}`);
    }

    this.logger.info('='.repeat(60));

    if (summary.errors.length > 0) {
      this.logger.error('❌ Some errors occurred during migration:');
      for (const [index, error] of summary.errors.entries()) {
        this.logger.error(`   ${index + 1}. ${error}`);
      }
    } else if (summary.processedFiles === 0) {
      this.logger.warn('⚠️  No files were modified');
    } else {
      this.logger.success('✅ Migration completed successfully!');
    }
  }

  /**
   * Add import statement to MDX file if components are used and import doesn't exist
   */
  protected addImportIfNeeded(content: string, components: string[]): string {
    // Check if any of the specified components are used
    const componentsUsed = components.filter(comp =>
      new RegExp(`<${comp}\\s`).test(content)
    );

    if (componentsUsed.length === 0) {
      return content;
    }

    // Find the position after frontmatter
    const frontmatterEnd = /^---\n[\s\S]*?\n---\n/.exec(content);
    if (!frontmatterEnd) {
      return content;
    }

    const insertPosition = frontmatterEnd[0].length;

    // Check if import already exists
    const importMatch = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]\/snippets\/config\.jsx['"];?\n/.exec(
      content.slice(insertPosition)
    );

    let allComponents: string[];
    let existingImportEnd = 0;

    if (importMatch && importMatch[1]) {
      // Parse existing imports
      const existingComponents = importMatch[1]
        .split(',')
        .map(comp => comp.trim())
        .filter(comp => comp.length > 0);

      // Merge with new components (avoid duplicates)
      const componentSet = new Set([...existingComponents, ...componentsUsed]);
      allComponents = Array.from(componentSet).sort();

      // If nothing new to add, return as is (no modification)
      if (allComponents.length === existingComponents.length) {
        return content;
      }

      // Calculate position of existing import
      existingImportEnd = insertPosition + importMatch.index + importMatch[0].length;

      // Remove old import
      content = content.slice(0, insertPosition + importMatch.index) + content.slice(existingImportEnd);

      // Adjust for removed content
      existingImportEnd = insertPosition + importMatch.index;
    } else {
      // No existing import, sort new components
      allComponents = componentsUsed.sort();
      existingImportEnd = insertPosition;
    }

    // Create new import statement
    const importStatement = `import { ${allComponents.join(', ')} } from '/snippets/config.jsx';\n\n`;

    return content.slice(0, existingImportEnd) + importStatement + content.slice(existingImportEnd);
  }

  /**
   * Main execution method
   */
  public async run(): Promise<void> {
    const {flags} = await this.parse(this.constructor as any);

    try {
      await this.initialize(flags);
      const summary = await this.processAllFiles();
      this.displaySummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Migration operation failed: ${message}`, {exit: 1});
    } finally {
      if (this.logger) {
        await this.logger.flush();
      }
    }
  }
}
