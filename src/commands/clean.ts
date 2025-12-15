import fs from 'node:fs';
import path from 'node:path';

import UpsunDocCommand from '../base-command.js';
import {globalExamples} from '../config.js';
import config from '../config/config.js';
import initHookApp from '../hooks/init/app.js';
import Logger from '../utils/logger.js';

/**
 * Clean result summary
 */
interface CleanSummary {
  deletedFiles: number;
  deletedDirs: number;
  totalSize: number;
  errors: string[];
}

export default class Clean extends UpsunDocCommand {
  static override description = 'Clean cache directory by removing all cached files';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  private logger!: Logger;
  private workspaceRoot!: string;

  public async run(): Promise<void> {
    await this.parse(Clean);

    try {
      // Initialize logger and workspace root
      this.logger = new Logger('clean');
      this.workspaceRoot = process.cwd();

      // Execute cleaning
      const summary = await this.cleanCache();

      // Display summary
      this.displaySummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Clean operation failed: ${message}`, {exit: 1});
    }
  }

  /**
   * Get file size in bytes
   */
  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Recursively delete directory contents
   */
  private deleteDirContents(dirPath: string): CleanSummary {
    const summary: CleanSummary = {
      deletedDirs: 0,
      deletedFiles: 0,
      errors: [],
      totalSize: 0,
    };

    try {
      if (!fs.existsSync(dirPath)) {
        this.logger.warn(`Directory does not exist: ${dirPath}`);
        return summary;
      }

      const items = fs.readdirSync(dirPath, {withFileTypes: true});

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(this.workspaceRoot, fullPath);

        try {
          if (item.isDirectory()) {
            // Recursively delete directory
            const subSummary = this.deleteDirContents(fullPath);
            summary.deletedFiles += subSummary.deletedFiles;
            summary.deletedDirs += subSummary.deletedDirs;
            summary.totalSize += subSummary.totalSize;
            summary.errors.push(...subSummary.errors);

            fs.rmdirSync(fullPath);
            summary.deletedDirs++;
            this.logger.info(`🗑️  Deleted directory: ${relativePath}`);
          } else {
            // Delete file
            const fileSize = this.getFileSize(fullPath);
            fs.unlinkSync(fullPath);
            summary.deletedFiles++;
            summary.totalSize += fileSize;
            this.logger.info(`🗑️  Deleted file: ${relativePath}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to delete ${relativePath}: ${message}`);
          summary.errors.push(`${relativePath}: ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to read directory: ${message}`);
      summary.errors.push(`Directory read error: ${message}`);
    }

    return summary;
  }

  /**
   * Clean cache directory
   */
  private async cleanCache(): Promise<CleanSummary> {
    const cacheDir = path.join(this.workspaceRoot, config.sync.cacheDir);
    const relativeCacheDir = path.relative(this.workspaceRoot, cacheDir);

    this.logger.start(`Cleaning cache directory: ${relativeCacheDir}`);

    if (!fs.existsSync(cacheDir)) {
      this.logger.warn('Cache directory does not exist, nothing to clean');
      return {
        deletedDirs: 0,
        deletedFiles: 0,
        errors: [],
        totalSize: 0,
      };
    }

    const summary = this.deleteDirContents(cacheDir);

    return summary;
  }

  /**
   * Display clean summary
   */
  private displaySummary(summary: CleanSummary): void {
    this.logger.info('='.repeat(60));
    this.logger.info('🧹 Clean Summary:');
    this.logger.info(`   Files deleted: ${summary.deletedFiles}`);
    this.logger.info(`   Directories deleted: ${summary.deletedDirs}`);
    this.logger.info(`   Total space freed: ${(summary.totalSize / 1024).toFixed(2)} KB`);

    if (summary.errors.length > 0) {
      this.logger.info(`   Errors: ${summary.errors.length}`);
    }

    this.logger.info('='.repeat(60));

    if (summary.errors.length > 0) {
      this.logger.warn('❌ Some errors occurred during cleaning:');
      for (const [index, error] of summary.errors.entries()) {
        this.logger.error(`${index + 1}. ${error}`);
      }
    } else if (summary.deletedFiles === 0 && summary.deletedDirs === 0) {
      this.logger.info('✅ Cache was already empty');
    } else {
      this.logger.success('Cache cleaned successfully!');
    }
  }
}
