import { test, expect } from '@playwright/test';
import { createUniverse } from '../../src/core/universe.ts';
import { generateSystem } from '../../src/gameplay/systems.ts';
import { serialize, SAVE_KEY } from '../../src/persistence/save.ts';
test('production app caches its assets and launches without a network', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })); });
  await context.setOffline(true); await page.reload(); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click(); await expect(page.getByText('Developer tools', { exact: true })).toHaveCount(0);
  await page.getByLabel('Discovery sounds', { exact: true }).check(); await page.getByLabel('Ambient music', { exact: true }).check(); await page.getByLabel('Ambient music', { exact: true }).uncheck();
  const imported = createUniverse(77, Date.now() - 3600000); for (let i = 0; i < 9; i++) generateSystem(imported, i);
  let workers = 0; page.on('worker', () => workers++); page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-file').setInputFiles({ name: 'universe.json', mimeType: 'application/json', buffer: Buffer.from(serialize(imported)) });
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await expect(page.locator('#age')).toContainText('1.0h'); expect(workers).toBe(1);
  expect(errors).toEqual([]);
});

test('cached production returns recover when workers are unavailable offline', async ({ page, context }) => {
  await page.addInitScript(() => { window.Worker = new Proxy(Worker, { construct() { throw new Error('Workers unavailable.'); } }); });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })); });
  await context.setOffline(true); await page.reload(); await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const imported = createUniverse(88, Date.now() - 3600000); for (let i = 0; i < 9; i++) generateSystem(imported, i);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-file').setInputFiles({ name: 'universe.json', mimeType: 'application/json', buffer: Buffer.from(serialize(imported)) });
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible(); await expect(page.locator('#age')).toContainText('1.0h');
  await expect(page.locator('#return-recovery')).toBeHidden();
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.seed).toBe(88); expect(saved.time).toBeGreaterThanOrEqual(3600); expect(errors).toEqual([]);
});
