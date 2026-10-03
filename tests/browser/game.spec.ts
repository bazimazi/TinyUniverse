import { test, expect } from '@playwright/test';
import { createUniverse } from '../../src/core/universe.ts';
import { advance } from '../../src/simulation/engine.ts';
import { serialize, SAVE_KEY } from '../../src/persistence/save.ts';
import { generateSystem } from '../../src/gameplay/systems.ts';
import { discoverGalaxy } from '../../src/gameplay/galaxies.ts';
import { foundCivilization } from '../../src/simulation/civilizations.ts';
import { TECHNOLOGIES } from '../../src/core/technology.ts';
import { findAnomaly } from '../../src/gameplay/discoveries.ts';
import { simulateDiscoveries } from '../../src/simulation/discoveries.ts';
test('first upgrade, selection, accessible settings and reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/phase-1-${test.info().project.name}.png`, fullPage: true });
  await page.screenshot({ path: `artifacts/current-start-${test.info().project.name}.png` });
  await page.getByRole('button', { name: '15 minerals · 8.0 matter', exact: true }).click();
  await expect(page.locator('#rate-energy')).toHaveText('+4.0 /s');
  expect(await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).objects['planet-0'].upgrades.solar, SAVE_KEY)).toBe(1);
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.reload();
  await expect(page.locator('#rate-energy')).toHaveText('+4.0 /s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('atlas, codex, rename and rebirth remain usable in portrait and desktop', async ({ page }) => {
  const state = createUniverse(12, Date.now()); generateSystem(state, 0); discoverGalaxy(state, 1);
  state.totalUpgrades = 12; state.objects['planet-0'].planet!.habitability = 0.8; state.exploration.completed.orbital = 3;
  const civ = foundCivilization(state, 'planet-0'); civ.technologies = Object.keys(TECHNOLOGIES); civ.level = 11;
  state.megastructures.test = { id: 'test', type: 'dyson', civilizationId: civ.id, systemId: 'system-0', startedAt: 0, endsAt: 0, status: 'complete' };
  findAnomaly(state, 'planet-0', 0); simulateDiscoveries(state);
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Galaxy', exact: true }).click();
  await page.getByRole('button', { name: 'Atlas', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Cosmic atlas' })).toBeVisible();
  await page.screenshot({ path: `artifacts/final-atlas-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Discoveries', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Discovery Codex' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  page.once('dialog', dialog => dialog.accept('My little world')); await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByRole('button', { name: 'Favorite', exact: true }).click(); await expect(page.getByRole('button', { name: 'Favorited', exact: true })).toBeVisible();
  await page.getByLabel('Large text', { exact: true }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Rebirth', exact: true }).click(); await page.locator('#rebirth-seed').fill('777');
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: /Rebirth · earn/ }).click();
  await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).meta.runs, SAVE_KEY)).toBe(1);
  expect(errors).toEqual([]);
});
test('a large offline return runs in a worker and restores the atlas', async ({ page }) => {
  const state = createUniverse(42, Date.now() - 3600000); for (let i = 0; i < 9; i++) generateSystem(state, i);
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await expect(page.locator('#age')).toContainText('1.0h');
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await expect(page.getByLabel('Net resource changes').locator('strong').first()).toHaveText(/^\+/);
  await page.locator('#offline-report').screenshot({ path: `artifacts/return-summary-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Open journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Universe journal' })).toBeVisible();
  await expect(page.locator('#offline-report')).toBeHidden();
  await page.getByRole('button', { name: 'Atlas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cosmic atlas' })).toBeVisible(); expect(errors).toEqual([]);
});
test('evolved world exposes civilization history and working intervention', async ({ page }) => {
  const state = createUniverse(12, 0); advance(state, 7200); state.lastTimestamp = Date.now(); state.resources.energy = 10000; state.resources.matter = 10000;
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await page.getByRole('button', { name: 'Life', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Living worlds' })).toBeVisible();
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Influence', exact: true }).click();
  await page.locator('.card').filter({ hasText: 'Gentle terraforming' }).getByRole('button').click();
  await expect(page.locator('.card').filter({ hasText: 'Gentle terraforming' }).getByRole('button')).toBeDisabled();
  await expect(page.getByRole('button', { name: '2×', exact: true })).toBeVisible();
});

test('a visible browser stall catches up once at the offline rate', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(41, timestamp);
  foundCivilization(state, 'planet-0').technologies = ['spaceflight']; state.speed = 5;
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(timestamp + 1000));
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  const before = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).time as number, SAVE_KEY);
  await page.clock.fastForward(60000);
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  const after = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).time as number, SAVE_KEY);
  expect(after - before).toBeGreaterThanOrEqual(59); expect(after - before).toBeLessThanOrEqual(61);
  await page.getByRole('button', { name: 'Continue exploring', exact: true }).click();
  await page.clock.runFor(1000); await page.getByRole('button', { name: 'Save now', exact: true }).click();
  const live = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).time as number, SAVE_KEY);
  expect(live - after).toBeGreaterThanOrEqual(4.9); expect(live - after).toBeLessThanOrEqual(5.1);
  await expect(page.locator('#offline-report')).toBeHidden();
});

