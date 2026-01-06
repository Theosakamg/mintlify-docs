import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceVendorCli extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{% vendor/cli %}} with CLI component or config property';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-vendor-cli';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{% vendor/cli %}} with CLI component';
  }

  protected getSummaryLabel(): string {
    return 'Vendor CLI Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /\{\{%\s*vendor\/cli\s*%\}\}/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/\{\{%\s*vendor\/cli\s*%\}\}/g) || []).length;

    // Replace the shortcode with CLI component
    let newContent = content.replaceAll(/\{\{%\s*vendor\/cli\s*%\}\}/g, '<CLI />');

    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['CLI']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{% vendor/cli %}}',
        'Replaced with': '<CLI />',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
