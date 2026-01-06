import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceCodetabs extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{< codetabs >}} with Mintlify CodeGroup component';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-codetabs';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{< codetabs >}} with Mintlify CodeGroup';
  }

  protected getSummaryLabel(): string {
    return 'Codetabs Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const openPattern = /\{\{<\s*codetabs\s*>\}\}/g;
    const closePattern = /\{\{<\s*\/codetabs\s*>\}\}/g;

    if (!openPattern.test(content) && !closePattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const openMatches = (content.match(/\{\{<\s*codetabs\s*>\}\}/g) || []).length;
    const closeMatches = (content.match(/\{\{<\s*\/codetabs\s*>\}\}/g) || []).length;
    const totalMatches = openMatches + closeMatches;

    // Replace the shortcodes with Mintlify CodeGroup
    let newContent = content.replaceAll(/\{\{<\s*codetabs\s*>\}\}/g, '<CodeGroup>');
    newContent = newContent.replaceAll(/\{\{<\s*\/codetabs\s*>\}\}/g, '</CodeGroup>');

    // Replace +++ title=... with ```language title="..."
    // This is a simple replacement; more complex logic may be needed for actual tab content
    newContent = newContent.replaceAll(/\+{3}\s*\n\s*title=(.+)\n\s*\+{3}/g, (_match, title) => {
      return `\`\`\`yaml title="${title.trim()}"\n`;
    });

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{< codetabs >}}...{{< /codetabs >}}',
        'Replaced with': '<CodeGroup>...</CodeGroup>',
        'Occurrences': `${openMatches} blocks (${totalMatches} tags)`,
        'Note': 'Tab titles need manual review',
      },
      message: `Replaced ${openMatches} codetabs block(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
