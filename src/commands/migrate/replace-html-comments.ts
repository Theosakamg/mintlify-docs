import {globalExamples} from '../../config.js';
import {BaseMigrateCommand, type FileProcessingResult, type FrontmatterData} from '../../base-migrate-command.js';

export default class ReplaceHtmlComments extends BaseMigrateCommand {
  static override description = 'Replace HTML comments <!-- ... --> with MDX comments {/* ... */}';
  static override examples = ['<%= config.bin %> <%= command.id %>', ...globalExamples];
  static override flags = {
    ...BaseMigrateCommand.baseFlags,
  };

  protected getLoggerName(): string {
    return 'migrate:replace-html-comments';
  }

  protected getMigrationDescription(): string {
    return 'Starting replacement of HTML comments with MDX comments';
  }

  protected getSummaryLabel(): string {
    return 'HTML Comments Replacement Summary';
  }

  protected processFile(
    filePath: string,
    content: string,
    _frontmatter: FrontmatterData,
  ): FileProcessingResult {
    // Check if file contains HTML comments
    const pattern = /<!--\s*([\s\S]*?)\s*-->/g;
    if (!pattern.test(content)) {
      return {modified: false};
    }

    // Count matches before replacement
    const matches = (content.match(/<!--\s*([\s\S]*?)\s*-->/g) || []).length;

    // Replace HTML comments with MDX comments
    const newContent = content.replaceAll(
      /<!--\s*([\s\S]*?)\s*-->/g,
      (_match, commentContent) => {
        // Trim whitespace from the comment content
        const trimmedContent = commentContent.trim();
        return `{/* ${trimmedContent} */}`;
      },
    );

    const fileName = filePath.split('/').pop() || filePath;

    return {
      details: {
        'Pattern': '<!-- ... -->',
        'Replaced with': '{/* ... */}',
        'Occurrences': matches.toString(),
      },
      message: `Replaced ${matches} HTML comment(s) in ${fileName}`,
      modified: true,
      newContent,
    };
  }
}
