import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8888';
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const shouldStartServer = process.env.PLAYWRIGHT_START_SERVER === '1';

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    channel: browserChannel,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  webServer: shouldStartServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 8888',
        url: `${baseURL}/#/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
