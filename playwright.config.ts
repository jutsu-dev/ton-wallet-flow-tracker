import { defineConfig, devices } from '@playwright/test';

// E2E runs against an already-running instance (started in the deploy/test phase).
// Set E2E_BASE_URL to point at it; defaults to the local demo instance.
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
