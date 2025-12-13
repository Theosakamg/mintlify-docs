import fs from 'node:fs';
import path from 'node:path';

import UpsunDocCommand from '../../base-command.js';
import {globalExamples} from '../../config.js';
import initHookApp from '../../hooks/init/app.js';
import Logger from '../../utils/logger.js';

/**
 * Replacement summary
 */
interface ReplacementSummary {
  processedFiles: number;
  totalReplacements: number;
  errors: string[];
}

export default class ReplaceVendorUrlraw extends UpsunDocCommand {
  static override description =
    'Replace Hugo shortcodes {{< vendor/urlraw >}} with Mintlify ConfigValue component';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  private logger!: Logger;
  private workspaceRoot!: string;

  /**
   * Initialize command - called before run()
   */
  public async init(): Promise<void> {
    await super.init();

    // Call the init hook manually with all required properties
    await initHookApp.call(this as any, {
      argv: this.argv,
      config: this.config,
      context: this as any,
      id: this.id,
    });
  }

  public async run(): Promise<void> {
    await this.parse(ReplaceVendorUrlraw);

    try {
      // Initialize logger and workspace root
      this.logger = new Logger('migrate:replace-vendor-urlraw');
      this.workspaceRoot = process.cwd();

      this.logger.info('Starting replacement of {{< vendor/urlraw >}} with ConfigValue component');

      // Execute replacement
      const summary = await this.processFiles();

      // Display summary
      this.displaySummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Replacement operation failed: ${message}`, {exit: 1});
    } finally {
      // Ensure logger is flushed before exit
      if (this.logger) {
        await this.logger.flush();
      }
    }
  }

  /**
   * Get all .md and .mdx files recursively
   */
  private getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
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
   * Process all files and replace patterns
   */
  private async processFiles(): Promise<ReplacementSummary> {
    const summary: ReplacementSummary = {
      errors: [],
      processedFiles: 0,
      totalReplacements: 0,
    };

    const docsPath = path.join(this.workspaceRoot, 'tmp', 'docs');
    const files = this.getAllFiles(docsPath);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');

        // Check if file contains the pattern
        if (!content.includes('{{< vendor/urlraw "discord" >}}')) {
          continue;
        }

        const relativePath = path.relative(this.workspaceRoot, file);
        this.logger.info(`Processing: ${relativePath}`);

        // Replace the shortcode with ConfigValue component
        // Pattern: {{< vendor/urlraw "discord" >}} -> <ConfigValue key="vendor.discord.url" />
        const newContent = content.replaceAll(
          /\{\{<\s*vendor\/urlraw\s+"discord"\s*>\}\}/g,
          '<ConfigValue key="vendor.discord.url" />',
        );

        // Count replacements
        const matches = (content.match(/\{\{<\s*vendor\/urlraw\s+"discord"\s*>\}\}/g) || [])
          .length;
        summary.totalReplacements += matches;
        summary.processedFiles++;

        // Write the file back
        fs.writeFileSync(file, newContent, 'utf8');

        this.logger.success(`Replaced ${matches} occurrence(s) in ${path.basename(file)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const relativePath = path.relative(this.workspaceRoot, file);
        const errorMsg = `Failed to process ${relativePath}: ${message}`;
        summary.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }

    return summary;
  }

  /**
   * Display replacement summary
   */
  private displaySummary(summary: ReplacementSummary): void {
    this.logger.info('='.repeat(60));
    this.logger.info('🔄 Replacement Summary:');
    this.logger.info(`   Files processed: ${summary.processedFiles}`);
    this.logger.info(`   Total replacements: ${summary.totalReplacements}`);

    if (summary.errors.length > 0) {
      this.logger.info(`   Errors: ${summary.errors.length}`);
    }

    this.logger.info('='.repeat(60));

    if (summary.errors.length > 0) {
      this.logger.warn('❌ Some errors occurred during replacement:');
      for (const [index, error] of summary.errors.entries()) {
        this.logger.error(`${index + 1}. ${error}`);
      }
    } else if (summary.processedFiles === 0) {
      this.logger.warn('✅ No files found matching the pattern');
    } else {
      this.logger.success('Replacement completed successfully!');
    }
  }
}
