/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  }
};
