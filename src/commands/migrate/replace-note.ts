import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceNote extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{< note >}} with Mintlify Callout component';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-note';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{< note >}} with Mintlify Callout';
  }

  protected getSummaryLabel(): string {
    return 'Note/Callout Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const openPattern = /\{\{<\s*note\s*>\}\}/g;
    const closePattern = /\{\{<\s*\/note\s*>\}\}/g;
    if (!openPattern.test(content) && !closePattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const openMatches = (content.match(/\{\{<\s*note\s*>\}\}/g) || []).length;
    const closeMatches = (content.match(/\{\{<\s*\/note\s*>\}\}/g) || []).length;
    const totalMatches = openMatches + closeMatches;

    // Replace the shortcodes with Mintlify Callout
    let newContent = content.replaceAll(/\{\{<\s*note\s*>\}\}/g, '<Note>');
    newContent = newContent.replaceAll(/\{\{<\s*\/note\s*>\}\}/g, '</Note>');

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{< note >}}...{{< /note >}}',
        'Replaced with': '<Note>...</Note>',
        'Occurrences': `${openMatches} blocks (${totalMatches} tags)`,
      },
      message: `Replaced ${openMatches} note block(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
