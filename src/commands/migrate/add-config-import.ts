import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class AddConfigImport extends BaseMigrateCommand {
  static override description = 'Add ConfigValue import to MDX files that use it';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:add-config-import';
  }

  protected getMigrationDescription(): string {
    return 'Starting addition of ConfigValue import statements';
  }

  protected getSummaryLabel(): string {
    return 'Config Import Addition Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file uses ConfigValue, Latest, Variable, CLI, or SupportedServices components
    const usesComponents =
      /<ConfigValue\s/.test(content) ||
      /<Latest\s/.test(content) ||
      /<Variable\s/.test(content) ||
      /<CLI\s/.test(content) ||
      /<SupportedServices\s/.test(content);

    if (!usesComponents) {
      return {modified: false};
    }

    // Check if import already exists
    if (/import\s+.*from\s+['"]\/snippets\/config\.jsx['"]/.test(content)) {
      return {modified: false};
    }

    // Find the position after frontmatter to insert the import
    const frontmatterEnd = /^---\n[\s\S]*?\n---\n/.exec(content);
    if (!frontmatterEnd) {
      return {modified: false};
    }

    const insertPosition = frontmatterEnd[0].length;

    // Determine which imports are needed
    const imports: string[] = [];
    if (/<ConfigValue\s/.test(content)) imports.push('ConfigValue');
    if (/<Latest\s/.test(content)) imports.push('Latest');
    if (/<Variable\s/.test(content)) imports.push('Variable');
    if (/<CLI\s/.test(content)) imports.push('CLI');
    if (/<SupportedServices\s/.test(content)) imports.push('SupportedServices');

    const importStatement = `import { ${imports.join(', ')} } from '/snippets/config.jsx';\n\n`;

    const newContent =
      content.slice(0, insertPosition) +
      importStatement +
      content.slice(insertPosition);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Import added': importStatement.trim(),
        'Components found': imports.join(', '),
      },
      message: `Added import statement to ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
