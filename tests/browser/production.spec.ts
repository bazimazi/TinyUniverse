import { test, expect } from '@playwright/test';
test('production app caches its assets and launches without a network', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })); });
  await context.setOffline(true); await page.reload(); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click(); await expect(page.getByText('Developer tools', { exact: true })).toHaveCount(0);
  await page.getByLabel('Discovery sounds', { exact: true }).check(); await page.getByLabel('Ambient music', { exact: true }).check(); await page.getByLabel('Ambient music', { exact: true }).uncheck();
  expect(errors).toEqual([]);
});
