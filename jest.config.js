export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }],
    '^.+\\.m?js$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(change-case|html-entities)/)'],
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage'
};
