import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/**
 * The suite exists mainly to hold the mobile navigation to its accessibility
 * contract, which only reproduces below the `lg` breakpoint — above it the
 * panel is `display: none` and every focus assertion silently passes.
 * Both locales run because `ar` is RTL and mirrors the layout.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'mobile-fr',
      use: { ...devices['iPhone 13'], locale: 'fr-FR' },
    },
    {
      name: 'mobile-ar',
      use: { ...devices['iPhone 13'], locale: 'ar-DZ' },
    },
  ],

  // Reuse a dev server if one is already up, otherwise start one.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
