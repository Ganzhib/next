import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/server-e2e",
  outputDir: "test-results/backend",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5180",
    headless: true,
    channel: "chromium",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --import tsx tests/start-api.mjs",
      url: "http://127.0.0.1:3002/api/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 5180",
      url: "http://127.0.0.1:5180",
      env: { VITE_STORAGE_MODE: "server", API_TARGET: "http://127.0.0.1:3002" },
      reuseExistingServer: false,
    },
  ],
});
