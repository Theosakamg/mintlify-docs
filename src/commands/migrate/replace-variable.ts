import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceVariable extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{<variable "..." >}} with Variable component';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-variable';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{<variable >}} with Variable component';
  }

  protected getSummaryLabel(): string {
    return 'Variable Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /\{\{<\s*variable\s+"([^"]+)"\s*>\}\}/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/\{\{<\s*variable\s+"([^"]+)"\s*>\}\}/g) || []).length;

    // Replace the shortcode with Variable component
    let newContent = content.replaceAll(
      /\{\{<\s*variable\s+"([^"]+)"\s*>\}\}/g,
      (_match, name) => `<Variable name="${name}" />`,
    );

    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['Variable']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{<variable "..." >}}',
        'Replaced with': '<Variable name="..." />',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