test('large save imports catch up in a worker and invalid imports preserve progress', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const imported = createUniverse(77, Date.now() - 3600000); for (let i = 0; i < 9; i++) generateSystem(imported, i);
  let workers = 0; page.on('worker', () => workers++);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-file').setInputFiles({ name: 'universe.json', mimeType: 'application/json', buffer: Buffer.from(serialize(imported)) });
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await expect(page.locator('#toast')).toHaveText('Your universe has been restored.');
  expect(workers).toBe(1);
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.seed).toBe(77); expect(saved.time).toBeGreaterThanOrEqual(3600);
  await page.locator('#import-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"TinyUniverse","payload":"{}","checksum":0}') });
  await expect(page.locator('#toast')).toHaveText('Save file is incomplete or corrupted.');
  expect(await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).seed, SAVE_KEY)).toBe(77);
});

test('open civilization histories stay with their civilization when following reorders cards', async ({ page }) => {
  const state = createUniverse(41, Date.now()); generateSystem(state, 0);
  const a = foundCivilization(state, 'planet-0'), b = foundCivilization(state, 'galaxy-0-system-0-planet-0');
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await page.getByRole('button', { name: 'Life', exact: true }).click();
  const history = page.locator(`details[data-details-key="${a.id}"]`);
  await history.locator('summary').click();
  await page.locator(`[data-action="follow"][data-value="${b.id}"]`).click();
  await expect(history).toHaveAttribute('open', '');
  await expect(page.locator(`details[data-details-key="${b.id}"]`)).not.toHaveAttribute('open', '');
});

