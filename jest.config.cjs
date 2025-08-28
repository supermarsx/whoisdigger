/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  transform: {
    '^.+\\.[cm]?ts$': ['babel-jest', { configFile: './babel.config.mjs' }],
    '^.+\\.m?js$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(html-entities|p-limit|yocto-queue)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#common/(.*)\\.js$': '<rootDir>/app/ts/common/$1.ts',
    '^#main/(.*)\\.js$': '<rootDir>/app/ts/main/$1.ts',
    '^#renderer/(.*)\\.js$': '<rootDir>/app/ts/renderer/$1.ts',
    '^#utils/(.*)\\.js$': '<rootDir>/app/ts/utils/$1.ts',
    '^#ai/(.*)\\.js$': '<rootDir>/app/ts/ai/$1.ts',
    '^#cli/(.*)\\.js$': '<rootDir>/app/ts/cli/$1.ts',
    '^#server/(.*)\\.js$': '<rootDir>/app/ts/server/$1.ts',
    '^#common/(.*)$': '<rootDir>/app/ts/common/$1.ts',
    '^#main/(.*)$': '<rootDir>/app/ts/main/$1.ts',
    '^#renderer/(.*)$': '<rootDir>/app/ts/renderer/$1.ts',
    '^#utils/(.*)$': '<rootDir>/app/ts/utils/$1.ts',
    '^#ai/(.*)$': '<rootDir>/app/ts/ai/$1.ts',
    '^#cli/(.*)$': '<rootDir>/app/ts/cli/$1.ts',
    '^#server/(.*)$': '<rootDir>/app/ts/server/$1.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.cjs'],
  collectCoverage: true,
  coverageDirectory: 'coverage'
};
