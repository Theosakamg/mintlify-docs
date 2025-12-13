import fs from 'node:fs';
import path from 'node:path';

import UpsunDocCommand from '../../base-command.js';
import {globalExamples} from '../../config.js';
import initHookApp from '../../hooks/init/app.js';
import Logger from '../../utils/logger.js';

const DEFAULT_LIMIT = 5;
const EXCLUDED_FILES = ['latest.mdx', 'ai.mdx', 'discussions.mdx', 'howto.mdx', 'all.mdx'];
const CONTENT_PATH = 'contents';
const BASE_PATH = 'articles';

/**
 * Article metadata interface
 */
interface ArticleMetadata {
  title: string;
  description: string;
  date: string;
  tag: string;
  path: string;
  filename: string;
  excerpt: string;
}

/**
 * Generation summary interface
 */
interface GenerationSummary {
  articlesFound: number;
  articlesProcessed: number;
  outputFile: string;
}

export default class BlogGenerate extends UpsunDocCommand {
  static override description = 'Generate latest articles JSON file from blog content';
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
    await this.parse(BlogGenerate);

    try {
      // Initialize logger and workspace root
      this.logger = new Logger('blog:generate');
      this.workspaceRoot = process.cwd();

      // Execute generation
      const summary = await this.generateLatestArticles();

      // Display summary
      this.displaySummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error(`Generation failed: ${message}`, {exit: 1});
    } finally {
      // Ensure logger is flushed before exit
      if (this.logger) {
        await this.logger.flush();
      }
    }
  }

  /**
   * Extract frontmatter metadata from content
   */
  private extractFrontmatter(content: string): Record<string, string> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch || !frontmatterMatch[1]) return {};

    const frontmatter = frontmatterMatch[1];
    const metadata: Record<string, string> = {};

    frontmatter.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        // Remove quotes if present
        value = value.replaceAll(/^["']|["']$/g, '');
        metadata[key] = value;
      }
    });

    return metadata;
  }

  /**
   * Extract excerpt from content (first paragraph or first 10 lines)
   */
  private extractExcerpt(content: string): string {
    const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---/);
    if (!frontmatterMatch) return '';

    const contentAfterFrontmatter = content.slice(frontmatterMatch[0].length).trim();
    const lines = contentAfterFrontmatter.split('\n');
    const firstParagraphLines: string[] = [];
    let lineCount = 0;

    for (const line of lines) {
      if (lineCount >= 10) break;
      firstParagraphLines.push(line);
      lineCount++;

      // Stop at first empty line after content (end of paragraph)
      if (line.trim() === '' && firstParagraphLines.length > 2) {
        break;
      }
    }

    return firstParagraphLines.join('\n').trim();
  }

  /**
   * Get all articles with metadata from articles directory
   */
  private getLatestArticles(limit: number = DEFAULT_LIMIT): ArticleMetadata[] {
    const articlesDir = path.join(this.workspaceRoot, CONTENT_PATH, BASE_PATH);
    const articles: ArticleMetadata[] = [];

    if (!fs.existsSync(articlesDir)) {
      this.logger.error(`Articles directory not found: ${articlesDir}`);
      return [];
    }

    const files = fs.readdirSync(articlesDir);
    this.logger.info(`Found ${files.length} files in articles directory`);

    for (const file of files) {
      // Skip non-markdown files
      if (!(file.endsWith('.mdx') || file.endsWith('.md'))) {
        continue;
      }

      // Skip excluded files
      if (EXCLUDED_FILES.includes(file)) {
        this.logger.debug(`Skipping excluded file: ${file}`);
        continue;
      }

      const filePath = path.join(articlesDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const metadata = this.extractFrontmatter(content);

        if (!metadata.title || !metadata.date) {
          this.logger.warn(`Skipping ${file}: missing title or date in frontmatter`);
          continue;
        }

        const excerpt = this.extractExcerpt(content);

        articles.push({
          date: metadata.date,
          description: metadata.description || '',
          excerpt,
          filename: file,
          path: `/articles/${file.replace(/\.mdx?$/, '')}`,
          tag: metadata.tag || '',
          title: metadata.title,
        });

        this.logger.debug(`Processed article: ${metadata.title}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error processing ${file}: ${message}`);
      }
    }

    // Sort by date (most recent first) and limit results
    return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
  }

  /**
   * Generate latest articles JSON file
   */
  private async generateLatestArticles(): Promise<GenerationSummary> {
    const articlesDir = path.join(this.workspaceRoot, CONTENT_PATH, BASE_PATH);
    const outputDir = path.join(this.workspaceRoot, CONTENT_PATH, 'snippets', '.cache', 'latest-articles.json');

    this.logger.info('Starting articles generation...');
    this.logger.info(`Articles directory: ${articlesDir}`);
    this.logger.info(`Output file: ${outputDir}`);

    // Get latest articles
    const latestArticles = this.getLatestArticles(DEFAULT_LIMIT);

    // Ensure cache directory exists
    const cacheDir = path.dirname(outputDir);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, {recursive: true});
      this.logger.info(`Created cache directory: ${cacheDir}`);
    }

    // Write JSON file
    fs.writeFileSync(outputDir, JSON.stringify(latestArticles, null, 2));
    this.logger.info(`Generated latest articles file: ${outputDir}`);

    return {
      articlesFound: latestArticles.length,
      articlesProcessed: latestArticles.length,
      outputFile: outputDir,
    };
  }

  /**
   * Display generation summary
   */
  private displaySummary(summary: GenerationSummary): void {
    this.logger.info('='.repeat(60));
    this.logger.info('📊 Generation Summary:');
    this.logger.info(`   📝 Articles processed: ${summary.articlesProcessed}`);
    this.logger.info(`   📄 Output file: ${summary.outputFile}`);
    this.logger.info('='.repeat(60));

    if (summary.articlesProcessed > 0) {
      this.logger.success('Articles generated successfully!');
    } else {
      this.logger.warn('⚠️  No articles found to generate');
    }
  }
}
