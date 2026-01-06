import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceSupportedServices extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{% supported-services %}} with SupportedServices component';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-supported-services';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{% supported-services %}} with SupportedServices component';
  }

  protected getSummaryLabel(): string {
    return 'Supported Services Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /\{\{%\s*supported-services\s*%\}\}/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/\{\{%\s*supported-services\s*%\}\}/g) || []).length;

    // Replace the shortcode with SupportedServices component
    let newContent = content.replaceAll(/\{\{%\s*supported-services\s*%\}\}/g, '<SupportedServices />');

    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['SupportedServices']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{% supported-services %}}',
        'Replaced with': '<SupportedServices />',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
