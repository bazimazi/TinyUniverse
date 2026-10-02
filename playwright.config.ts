import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testIgnore: '**/production.spec.ts', timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4187', headless: true },
  webServer: { command: 'npm run dev -- --port 4187 --strictPort', url: 'http://127.0.0.1:4187', reuseExistingServer: false },
  projects: [{ name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } }, { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }]
});
