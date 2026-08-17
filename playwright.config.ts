import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './demo',
  outputDir: './demo-output/test-results',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env['DEMO_BASE_URL'] ?? 'http://localhost:4200',
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'apresentacao', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4200',
    url: process.env['DEMO_BASE_URL'] ?? 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
