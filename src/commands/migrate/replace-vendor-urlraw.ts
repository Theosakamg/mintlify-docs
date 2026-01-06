import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceVendorUrlraw extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{< vendor/urlraw "..." >}} with config property';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-vendor-urlraw';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{< vendor/urlraw >}} with config property';
  }

  protected getSummaryLabel(): string {
    return 'Vendor URL Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains the pattern
    const pattern = /\{\{<\s*vendor\/urlraw\s+"([^"]+)"\s*>\}\}/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/\{\{<\s*vendor\/urlraw\s+"([^"]+)"\s*>\}\}/g) || []).length;

    // Replace the shortcode with config property
    let newContent = content.replaceAll(
      /\{\{<\s*vendor\/urlraw\s+"([^"]+)"\s*>\}\}/g,
      (_match, type) => {
        // Map common types to config paths
        if (type === 'hostname') {
          return '<ConfigValue keyPath="vendor.hostname" />';
        }

        if (type === 'discord') {
          return '<ConfigValue keyPath="vendor.discord.url" />';
        }

        // Default fallback
        return `<ConfigValue keyPath="vendor.${type}" />`;
      },
    );

    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['ConfigValue']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '{{< vendor/urlraw "..." >}}',
        'Replaced with': '<config.vendor.*>',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
