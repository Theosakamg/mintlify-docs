import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceConfigfile extends BaseMigrateCommand {
  static override description = 'Replace Hugo shortcodes {{< vendor/configfile "..." >}} with config properties';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-configfile';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of {{< vendor/configfile >}} with config properties';
  }

  protected getSummaryLabel(): string {
    return 'Configfile Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains either pattern
    const shortcodePattern = /\{\{<\s*vendor\/configfile\s+"([^"]+)"\s*>\}\}/g;
    const attributePattern = /\{configFile="([^"]+)"\}/g;

    if (!shortcodePattern.test(content) && !attributePattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const shortcodeMatches = (content.match(/\{\{<\s*vendor\/configfile\s+"([^"]+)"\s*>\}\}/g) || []).length;
    const attributeMatches = (content.match(/\{configFile="([^"]+)"\}/g) || []).length;
    const totalMatches = shortcodeMatches + attributeMatches;

    // Replace the shortcode with config property
    let newContent = content.replaceAll(
      /\{\{<\s*vendor\/configfile\s+"([^"]+)"\s*>\}\}/g,
      (_match, type) => {
        // Map the type to the appropriate config path
        if (type === 'services') {
          return '<ConfigValue keyPath="configFiles.services" />';
        }

        if (type === 'app' || type === 'apps') {
          return '<ConfigValue keyPath="configFiles.app" />';
        }

        // Default fallback
        return `<ConfigValue keyPath="configFiles.${type}" />`;
      },
    );

    // Replace the {configFile="..."} attribute pattern with filename="<ConfigValue />"
    newContent = newContent.replaceAll(
      /\{configFile="([^"]+)"\}/g,
      (_match, type) => {
        // Map the type to the appropriate config path in filename attribute
        if (type === 'services') {
          return 'filename="<ConfigValue keyPath=\"configFiles.services\" />"';
        }

        if (type === 'app' || type === 'apps') {
          return 'filename="<ConfigValue keyPath=\"configFiles.app\" />"';
        }

        // Default fallback
        return `filename="<ConfigValue keyPath=\"configFiles.${type}\" />"`;
      },
    );

    // Add import if needed
    newContent = this.addImportIfNeeded(newContent, ['ConfigValue']);

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern 1': '{{< vendor/configfile "..." >}}',
        'Pattern 2': '{configFile="..."}',
        'Replaced with': '<config.configFiles.*> or filename="<config.configFiles.*>"',
        'Occurrences': `${totalMatches} (${shortcodeMatches} shortcodes + ${attributeMatches} attributes)`,
      },
      message: `Replaced ${totalMatches} occurrence(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
