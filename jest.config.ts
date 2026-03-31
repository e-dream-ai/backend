import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
    "^.+\\.(js|mjs)x?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/jest.setup.ts"],
  moduleNameMapper: {
    "^(clients|constants|controllers|database|middlewares|migrations|routes|schemas|script|services|shared|socket|transformers|types|utils)/(.*)$":
      "<rootDir>/src/$1/$2",
    "^entities$": "<rootDir>/src/entities",
    "^entities/(?!lib/)(.*)$": "<rootDir>/src/entities/$1",
    "^server$": "<rootDir>/src/server",
  },
  coverageProvider: "v8",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
  transformIgnorePatterns: ["node_modules/(?!.*/uuid/.*|.*/uuid@.*|uuid/.*)"],
  testTimeout: 50000,
  forceExit: true,
};

export default config;
