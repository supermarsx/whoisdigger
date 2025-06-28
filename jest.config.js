export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false, useESM: true }],
    '^.+\\.m?js$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(change-case|html-entities)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage'
};
