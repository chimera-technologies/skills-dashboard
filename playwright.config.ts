import { defineConfig, devices } from '@playwright/test';

const port = 4317;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// scripts/test-file.mjs sets TEST_FILE to run exactly one file
const testMatch = process.env.TEST_FILE ? new RegExp(`^${escape(process.env.TEST_FILE)}$`) : '**/*.spec.ts';
const viewport = { width: 1024, height: 768 };

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch,
  forbidOnly: !!process.env.CI,
  // Full runs also write per-test results (JUnit, with screenshots as attachments) for the
  // SDLC test report and Xray, and the HTML report CI uploads (report_path).
  reporter: process.env.TEST_FILE
    ? 'line'
    : [['line'], ['junit', { outputFile: '.sdlc-results/junit-e2e.xml' }], ['html', { open: 'never' }]],
  use: { baseURL: `http://localhost:${port}`, screenshot: 'on' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
