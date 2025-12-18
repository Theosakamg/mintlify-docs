import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceVendorName extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{% vendor/name %}} with config property';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-vendor-name';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{% vendor/name %}} with config property';
  }

  protected getSummaryLabel(): string {
    return 'Vendor Name Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /\{\{%\s*vendor\/name\s*%\}\}/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/\{\{%\s*vendor\/name\s*%\}\}/g) || []).length;

    // Replace the shortcode with ConfigValue component
    let newContent = content.replaceAll(/\{\{%\s*vendor\/name\s*%\}\}/g, '<ConfigValue keyPath="vendorName" />');
    
    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['ConfigValue']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{% vendor/name %}}',
        'Replaced with': '<ConfigValue keyPath="vendorName" />',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
