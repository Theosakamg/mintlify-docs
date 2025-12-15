import {compile} from '@mdx-js/mdx';
import {Args, Flags} from '@oclif/core';
import fs from 'node:fs';
import path from 'node:path';

import UpsunDocCommand from '../../base-command.js';
import {globalExamples} from '../../config.js';
import initHookApp from '../../hooks/init/app.js';
import Logger from '../../utils/logger.js';

/**
 * Validation result for a single MDX file
 */
interface ValidationResult {
  file: string;
  success: boolean;
  error?: string;
  line?: number;
  column?: number;
  position?: any;
}

/**
 * Overall validation summary
 */
interface ValidationSummary {
  total: number;
  valid: number;
  errors: number;
  results: ValidationResult[];
}

export default class CheckMdx extends UpsunDocCommand {
  static override description = 'Validate MDX files for syntax errors';
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> contents',
    '<%= config.bin %> <%= command.id %> contents/articles/ai.mdx',
    '<%= config.bin %> <%= command.id %> --path contents/api',
    ...globalExamples,
  ];
  static override flags = {
    ...UpsunDocCommand.flags,
    path: Flags.string({
      char: 'p',
      description: 'Path to MDX file or directory to validate',
      default: 'contents',
    }),
  };
  static override args = {
    target: Args.string({
      description: 'Path to MDX file or directory to validate (alternative to --path flag)',
      required: false,
    }),
  };
  private logger!: Logger;
  private workspaceRoot!: string;

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CheckMdx);

    try {
      // Initialize logger and workspace root
      this.logger = new Logger('check-mdx');
      this.workspaceRoot = process.cwd();

      // Determine target path (arg takes precedence over flag)
      const targetPath = args.target || flags.path;
      const resolvedPath = path.resolve(this.workspaceRoot, targetPath);

      // Validate path exists
      if (!fs.existsSync(resolvedPath)) {
        this.error(`Path not found: ${resolvedPath}`, {exit: 1});
      }

      // Execute validation
      const summary = await this.validateAll(resolvedPath);

      // Display summary
      this.displaySummary(summary);

      // Exit with appropriate code
      if (summary.errors > 0) {
        this.error(`${summary.errors} MDX file(s) have errors`, {exit: 1});
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Validation failed: ${message}`, {exit: 1});
    }
  }

  /**
   * Recursively find all .mdx files in a directory
   */
  private findMdxFiles(dir: string): string[] {
    const mdxFiles: string[] = [];

    try {
      const items = fs.readdirSync(dir, {withFileTypes: true});

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          mdxFiles.push(...this.findMdxFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.mdx')) {
          mdxFiles.push(fullPath);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to read directory ${dir}: ${message}`);
    }

    return mdxFiles;
  }

  /**
   * Validate a single MDX file
   */
  private async validateMdxFile(filePath: string): Promise<ValidationResult> {
    const relativePath = path.relative(this.workspaceRoot, filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      await compile(content);

      this.logger.success(`${relativePath}`);

      return {
        file: relativePath,
        success: true,
      };
    } catch (error: any) {
      this.logger.failure(`${relativePath}`);

      return {
        column: error.column,
        error: error.message,
        file: relativePath,
        line: error.line,
        position: error.position,
        success: false,
      };
    }
  }

  /**
   * Validate all MDX files in the target path
   */
  private async validateAll(targetPath: string): Promise<ValidationSummary> {
    const stats = fs.statSync(targetPath);
    let mdxFiles: string[] = [];

    if (stats.isDirectory()) {
      this.logger.start(`Analyzing all MDX files in: ${targetPath}`);
      mdxFiles = this.findMdxFiles(targetPath);
    } else if (stats.isFile() && targetPath.endsWith('.mdx')) {
      this.logger.start(`Analyzing MDX file: ${targetPath}`);
      mdxFiles = [targetPath];
    } else {
      this.error('Please provide a valid .mdx file or directory path', {
        exit: 1,
      });
    }

    if (mdxFiles.length === 0) {
      this.logger.warn('No .mdx files found');
      return {
        errors: 0,
        results: [],
        total: 0,
        valid: 0,
      };
    }

    this.logger.info(`Found ${mdxFiles.length} MDX file(s) to validate`);

    // Validate all files
    const results: ValidationResult[] = [];
    for (const file of mdxFiles) {
      const result = await this.validateMdxFile(file);
      results.push(result);
    }

    // Calculate summary
    const validCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return {
      errors: errorCount,
      results,
      total: mdxFiles.length,
      valid: validCount,
    };
  }

  /**
   * Display validation summary
   */
  private displaySummary(summary: ValidationSummary): void {
    this.logger.info('='.repeat(60));
    this.logger.info('📊 Validation Summary:');
    this.logger.info(`   Total files: ${summary.total}`);
    this.logger.info(`   Valid: ${summary.valid} ✅`);
    this.logger.info(`   Errors: ${summary.errors} ❌`);
    this.logger.info('='.repeat(60));

    // Display errors if any
    const errorResults = summary.results.filter((r) => !r.success);
    if (errorResults.length > 0) {
      this.logger.failure('ERRORS DETECTED:');
      this.logger.info('');

      for (const [index, result] of errorResults.entries()) {
        this.logger.error(`${index + 1}. ${result.file}`);
        if (result.line !== undefined) {
          this.logger.error(`   Line: ${result.line}, Column: ${result.column}`);
        }

        if (result.position) {
          this.logger.error(`   Position: ${JSON.stringify(result.position)}`);
        }

        this.logger.error(`   Error: ${result.error}`);
        this.logger.info('');
      }
    } else {
      this.logger.success('All MDX files are valid!');
    }
  }
}
