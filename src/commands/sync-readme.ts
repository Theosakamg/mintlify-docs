import fs from 'node:fs';
import path from 'node:path';
import config from '../config/config.js';
import Logger from '../utils/logger.js';
import DownloadGithub from '../utils/download_github.js';
import initHookApp from '../hooks/init/app.js';
import UpsunDocCommand from '../base-command.js';
import {globalExamples} from '../config.js';

/**
 * Sync result for a single source
 */
interface SyncResult {
  url: string;
  output: string;
  success: boolean;
  error?: string;
}

/**
 * Overall sync summary
 */
interface SyncSummary {
  success: number;
  failed: number;
  total: number;
  results: SyncResult[];
}

export default class SyncReadme extends UpsunDocCommand {
  static override description = 'Synchronize external content from GitHub and other sources';

  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];

  // static override flags = {
  //   config: Flags.string({
  //     char: 'c',
  //     description: 'Path to configuration file',
  //     default: 'config.yaml',
  //   }),
  // }

  private logger!: Logger;
  private downloader!: DownloadGithub;
  private workspaceRoot!: string;

  /**
   * Initialize command - called before run()
   */
  public async init(): Promise<void> {
    await super.init();

    // Call the init hook manually with all required properties
    await initHookApp.call(this as any, {
      id: this.id,
      config: this.config,
      argv: this.argv,
      context: this as any,
    });
  }

  public async run(): Promise<void> {
    await this.parse(SyncReadme);

    try {
      // Configuration is already loaded in init() hook
      // Initialize logger and downloader
      this.logger = new Logger('sync-readme');
      this.downloader = new DownloadGithub(config.github.token);
      this.workspaceRoot = process.cwd();

      // Execute synchronization
      const summary = await this.syncAll();

      // Exit with appropriate code
      if (summary.failed === summary.total) {
        this.error('All synchronization tasks failed', {exit: 1});
      }

      // Force exit to close pino-pretty worker threads
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Synchronization failed: ${message}`, {exit: 1});
    }
  }

  /**
   * Clean Markdown content for MDX compatibility
   */
  private cleanMarkdownForMDX(content: string): string {
    return (
      content
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Replace self-closing <br> tags with <br />
        .replace(/<br>/g, '<br />')
        // Replace <hr> tags with <hr />
        .replace(/<hr>/g, '<hr />')
        // Replace <img ...> tags with <img ... />
        .replace(/<img ([^>]+)>/g, '<img $1 />')
    );
  }

  /**
   * Ensure directory exists, create if necessary
   */
  private ensureDirectory(dirPath: string): void {
    try {
      fs.mkdirSync(dirPath, {recursive: true});
    } catch (error) {
      // Directory already exists or other error
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get fallback content when download fails
   */
  private getFallbackContent(): string {
    const fallbackPath = path.join(this.workspaceRoot, config.sync.fallbackContentPath);

    try {
      return fs.readFileSync(fallbackPath, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not read fallback content: ${message}`);
      return '# Content not available\n\nThe requested content could not be synchronized.';
    }
  }

  /**
   * Sync a single source
   */
  private async syncSource(url: string, output: string, isPrivate: boolean): Promise<SyncResult> {
    const cacheDir = path.join(this.workspaceRoot, config.sync.cacheDir);
    const outputPath = path.join(cacheDir, output);

    this.logger.download(`Downloading from ${url}`);

    try {
      // Download content
      const result = await this.downloader.download(url, {isPrivate});

      // Clean content for MDX (if Markdown)
      const content =
        output.endsWith('.mdx') || output.endsWith('.md') ? this.cleanMarkdownForMDX(result.content) : result.content;

      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      this.ensureDirectory(dir);

      // Write content to file
      fs.writeFileSync(outputPath, content, 'utf-8');

      this.logger.success(`Saved to ${output}`, {
        size: `${(content.length / 1024).toFixed(2)} KB`,
      });

      return {
        error: undefined,
        output,
        success: true,
        url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.failure(`Failed to download ${url}: ${errorMessage}`);

      // Write fallback content
      this.logger.warn(`Creating fallback content for ${output}`);
      const fallbackContent = this.getFallbackContent();

      const dir = path.dirname(outputPath);
      this.ensureDirectory(dir);
      fs.writeFileSync(outputPath, fallbackContent, 'utf-8');

      return {
        error: errorMessage,
        output,
        success: false,
        url,
      };
    }
  }

  /**
   * Sync all configured sources
   */
  private async syncAll(): Promise<SyncSummary> {
    this.logger.start('Synchronizing external content');

    const sources = config.sync.sources;

    if (sources.length === 0) {
      this.logger.warn('No sources configured for synchronization');
      return {
        failed: 0,
        results: [],
        success: 0,
        total: 0,
      };
    }

    // Check if GitHub token is set for private sources
    const hasPrivateSources = sources.some((s) => s.private);
    if (hasPrivateSources && !config.github.token) {
      this.logger.warn('Some sources are private but GITHUB_TOKEN is not set', {
        hint: 'Set GITHUB_TOKEN environment variable or update config.yaml',
      });
    }

    this.logger.info(`Processing ${sources.length} sources`);

    // Sync all sources
    const results: SyncResult[] = [];
    for (const source of sources) {
      const result = await this.syncSource(source.url, source.output, source.private);
      results.push(result);
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    const summary: SyncSummary = {
      failed: failedCount,
      results,
      success: successCount,
      total: sources.length,
    };

    // Log summary
    this.logger.info('Synchronization complete', {
      failed: failedCount,
      success: successCount,
      total: sources.length,
    });

    if (failedCount > 0) {
      this.logger.warn(`${failedCount} source(s) failed to download`);

      // Log failed sources
      const failedResults = results.filter((r) => !r.success);
      for (const result of failedResults) {
        this.logger.error(`  - ${result.url}: ${result.error}`);
      }

      if (successCount === 0) {
        this.logger.failure('All sources failed to synchronize');
        this.error('All sources failed to synchronize', {exit: 1});
      } else {
        this.logger.warn('Some sources failed but continuing with available content');
      }
    } else {
      this.logger.success('All sources synchronized successfully');
    }

    return summary;
  }
}
