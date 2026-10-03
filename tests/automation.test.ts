import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, GALAXY_BALANCE } from '../src/core/config.ts';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { automate, automationStatus } from '../src/gameplay/automation.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { discoverGalaxy } from '../src/gameplay/galaxies.ts';
import { collapse, foundCivilization } from '../src/simulation/civilizations.ts';
import { advance } from '../src/simulation/engine.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import { prestigePanel } from '../src/ui/prestige.ts';

function automatedUniverse() {
  const state = createUniverse(41, 0);
  foundCivilization(state, 'planet-0').technologies = ['ai'];
  state.totalUpgrades = 2;
  for (const resource of Object.keys(state.resources) as (keyof typeof state.resources)[]) state.resources[resource] = 50000;
  return state;
}

test('automation respects AI, toggles and minute decision boundaries', () => {
  const state = createUniverse(41, 0); state.automation.develop = true;
  const original = structuredClone(state); automate(state); assert.deepEqual(state, original);
  foundCivilization(state, 'planet-0').technologies = ['ai']; state.time = 30;
  automate(state); assert.equal(state.totalUpgrades, 0);
  state.time = 60; state.automation.develop = false; automate(state); assert.equal(state.totalUpgrades, 0);
  state.automation.develop = true; automate(state); assert.equal(state.totalUpgrades, 1);
});

test('exploration falls back before spaceflight but saves for a reachable interstellar trip', () => {
  const state = automatedUniverse(); state.automation.explore = true; state.exploration.completed.orbital = 3;
  automate(state); assert.equal(state.exploration.job!.kind, 'orbital');
  state.exploration.job = null; Object.values(state.civilizations)[0].technologies.push('spaceflight');
  state.resources.energy = 1000; const original = structuredClone(state);
  automate(state); assert.deepEqual(state, original); assert.match(automationStatus(state, 'explore'), /Waiting for resources.*interstellar/);
  state.resources.energy = 5000; automate(state); assert.equal(state.exploration.job!.kind, 'interstellar');
});

test('fully charted destinations fall back and absolute capacity spends nothing', () => {
  const state = automatedUniverse(); state.automation.explore = true; state.exploration.completed.orbital = 3;
  Object.values(state.civilizations)[0].technologies.push('spaceflight', 'interstellar');
  generateSystem(state, 0); generateSystem(state, 1);
  for (let i = 1; i < GALAXY_BALANCE.maxGalaxies; i++) discoverGalaxy(state, i);
  automate(state); assert.equal(state.exploration.job!.kind, 'interstellar');
  state.exploration.job = null; state.galaxies['galaxy-0'].surveyed = state.galaxies['galaxy-0'].totalSystems;
  automate(state); assert.equal(state.exploration.job!.kind, 'orbital');
  state.exploration.job = null;
  while (Object.keys(state.objects).length < BALANCE.maxObjects) {
    const id = `capacity-${Object.keys(state.objects).length}`;
    state.objects[id] = makeObject(state.seed, id, 'asteroid', 'star-0'); state.objects['star-0'].children.push(id);
  }
  const original = structuredClone(state); automate(state); assert.deepEqual(state, original); assertUniverse(state);
});

test('development buys an affordable alternative in the selected system and stops at max level', () => {
  const state = automatedUniverse(); generateSystem(state, 0); state.selectedId = 'galaxy-0-system-0-star';
  state.automation.develop = true; state.resources.matter = 0;
  const remote = state.objects['galaxy-0-system-0-planet-0'];
  const home = structuredClone(state.objects['planet-0'].upgrades);
  automate(state); assert.equal(remote.upgrades.atmosphere, 1); assert.deepEqual(state.objects['planet-0'].upgrades, home);
  for (const id of Object.keys(remote.upgrades) as (keyof typeof remote.upgrades)[]) remote.upgrades[id] = BALANCE.maxUpgrade;
  const original = structuredClone(state); automate(state); assert.deepEqual(state, original);
  assert.match(automationStatus(state, 'develop'), /Development complete/);
});

test('research preserves the reserve across civilizations, cooldowns and funded projects', () => {
  const state = automatedUniverse(); generateSystem(state, 0); state.automation.research = true;
  const a = Object.values(state.civilizations)[0], b = foundCivilization(state, 'galaxy-0-system-0-planet-0');
  a.researching = b.researching = 'reality'; a.researchPoints = b.researchPoints = 0;
  state.resources.knowledge = 250; automate(state);
  assert.equal(a.researchPoints, 120); assert.equal(b.researchPoints, 0); assert.equal(state.resources.knowledge, 215);
  state.resources.knowledge = 2000; b.researchPoints = 12000; automate(state);
  assert.equal(state.resources.knowledge, 2000); assert.equal(a.researchPoints, 120);
  state.time = 120; automate(state); assert.equal(a.researchPoints, 240); assert.equal(state.resources.knowledge, 1965);
  collapse(state, a, 'Test collapse'); const original = structuredClone(state); automate(state); assert.deepEqual(state, original);
});

test('assistance avoids ineffective terraforming while honoring need and cooldowns', () => {
  const state = automatedUniverse(); state.automation.assist = true;
  const civ = Object.values(state.civilizations)[0], planet = state.objects['planet-0'].planet!;
  planet.water = planet.atmosphere = 1; planet.temperature = 288; planet.habitability = 0.4; civ.stability = 0.8;
  const original = structuredClone(state); automate(state); assert.deepEqual(state, original);
  civ.stability = 0.2; planet.water = 0.2; automate(state);
  assert.equal(civ.stability, 0.32); assert.ok(planet.water > 0.2);
  const resources = structuredClone(state.resources); automate(state); assert.deepEqual(state.resources, resources);
});

test('automation status is read-only and escapes player world names', () => {
  const state = automatedUniverse(); state.automation.develop = true; state.objects['planet-0'].name = '<img src=x>';
  const original = structuredClone(state), panel = prestigePanel(state);
  assert.match(panel, /data-automation-status="develop"/); assert.match(panel, /&lt;img src=x&gt;/); assert.ok(!panel.includes('<img src=x>'));
  assert.deepEqual(state, original);
});

test('enabled automation behaves identically during stepped live play and offline returns', async () => {
  const source = automatedUniverse(); Object.values(source.civilizations)[0].technologies.push('spaceflight');
  source.automation = { explore: true, develop: true, assist: true, research: true };
  const live = structuredClone(source); for (let i = 0; i < 1200; i++) advance(live, 1); live.lastTimestamp = 1200000;
  const offline = await catchUp(source, 1200000);
  for (const id of Object.keys(live.resources) as (keyof typeof live.resources)[]) assert.ok(Math.abs(offline.state.resources[id] - live.resources[id]) <= Math.max(1, live.resources[id]) * 1e-12);
  assert.deepEqual({ ...offline.state, resources: {} }, { ...live, resources: {} });
  assert.ok(live.exploration.completed.orbital > 0); assert.ok(live.totalUpgrades > 2); assertUniverse(live);
});