test('the suggested step opens its world and shows evolution and upgrade estimates', async ({ page }) => {
  const state = createUniverse(41, Date.now()); state.selectedId = 'star-0';
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Solace', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Develop Aurelia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Evolution toward complex life' })).toBeVisible();
  await expect(page.locator('.card').filter({ hasText: 'Solar collection' })).toContainText('Ready to build');
  await expect(page.locator('.card').filter({ hasText: 'Ocean expansion' })).toContainText('at 1× production');
  await page.screenshot({ path: `artifacts/phase-13-${test.info().project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('canvas work pauses outside the viewport while production continues, then resumes', async ({ page }) => {
  const timestamp = Date.now(); await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(() => {
    const stats = window as unknown as { sceneDraws: number }; stats.sceneDraws = 0;
    const original = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (this: CanvasRenderingContext2D, x, y, w, h) { stats.sceneDraws++; original.call(this, x, y, w, h); };
  });
  const draws = () => page.evaluate(() => (window as unknown as { sceneDraws: number }).sceneDraws);
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(timestamp + 1000));
  await page.clock.runFor(1000); expect(await draws()).toBeGreaterThan(20);
  await page.locator('.observatory').evaluate(element => { (element as HTMLElement).style.transform = 'translateX(-300vw)'; });
  await expect.poll(async () => { const before = await draws(); await page.clock.runFor(300); return await draws() - before; }).toBe(0);
  const asleep = await draws(), energy = Number(await page.locator('#amount-energy').textContent());
  await page.clock.runFor(1000);
  expect(Number(await page.locator('#amount-energy').textContent())).toBeGreaterThan(energy); expect(await draws()).toBe(asleep);
  await page.locator('.observatory').evaluate(element => { (element as HTMLElement).style.transform = ''; });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(async () => { await page.clock.runFor(100); return await draws(); }).toBeGreaterThan(asleep);
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click(); await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.clock.runFor(300); const before = await draws(); await page.clock.runFor(1000);
  const count = await draws() - before; expect(count).toBeGreaterThanOrEqual(3); expect(count).toBeLessThanOrEqual(5);
});

test('crowded favorites preserve the selected world and late navigation remains reachable', async ({ page }) => {
  const state = createUniverse(41, Date.now()); for (let i = 0; i < 17; i++) generateSystem(state, i);
  discoverGalaxy(state, 1); state.totalUpgrades = 12;
  foundCivilization(state, 'planet-0').technologies = Object.keys(TECHNOLOGIES);
  for (const object of Object.values(state.objects)) object.favorite = true;
  const selected = Object.values(state.objects).filter(o => o.planet).at(-1)!; selected.favorite = false; state.selectedId = selected.id;
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await expect(page.locator('#worlds [aria-pressed="true"]')).toContainText(selected.name);
  expect(await page.locator('#worlds button').count()).toBeLessThanOrEqual(40);
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click(); await page.getByLabel('Large text', { exact: true }).check();
  await page.getByRole('button', { name: 'Rebirth', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Another Big Bang' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Another Big Bang' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Rebirth', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/current-navigation-${test.info().project.name}.png` });
  await page.screenshot({ path: `artifacts/phase-14-${test.info().project.name}.png`, fullPage: true });
});

test('automation explains its next action, persists toggles and develops during a return', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(41, timestamp);
  foundCivilization(state, 'planet-0').technologies = ['ai'];
  state.resources = { ...state.resources, energy: 1000, minerals: 1000, matter: 0 };
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); }, { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(timestamp + 1000));
  await page.getByRole('button', { name: 'Rebirth', exact: true }).click();
  const toggle = page.getByLabel('Automatic planet development', { exact: true });
  await expect(page.locator('[data-automation-status="develop"]')).toHaveText('Paused.');
  await toggle.check();
  await expect(page.locator('[data-automation-status="develop"]')).toContainText('Next: Atmosphere stabilization on Aurelia.');
  await page.screenshot({ path: `artifacts/phase-15-${test.info().project.name}.png`, fullPage: true });
  await page.clock.fastForward(60000);
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.totalUpgrades).toBe(1); expect(saved.automation.develop).toBe(true);
  await page.reload(); await page.getByRole('button', { name: 'Rebirth', exact: true }).click();
  await expect(toggle).toBeChecked(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a worker script that fails to load falls back without losing the return', async ({ page }) => {
  const state = createUniverse(41, Date.now() - 3600000); for (let i = 0; i < 9; i++) generateSystem(state, i);
  let failures = 0; const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/offline\.worker/, route => { failures++; return route.abort(); });
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await expect(page.locator('#age')).toContainText('1.0h'); await expect(page.locator('#return-recovery')).toBeHidden();
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.seed).toBe(41); expect(saved.time).toBeGreaterThanOrEqual(3600); expect(failures).toBe(1); expect(errors).toEqual([]);
});

