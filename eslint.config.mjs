import tsParser from '@typescript-eslint/parser';

const commonIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.claude/**',
];

export default [
  {
    ignores: commonIgnores,
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-debugger': 'error',
      'no-constant-binary-expression': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
    },
    rules: {
      'no-debugger': 'error',
      'no-constant-binary-expression': 'error',
    },
  },
];
