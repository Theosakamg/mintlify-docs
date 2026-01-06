import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceLatest extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{% latest "..." %}} with Latest component';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-latest';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{% latest %}} with Latest component';
  }

  protected getSummaryLabel(): string {
    return 'Latest Version Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /\{\{%\s*latest\s+"([^"]+)"\s*%\}\}/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/\{\{%\s*latest\s+"([^"]+)"\s*%\}\}/g) || []).length;

    // Replace the shortcode with Latest component
    let newContent = content.replaceAll(
      /\{\{%\s*latest\s+"([^"]+)"\s*%\}\}/g,
      (_match, service) => `<Latest service="${service}" />`,
    );

    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['Latest']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{% latest "..." %}}',
        'Replaced with': '<Latest service="..." />',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
