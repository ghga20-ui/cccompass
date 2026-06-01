import { defineConfig, devices } from "@playwright/test";

process.env.E2E_JSON_DB_PATH ??= "evidence/task-11-e2e-db.json";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/generic_curriculum_test?schema=public";
process.env.CURRICULUM_PARSER_PROVIDER ??= "mock";
process.env.CURRICULUM_STRUCTURER_PROVIDER ??= "mock";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
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
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
