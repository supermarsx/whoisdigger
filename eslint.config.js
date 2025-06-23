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
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        jQuery: 'readonly',
        $: 'readonly',
        ipcRenderer: 'readonly',
        remote: 'readonly',
        settings: 'readonly',
        HTMLElement: 'readonly'
      }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-fallthrough': 'off',
      'no-prototype-builtins': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'off'
    }
  }
];
