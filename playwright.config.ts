import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:5178",
    browserName: "chromium",
    channel: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5178",
    env: { VITE_STORAGE_MODE: "local" },
    url: "http://127.0.0.1:5178",
    reuseExistingServer: false,
  },
  workers: 1,
});
