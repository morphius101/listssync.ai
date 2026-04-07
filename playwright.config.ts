import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT || 3001);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `PORT=${port} NODE_ENV=development DATABASE_URL=postgres://test:test@127.0.0.1:5432/test STRIPE_SECRET_KEY=sk_test_dummy npx tsx server/index.ts`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
