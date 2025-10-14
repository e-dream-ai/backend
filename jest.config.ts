import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/jest.setup.ts"],
  moduleNameMapper: {
    "^(clients|constants|controllers|database|entities|middlewares|migrations|routes|schemas|script|shared|socket|transformers|types|utils)/(.*)$":
      "<rootDir>/src/$1/$2",
    "^entities$": "<rootDir>/src/entities",
    "^server$": "<rootDir>/src/server",
  },
  coverageProvider: "v8",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 50000,
  forceExit: true,
};

export default config;
