module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }]
  },
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage'
};
