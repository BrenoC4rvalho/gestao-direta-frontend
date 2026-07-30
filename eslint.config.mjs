import angular from '@angular-eslint/eslint-plugin';
import templateParser from '@angular-eslint/template-parser';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.angular/**', 'coverage/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@angular-eslint': angular,
    },
    rules: {},
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: templateParser,
    },
    rules: {},
  },
];
