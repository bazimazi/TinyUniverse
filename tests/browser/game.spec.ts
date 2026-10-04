import { test, expect } from '@playwright/test';
import { createUniverse, makeObject } from '../../src/core/universe.ts';
import { hash } from '../../src/core/random.ts';
import { advance } from '../../src/simulation/engine.ts';
import { serialize, SAVE_KEY } from '../../src/persistence/save.ts';
import { generateSystem } from '../../src/gameplay/systems.ts';
import { discoverGalaxy } from '../../src/gameplay/galaxies.ts';
import { foundCivilization } from '../../src/simulation/civilizations.ts';
import { TECHNOLOGIES } from '../../src/core/technology.ts';
import { findAnomaly } from '../../src/gameplay/discoveries.ts';
import { simulateDiscoveries } from '../../src/simulation/discoveries.ts';
import { collapse } from '../../src/simulation/civilizations.ts';
import { SAVE_VERSION } from '../../src/core/config.ts';
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

test('colony navigation, shared support and immediate mediation persist across reload', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(12, timestamp);
  const colony = makeObject(state.seed, 'managed-colony', 'planet', 'star-0'), neighbor = makeObject(state.seed, 'neighbor', 'planet', 'star-0');
  colony.name = 'Quiet shore'; neighbor.name = 'Other shore';
  for (const world of [colony, neighbor]) { state.objects[world.id] = world; state.objects['star-0'].children.push(world.id); }
  const civ = foundCivilization(state, 'planet-0'), other = foundCivilization(state, neighbor.id);
  civ.name = 'Shore keepers'; civ.colonies.push(colony.id); civ.researching = 'spaceflight'; civ.technologies = ['spaceflight']; other.technologies = ['spaceflight'];
  const id = [civ.id, other.id].sort().join('|'); state.relations[id] = { id, a: civ.id, b: other.id, score: -60, status: 'war', lastUpdate: 0 };
  const ruin = makeObject(state.seed, 'ruin', 'planet', 'star-0'); state.objects[ruin.id] = ruin; state.objects['star-0'].children.push(ruin.id);
  const fallen = foundCivilization(state, ruin.id); collapse(state, fallen, 'Test collapse.');
  const archivedId = [civ.id, fallen.id].sort().join('|'); state.relations[archivedId] = { id: archivedId, a: civ.id, b: fallen.id, score: -60, status: 'war', lastUpdate: 0 };
  state.resources.energy = state.resources.minerals = state.resources.knowledge = 10000;
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); }, { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await page.clock.pauseAt(new Date(timestamp + 1000));
  await page.getByRole('button', { name: 'Life', exact: true }).click();
  const civCard = page.locator('.card').filter({ hasText: 'Shore keepers' }).filter({ has: page.locator('summary', { hasText: 'Colonies' }) });
  await civCard.getByText('Colonies · 1', { exact: true }).click(); await civCard.getByRole('button', { name: 'Visit Quiet shore', exact: true }).click();
  await page.getByRole('button', { name: 'Develop', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Quiet shore', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Influence', exact: true }).click();
  const gift = page.locator('[data-ability="gift"]'); await expect(gift).toContainText('Supports Shore keepers across 2 settled worlds');
  await gift.getByRole('button').click(); await page.locator('[data-ability="inspire"]').getByRole('button').click();
  await page.getByRole('button', { name: 'Life', exact: true }).click();
  const relation = page.locator('[data-relation]').filter({ hasText: 'Shore keepers & ' + other.name });
  await relation.getByRole('button', { name: /Mediate/ }).click(); await expect(relation).toContainText('neutral · trust -30 / 100');
  const archived = page.locator('[data-relation]').filter({ hasText: fallen.name }); await expect(archived).toContainText('Archived · last recorded war'); await expect(archived.getByRole('button')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Visit home world', exact: true })).toBeVisible();
  await page.locator('#panel').screenshot({ path: `artifacts/phase-19-colonies-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Visit home world', exact: true }).click(); await page.getByRole('button', { name: 'Influence', exact: true }).click();
  await expect(page.locator('[data-ability="gift"]').getByRole('button')).toBeDisabled(); await expect(page.locator('[data-ability="inspire"]').getByRole('button')).toBeDisabled();
  await page.reload(); await page.getByRole('button', { name: 'Life', exact: true }).click(); await expect(relation).toContainText('neutral · trust -30 / 100');
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.civilizations[civ.id].supportUntil).toBeGreaterThan(saved.time); expect(saved.civilizations[civ.id].researchPoints).toBe(120);
  expect(saved.cooldowns['gift:planet-0']).toBeGreaterThan(saved.time); expect(saved.relations[id].status).toBe('neutral');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('stellar warnings offer fusion suppression and protection survives reload and offline arrival', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(7, timestamp); advance(state, 900);
  const civ = Object.values(state.civilizations)[0] ?? foundCivilization(state, 'planet-0'); civ.technologies = ['fusion'];
  state.resources.energy = state.resources.knowledge = 10000;
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); }, { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await page.clock.pauseAt(new Date(timestamp + 1000));
  await expect(page.locator('[data-stellar-activity]')).toContainText('Flare expected in');
  await page.getByRole('button', { name: 'Observe Solace', exact: true }).click(); await page.getByRole('button', { name: 'Stellar influence', exact: true }).click();
  await expect(page.locator('[data-ability]').first()).toHaveAttribute('data-ability', 'suppress');
  const suppress = page.locator('[data-ability="suppress"]'); await suppress.getByRole('button').click();
  await expect(page.locator('[data-stellar-activity]')).toContainText('Stellar suppression covers its arrival'); await expect(suppress.getByRole('button')).toBeDisabled();
  await suppress.screenshot({ path: `artifacts/phase-20-suppression-${test.info().project.name}.png` });
  await page.reload(); await expect(page.locator('[data-stellar-activity]')).toContainText('Stellar suppression covers its arrival');
  await page.locator('[data-stellar-activity]').screenshot({ path: `artifacts/phase-20-warning-${test.info().project.name}.png` });
  await page.clock.fastForward(90000); await expect(page.locator('#offline-report')).toBeVisible();
  await expect(page.locator('[data-stellar-activity]')).toContainText('Suppression remaining'); await expect(page.locator('[data-stellar-activity]')).not.toContainText('Flare expected');
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.version).toBe(SAVE_VERSION); expect(saved.objects['star-0'].stellar.flareAt).toBeNull();
  expect(saved.events.filter((e: { type: string }) => e.type === 'StellarFlareSuppressed')).toHaveLength(1);
  expect(saved.events.filter((e: { type: string }) => e.type === 'StellarFlareImpact')).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('colony construction uses its star, explains unsuitable projects and completes offline', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(12, timestamp), system = generateSystem(state, 0);
  const colony = state.objects[state.objects[system.starId].children.find(id => state.objects[id].planet)!], star = state.objects[system.starId];
  system.name = 'Distant forge'; colony.name = 'Forge colony'; star.type = 'black-hole'; star.stellar!.stage = 'remnant'; star.stellar!.luminosity = 0.025;
  const civ = foundCivilization(state, 'planet-0'); civ.technologies = ['spaceflight', 'interstellar', 'dyson', 'spacetime']; civ.colonies.push(colony.id);
  state.selectedId = colony.id; state.resources.minerals = state.resources.exotic = state.resources.matter = state.resources.knowledge = 100000;
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); }, { key: SAVE_KEY, save: serialize(state) });
  await page.goto('/'); await page.clock.pauseAt(new Date(timestamp + 1000)); await page.getByRole('button', { name: 'Life', exact: true }).click();
  await expect(page.locator('#panel')).toContainText('the selected settled world’s system');
  const dyson = page.locator('[data-structure="dyson"]'), collector = page.locator('[data-structure="black-hole-generator"]');
  await expect(dyson).toContainText('A Dyson swarm needs a luminous star'); await expect(dyson.getByRole('button')).toBeDisabled();
  await collector.getByRole('button').click(); await expect(collector).toContainText('Building');
  await collector.screenshot({ path: `artifacts/phase-21-construction-${test.info().project.name}.png` });
  await page.reload(); await page.getByRole('button', { name: 'Life', exact: true }).click(); await expect(collector).toContainText('Building');
  await page.clock.fastForward(1200000); await expect(collector).toContainText('Complete');
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  const structure = Object.values(saved.megastructures).find((s: any) => s.type === 'black-hole-generator') as any;
  expect(structure.systemId).toBe(system.id); expect(structure.status).toBe('complete'); expect(saved.resources.exotic).toBeGreaterThan(99500);
  await page.getByRole('button', { name: 'Visit home world', exact: true }).click(); await expect(collector).toContainText('needs a black hole'); await expect(collector.getByRole('button')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('old saves opt into automatic mining, report new outposts and retain the choice after reload', async ({ page }) => {
  const timestamp = Date.now(), state = createUniverse(41, timestamp); state.totalUpgrades = 2;
  foundCivilization(state, 'planet-0').technologies = ['ai']; state.resources.energy = state.resources.matter = 1000;
  const asteroid = makeObject(state.seed, 'test-asteroid', 'asteroid', 'star-0'); asteroid.name = 'Little seam'; asteroid.deposit = 200;
  state.objects[asteroid.id] = asteroid; state.objects['star-0'].children.push(asteroid.id);
  const legacy = JSON.parse(JSON.stringify(state)); legacy.version = 10; delete legacy.automation.mine;
  const payload = JSON.stringify(legacy), save = JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload });
  await page.clock.install({ time: new Date(timestamp) });
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, save); }, { key: SAVE_KEY, save });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Aurelia', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(timestamp + 1000)); await page.getByRole('button', { name: 'Rebirth', exact: true }).click();
  const toggle = page.getByLabel('Automatic asteroid mining', { exact: true }); await expect(toggle).not.toBeChecked(); await toggle.check();
  await expect(page.locator('[data-automation-status="mine"]')).toContainText('Next: mining outpost on Little seam.');
  await page.clock.fastForward(60000); await expect(page.locator('#offline-report')).toContainText('1 mining outpost built');
  const saved = await page.evaluate(key => JSON.parse(JSON.parse(localStorage.getItem(key)!).payload), SAVE_KEY);
  expect(saved.version).toBe(SAVE_VERSION); expect(saved.automation.mine).toBe(true); expect(saved.objects[asteroid.id].mined).toBe(true);
  await page.locator('#offline-report').screenshot({ path: `artifacts/phase-18-return-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const card = page.locator('.card').filter({ hasText: 'Little seam' }); await expect(card).toContainText('Mining outpost active.');
  await expect(card.locator('[data-action="mine"]')).toHaveCount(0);
  await card.screenshot({ path: `artifacts/phase-18-mining-${test.info().project.name}.png` });
  await page.reload(); await page.getByRole('button', { name: 'Rebirth', exact: true }).click(); await expect(toggle).toBeChecked();
  await expect(page.locator('[data-automation-status="mine"]')).toHaveText('Waiting for an unmined asteroid.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
