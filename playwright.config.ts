import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ quiet: true });

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://court:court@localhost:5432/court_e2e?schema=public";

/**
 * End-to-end tests run a production build against a dedicated, freshly seeded database
 * with a small quorum so a full trial fits in one test.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec|lifecycle\.spec/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // FRESH_SERVER=1 (scripts/verify-phases.sh) always starts a new server, so back-to-back runs
    // never attach to the previous run's server while it is shutting down.
    reuseExistingServer: !process.env.CI && !process.env.FRESH_SERVER,
    timeout: 120_000,
    env: {
      DATABASE_URL,
      COURT_QUORUM: "3",
      COURT_DELIBERATION_HOURS: "24",
      ENABLE_DEMO_LOGIN: "true",
      SESSION_SECRET: "e2e-session-secret-e2e-session-secret-1234",
      SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
