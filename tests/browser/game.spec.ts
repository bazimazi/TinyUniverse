import { test, expect } from '@playwright/test';
test('first upgrade, selection, accessible settings and reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/phase-1-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: '15 minerals · 8.0 matter', exact: true }).click();
  await expect(page.locator('#rate-energy')).toHaveText('+4.0 /s');
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.reload();
  await expect(page.locator('#rate-energy')).toHaveText('+4.0 /s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
