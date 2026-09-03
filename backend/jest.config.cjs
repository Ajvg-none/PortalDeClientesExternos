/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Por defecto la suite unitaria NO incluye los tests de integración (requieren BD):
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  verbose: true,
};
