import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a production build. Two servers from the same build: one with
 * DATABASE_URL (real agenda) and one without (WhatsApp fallback). Run
 * `npm run build` first; `npm run test:e2e` starts both servers.
 */
const DB_PORT = 3301;
const NO_DB_PORT = 3302;

const env = { ...process.env } as Record<string, string>;
delete env.NODE_ENV;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "agenda",
      testMatch: /agenda\.spec\.ts|admin\.spec\.ts|catalog\.spec\.ts|delivery\.spec\.ts|interests\.spec\.ts|campaigns\.spec\.ts/,
      use: { baseURL: `http://localhost:${DB_PORT}` },
    },
    {
      name: "fallback",
      testMatch: /fallback\.spec\.ts/,
      use: { baseURL: `http://localhost:${NO_DB_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx next start -p ${DB_PORT}`,
      url: `http://localhost:${DB_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...env,
        ADMIN_USER: env.ADMIN_USER || "lili",
        ADMIN_PASSWORD: env.ADMIN_PASSWORD || "test-password",
        PAYMENT_BREB_KEY: env.PAYMENT_BREB_KEY || "@LILIANA729",
        PAYMENT_BREB_HOLDER: env.PAYMENT_BREB_HOLDER || "Liliana T.",
      },
    },
    {
      command: `npx next start -p ${NO_DB_PORT}`,
      url: `http://localhost:${NO_DB_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...env, DATABASE_URL: "", PAYMENT_BREB_KEY: "" },
    },
  ],
});
