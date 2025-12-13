import {includeIgnoreFile} from '@eslint/compat';
import oclif from 'eslint-config-oclif';
import prettier from 'eslint-config-prettier';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore');

export default [
  includeIgnoreFile(gitignorePath),
  ...oclif,
  prettier,
  {
    ignores: [
      '.prettierrc.cjs',
      'contents/**',
      'unicorn/no-array-for-each',
      'prefer-destructuring',
    ],
  },
  {
    rules: {
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-union-types': 'off',
      'perfectionist/sort-interfaces': 'off',
      'perfectionist/sort-classes': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-await-in-loop': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unsupported-features/es-builtins': 'off',
      '@stylistic/indent-binary-ops': 'off',
    },
  },
];
