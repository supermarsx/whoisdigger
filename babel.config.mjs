export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' }
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: [
    'babel-plugin-jest-hoist',
    ['babel-plugin-transform-import-meta', { module: 'CommonJS' }]
  ]
};
