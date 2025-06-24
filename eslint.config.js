const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

// Trim any accidental whitespace from global names provided by the `globals`
// package. Older versions contain a key `AudioWorkletGlobalScope ` with a
// trailing space which breaks ESLint's flat config parser.
const trimmedBrowserGlobals = Object.fromEntries(
  Object.entries(globals.browser).map(([key, value]) => [key.trim(), value])
);

module.exports = [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...trimmedBrowserGlobals,
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
