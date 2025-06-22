const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.jest }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-unused-vars': 'error'
    }
  }
];
