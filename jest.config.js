export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  transform: {},
  testTimeout: 60000,
  collectCoverageFrom: ["src/**/*.js", "!src/config/passport.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
