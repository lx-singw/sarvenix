module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@sarvenix/shared-types$': '<rootDir>/packages/shared-types/src',
    '^@sarvenix/knowledge-graph$': '<rootDir>/packages/knowledge-graph/src',
    '^@sarvenix/confidence-scoring$': '<rootDir>/packages/confidence-scoring/src',
  },
};
