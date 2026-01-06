import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class RemoveCodeTabsSeparator extends BaseMigrateCommand {
  static override description = 'Remove Hugo codetabs separator <--->';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:remove-codetabs-separator';
  }

  protected getMigrationDescription(): string {
    return 'Starting removal of <--->';
  }

  protected getSummaryLabel(): string {
    return 'CodeTabs Separator Removal Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /<--->/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/<--->/g) || []).length;

    // Remove the separator
    const newContent = content.replaceAll(/<--->/g, '');

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '<--->',
        'Replaced with': '(removed)',
        'Occurrences': matches.toString(),
      },
      message: `Removed ${matches} separator(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
