module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/skills/**',
    '!src/ml/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  verbose: true,
  testTimeout: 10000,
  collectCoverage: false,
  setupFiles: [
    '<rootDir>/__tests__/test-setup.js'
  ]
};