test('a simulation failure protects the save and permits export, settings and a successful retry', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(41, timestamp - 3600000); for (let i = 0; i < 9; i++) generateSystem(state, i);
  const original = serialize(state); await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => {
    localStorage.setItem(key, save);
    const flags = window as unknown as { failWorker: boolean }; flags.failWorker = true;
    const OriginalWorker = Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: unknown): void {
        if (flags.failWorker) queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { error: 'Simulation needs repair: <world>' } })));
        else super.postMessage(message);
      }
    };
  }, { key: SAVE_KEY, save: original });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Your return needs another try' })).toBeVisible();
  await expect(page.locator('#return-recovery')).toContainText('Simulation needs repair: <world>');
  expect(await page.locator('#return-recovery world').count()).toBe(0);
  await page.clock.pauseAt(new Date(timestamp + 1000)); await page.clock.fastForward(60000);
  await expect(page.locator('#age')).toHaveText('0m 0s');
  await page.getByRole('button', { name: '15 minerals · 8.0 matter', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(original);
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export saved universe', exact: true }).click();
  expect((await downloading).suggestedFilename()).toBe('tiny-universe-41.json');
  await page.locator('#return-recovery').screenshot({ path: `artifacts/phase-16-recovery-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Open Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save now', exact: true })).toBeVisible();
  await page.evaluate(() => { (window as unknown as { failWorker: boolean }).failWorker = false; });
  await page.getByRole('button', { name: 'Retry return', exact: true }).click();
  await expect(page.locator('#return-recovery')).toBeHidden(); await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.seed).toBe(41); expect(saved.time).toBeGreaterThanOrEqual(3660); expect(saved.time).toBeLessThan(3662);
});

test('an imported universe that fails simulation leaves the current game playable', async ({ page }) => {
  await page.addInitScript(() => {
    const OriginalWorker = Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(): void { queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { error: 'Imported simulation failed.' } }))); }
    };
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const before = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload).seed, SAVE_KEY);
  const imported = createUniverse(77, Date.now() - 3600000); for (let i = 0; i < 9; i++) generateSystem(imported, i);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-file').setInputFiles({ name: 'universe.json', mimeType: 'application/json', buffer: Buffer.from(serialize(imported)) });
  await expect(page.locator('#toast')).toHaveText('Imported simulation failed.'); await expect(page.locator('#return-recovery')).toBeHidden();
  await page.getByRole('button', { name: 'Develop', exact: true }).click();
  await page.getByRole('button', { name: '15 minerals · 8.0 matter', exact: true }).click();
  await expect(page.locator('#rate-energy')).toHaveText('+4.0 /s');
  const after = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(after.seed).toBe(before); expect(after.objects['planet-0'].upgrades.solar).toBe(1);
});

test('orbital pull previews climate, saves movement and shares recovery with push', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(41, timestamp);
  foundCivilization(state, 'planet-0').technologies = ['spaceflight', 'gravity'];
  state.resources.energy = state.resources.matter = state.resources.knowledge = 10000;
  state.objects['planet-0'].orbit!.radius = 800; state.objects['planet-0'].planet!.gravity = 4;
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); }, { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(timestamp + 1000)); await page.getByRole('button', { name: 'Influence', exact: true }).click();
  await expect(page.locator('[data-ability="push"] button')).toBeDisabled();
  await expect(page.locator('[data-ability="push"]')).toContainText('cannot move farther outward');
  await expect(page.locator('[data-ability="gravityUp"] button')).toBeDisabled();
  await expect(page.locator('[data-ability="pull"]')).toContainText('temperature 288K → 304K');
  await page.locator('[data-ability="pull"] button').click();
  await expect(page.locator('[data-ability="push"] button')).toBeDisabled(); await expect(page.locator('[data-ability="pull"] button')).toBeDisabled();
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.objects['planet-0'].orbit.radius).toBeCloseTo(800 / 1.12, 8);
  expect(saved.objects['planet-0'].planet.temperature).toBeGreaterThan(288);
  await page.locator('[data-ability="pull"]').screenshot({ path: `artifacts/phase-17-${test.info().project.name}.png` });
  await page.reload(); await page.getByRole('button', { name: 'Influence', exact: true }).click();
  await expect(page.locator('[data-ability="pull"] button')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
