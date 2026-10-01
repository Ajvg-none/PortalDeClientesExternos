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
  // ts-jest debe usar tsconfig.test.json (que incluye "jest" en types) y no
  // tsconfig.json (solo "node"), para que 'test', 'expect' y 'jest' estén
  // disponibles en los suites unitarios sin romper el build de producción.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};