import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Vitest provides these as globals when `globals: true` is set in the Vitest
// config, so they must not be flagged as `no-undef` in test files.
const vitestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  vi: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  suite: "readonly",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ignore build artifacts, dependencies, coverage output, and the generated
  // Prisma client so lint focuses on authored source (.ts/.tsx) only.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional build/tooling artifacts:
    "node_modules/**",
    "coverage/**",
    // Generated Prisma client (no need to lint generated code):
    "src/generated/**",
    "**/generated/prisma/**",
    "prisma/generated/**",
  ]),
  // Test files (including future *.test.ts/tsx) use Vitest globals.
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: vitestGlobals,
    },
  },
]);

export default eslintConfig;
