export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts', '.cts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false, useESM: true }],
    '^.+\\.cts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false, useESM: true }],
    '^.+\\.m?js$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(change-case|html-entities)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@common/(.*)\\.js$': '<rootDir>/app/ts/common/$1.ts',
    '^@main/(.*)\\.js$': '<rootDir>/app/ts/main/$1.ts',
    '^@renderer/(.*)\\.js$': '<rootDir>/app/ts/renderer/$1.ts',
    '^@utils/(.*)\\.js$': '<rootDir>/app/ts/utils/$1.ts',
    '^@ai/(.*)\\.js$': '<rootDir>/app/ts/ai/$1.ts',
    '^@cli/(.*)\\.js$': '<rootDir>/app/ts/cli/$1.ts',
    '^@server/(.*)\\.js$': '<rootDir>/app/ts/server/$1.ts'
  },
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage'
};
