/**
 * Pure-logic Jest config. We don't run the Expo/RN runtime here — the
 * tests target framework-agnostic modules (utils/, and any hook logic
 * that has been factored to be RN-free). If you add tests that need
 * the RN environment, switch to `jest-expo` and set testMatch to a
 * separate directory to keep pure and integration tests distinct.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
};
