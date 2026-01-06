import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class LayoutToMode extends BaseMigrateCommand {
  static override description = 'Replace layout property with mode in YAML frontmatter (layout: single => mode: single, others => mode: custom)';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:layout-to-mode';
  }

  protected getMigrationDescription(): string {
    return 'Starting migration of layout property to mode in YAML frontmatter';
  }

  protected getSummaryLabel(): string {
    return 'Layout to Mode Migration Summary';
  }

  protected processFile(
    filePath: string,
    _content: string,
    frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Skip files without frontmatter
    if (!frontmatter.hasFrontmatter) {
      return {modified: false};
    }

    // Check if layout property exists
    const layoutRegex = /^(\s*)layout:\s*(.+?)(\s*)$/m;
    const match = frontmatter.frontmatter.match(layoutRegex);

    if (!match || !match[2]) {
      return {modified: false};
    }

    const indent = match[1] || '';
    const layoutValue = match[2].trim();
    const trailingSpace = match[3] || '';

    // Determine mode value based on layout value
    const modeValue = layoutValue === 'single' ? 'single' : 'custom';

    // Replace layout with mode
    const newFrontmatter = frontmatter.frontmatter.replace(layoutRegex, `${indent}mode: ${modeValue}${trailingSpace}`);

    // Reconstruct file content
    const newContent = `${frontmatter.startDelimiter}\n${newFrontmatter}\n---\n${frontmatter.body}`;

    return {
      details: {
        'Found': `layout: ${layoutValue}`,
        'Converting to': `mode: ${modeValue}`,
      },
      message: `Migrated layout to mode in ${filePath.split('/').pop()}`,
      modified: true,
      newContent,
    };
  }
}
