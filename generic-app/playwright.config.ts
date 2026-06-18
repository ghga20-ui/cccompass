import { defineConfig, devices } from "@playwright/test";

process.env.E2E_JSON_DB_PATH ??= "evidence/task-11-e2e-db.json";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/generic_curriculum_test?schema=public";
process.env.CURRICULUM_PARSER_PROVIDER ??= "mock";
process.env.CURRICULUM_STRUCTURER_PROVIDER ??= "mock";

const e2ePort = process.env.E2E_PORT ?? "3100";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 90000,
  expect: {
    timeout: 30000,
  },
  workers: 1,
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "node tests/e2e/support/start-e2e-services.mjs",
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
