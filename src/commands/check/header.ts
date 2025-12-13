import fs from 'node:fs';
import path from 'node:path';

import {Args, Flags} from '@oclif/core';

import UpsunDocCommand from '../../base-command.js';
import {globalExamples} from '../../config.js';
import initHookApp from '../../hooks/init/app.js';
import Logger from '../../utils/logger.js';

const CONTENT_PATH = 'contents';

/**
 * Valid header fields dictionary
 */
const VALID_HEADER_FIELDS = new Set([
  'title',
  'description',
  'icon',
  'sidebarTitle',
  'mode',
  'date',
  'tag',
  'author',
  'image',
  'category',
  'published',
  'draft',
  'keywords',
  'og:title',
  'og:description',
  'og:image',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
]);

/**
 * Category configuration
 */
const CATEGORIES = [
  {name: 'articles', pathPattern: /^articles\//, requiredFields: ['title', 'date'], optionalFields: ['description', 'tag', 'author']},
  {name: 'api', pathPattern: /^api\//, requiredFields: ['title'], optionalFields: ['description', 'icon']},
  {name: 'ai', pathPattern: /^ai\//, requiredFields: ['title'], optionalFields: ['description', 'icon', 'sidebarTitle']},
  {name: 'docs', pathPattern: /^docs\//, requiredFields: ['title'], optionalFields: ['description', 'icon', 'sidebarTitle']},
  {name: 'root', pathPattern: /^[^/]+\.mdx?$/, requiredFields: ['title'], optionalFields: ['description', 'icon']},
];

/**
 * File validation result
 */
interface FileValidation {
  filePath: string;
  relativePath: string;
  category: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  headerFields: Record<string, string>;
  missingRequired: string[];
  invalidFields: string[];
}

/**
 * Category statistics
 */
interface CategoryStats {
  category: string;
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  commonFields: Record<string, number>;
  missingFields: Record<string, number>;
}

/**
 * Overall validation summary
 */
interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  filesWithWarnings: number;
  categoryStats: CategoryStats[];
  invalidFieldsCount: number;
}

export default class CheckHeader extends UpsunDocCommand {
  static override args = {
    path: Args.string({default: CONTENT_PATH, description: 'Path to check (default: contents/)'}),
  };

  static override description = 'Check headers (frontmatter) in Markdown/MDX files for validity and consistency';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> contents/articles',
    '<%= config.bin %> <%= command.id %> --verbose',
    '<%= config.bin %> <%= command.id %> --category articles',
    ...globalExamples,
  ];

  static override flags = {
    ...UpsunDocCommand.flags,
    category: Flags.string({
      description: 'Filter by category (articles, api, ai, docs, root)',
      options: ['articles', 'api', 'ai', 'docs', 'root'],
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Show detailed information for each file',
    }),
  };

  private logger!: Logger;
  private workspaceRoot!: string;
  private verbose = false;
  private categoryFilter?: string;

  /**
   * Initialize command - called before run()
   */
  public async init(): Promise<void> {
    await super.init();

    await initHookApp.call(this as any, {
      argv: this.argv,
      config: this.config,
      context: this as any,
      id: this.id,
    });
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CheckHeader);

    try {
      this.logger = new Logger('check:header');
      this.workspaceRoot = process.cwd();
      this.verbose = flags.verbose || false;
      this.categoryFilter = flags.category;

      const targetPath = path.isAbsolute(args.path) ? args.path : path.join(this.workspaceRoot, args.path);

      if (!fs.existsSync(targetPath)) {
        this.error(`Path does not exist: ${targetPath}`, {exit: 1});
      }

      this.logger.info(`Checking headers in: ${targetPath}`);
      if (this.categoryFilter) {
        this.logger.info(`Filtering by category: ${this.categoryFilter}`);
      }

      const validations = await this.checkHeaders(targetPath);
      const summary = this.generateSummary(validations);

      this.displayResults(validations, summary);

      if (summary.invalidFiles > 0) {
        this.error(`Found ${summary.invalidFiles} file(s) with invalid headers`, {exit: 1});
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Header check failed: ${message}`, {exit: 1});
    } finally {
      if (this.logger) {
        await this.logger.flush();
      }
    }
  }

  /**
   * Extract frontmatter from file content
   */
  private extractFrontmatter(content: string): Record<string, string> | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch || !frontmatterMatch[1]) return null;

    const frontmatter = frontmatterMatch[1];
    const metadata: Record<string, string> = {};

    frontmatter.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        value = value.replaceAll(/^["']|["']$/g, '');
        metadata[key] = value;
      }
    });

    return metadata;
  }

  /**
   * Determine category for a file
   */
  private getFileCategory(relativePath: string): {name: string; config: typeof CATEGORIES[0]} | null {
    for (const category of CATEGORIES) {
      if (category.pathPattern.test(relativePath)) {
        return {config: category, name: category.name};
      }
    }

    return null;
  }

  /**
   * Validate file header
   */
  private validateFile(filePath: string, baseDir: string): FileValidation | null {
    const relativePath = path.relative(baseDir, filePath);
    const categoryInfo = this.getFileCategory(relativePath);

    if (!categoryInfo) {
      return null;
    }

    // Apply category filter if specified
    if (this.categoryFilter && categoryInfo.name !== this.categoryFilter) {
      return null;
    }

    const validation: FileValidation = {
      category: categoryInfo.name,
      errors: [],
      filePath,
      headerFields: {},
      invalidFields: [],
      missingRequired: [],
      relativePath,
      valid: true,
      warnings: [],
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatter = this.extractFrontmatter(content);

      if (!frontmatter) {
        validation.valid = false;
        validation.errors.push('No frontmatter found');
        return validation;
      }

      validation.headerFields = frontmatter;

      // Check for invalid fields
      for (const field of Object.keys(frontmatter)) {
        if (!VALID_HEADER_FIELDS.has(field)) {
          validation.invalidFields.push(field);
          validation.warnings.push(`Unknown field: ${field}`);
        }
      }

      // Check required fields
      for (const requiredField of categoryInfo.config.requiredFields) {
        if (!frontmatter[requiredField]) {
          validation.missingRequired.push(requiredField);
          validation.errors.push(`Missing required field: ${requiredField}`);
          validation.valid = false;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      validation.valid = false;
      validation.errors.push(`Error reading file: ${message}`);
    }

    return validation;
  }

  /**
   * Recursively find all markdown files
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    const items = fs.readdirSync(dir, {withFileTypes: true});

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Skip node_modules, .git, and hidden directories
        if (!item.name.startsWith('.') && item.name !== 'node_modules') {
          files.push(...this.findMarkdownFiles(fullPath));
        }
      } else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check headers in all files
   */
  private async checkHeaders(targetPath: string): Promise<FileValidation[]> {
    const validations: FileValidation[] = [];
    const files = this.findMarkdownFiles(targetPath);

    this.logger.info(`Found ${files.length} markdown file(s)`);

    for (const file of files) {
      const validation = this.validateFile(file, targetPath);
      if (validation) {
        validations.push(validation);
      }
    }

    return validations;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(validations: FileValidation[]): ValidationSummary {
    const categoryStatsMap = new Map<string, CategoryStats>();

    let invalidFieldsCount = 0;
    let filesWithWarnings = 0;

    for (const validation of validations) {
      if (!categoryStatsMap.has(validation.category)) {
        categoryStatsMap.set(validation.category, {
          category: validation.category,
          commonFields: {},
          invalidFiles: 0,
          missingFields: {},
          totalFiles: 0,
          validFiles: 0,
        });
      }

      const stats = categoryStatsMap.get(validation.category)!;
      stats.totalFiles++;

      if (validation.valid) {
        stats.validFiles++;
      } else {
        stats.invalidFiles++;
      }

      if (validation.warnings.length > 0) {
        filesWithWarnings++;
      }

      invalidFieldsCount += validation.invalidFields.length;

      // Track common fields
      for (const field of Object.keys(validation.headerFields)) {
        stats.commonFields[field] = (stats.commonFields[field] || 0) + 1;
      }

      // Track missing fields
      for (const field of validation.missingRequired) {
        stats.missingFields[field] = (stats.missingFields[field] || 0) + 1;
      }
    }

    return {
      categoryStats: [...categoryStatsMap.values()],
      filesWithWarnings,
      invalidFiles: validations.filter((v) => !v.valid).length,
      invalidFieldsCount,
      totalFiles: validations.length,
      validFiles: validations.filter((v) => v.valid).length,
    };
  }

  /**
   * Display validation results
   */
  private displayResults(validations: FileValidation[], summary: ValidationSummary): void {
    this.logger.info('='.repeat(80));
    this.logger.info('Header Validation Results');
    this.logger.info('='.repeat(80));

    // Show invalid files (always)
    const invalidFiles = validations.filter((v) => !v.valid);
    if (invalidFiles.length > 0) {
      this.logger.info('Invalid Files:');
      for (const validation of invalidFiles) {
        this.logger.error(`❌ ${validation.relativePath}`);
        this.logger.error(`  Category: ${validation.category}`);
        this.logger.error(`  Errors: ${validation.errors.join(', ')}`);
      }
    }

    // Show files with warnings (always)
    const filesWithWarnings = validations.filter((v) => v.warnings.length > 0);
    if (filesWithWarnings.length > 0) {
      this.logger.info('Files with Warnings:');
      for (const validation of filesWithWarnings) {
        this.logger.warn(`✅ ${validation.relativePath}`);
        this.logger.warn(`  Warnings: ${validation.warnings.join(', ')}`);
      }
    }

    // Show detailed file results if verbose
    if (this.verbose) {
      this.logger.info('Detailed Results:');
      for (const validation of validations) {
        const status = validation.valid ? '✓' : '✗';
        this.logger.info(`${status} ${validation.relativePath} [${validation.category}]`);

        if (validation.errors.length > 0) {
          this.logger.error(`  Errors: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          this.logger.warn(`  Warnings: ${validation.warnings.join(', ')}`);
        }

        if (Object.keys(validation.headerFields).length > 0) {
          this.logger.info(`  Fields: ${Object.keys(validation.headerFields).join(', ')}`);
        }
      }

      this.logger.info('='.repeat(80));
    }

    // Overall summary
    this.logger.info('='.repeat(60));
    this.logger.info('📊 Validation Summary:');
    this.logger.info(`   Total files: ${summary.totalFiles}`);
    this.logger.info(`   ✅ Valid files: ${summary.validFiles}`);
    this.logger.info(`   ❌ Invalid files: ${summary.invalidFiles}`);
    this.logger.info(`   ⚠️  Files with warnings: ${summary.filesWithWarnings}`);
    this.logger.info(`   🏷️  Invalid fields count: ${summary.invalidFieldsCount}`);
    this.logger.info('='.repeat(60));

    // Category statistics
    this.logger.info('📈 Statistics by Category:');
    for (const stats of summary.categoryStats) {
      this.logger.info(`    📁 ${stats.category.toUpperCase()}:`);
      this.logger.info(`     Total: ${stats.totalFiles}`);
      this.logger.info(`     ✅ Valid: ${stats.validFiles}`);
      this.logger.info(`     ❌ Invalid: ${stats.invalidFiles}`);

      if (Object.keys(stats.commonFields).length > 0) {
        this.logger.info('    Common fields:');
        const sortedFields = Object.entries(stats.commonFields).sort(([, a], [, b]) => b - a);
        for (const [field, count] of sortedFields) {
          const percentage = ((count / stats.totalFiles) * 100).toFixed(0);
          this.logger.info(`      - ${field}: ${count}/${stats.totalFiles} (${percentage}%)`);
        }
      }

      if (Object.keys(stats.missingFields).length > 0) {
        this.logger.info('    Missing required fields:');
        for (const [field, count] of Object.entries(stats.missingFields)) {
          this.logger.info(`      - ${field}: ${count} file(s)`);
        }
      }
    }

    this.logger.info('='.repeat(60));
  }
}
