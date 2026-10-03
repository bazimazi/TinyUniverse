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
import { mineAsteroid } from '../src/gameplay/exploration.ts';
import { rates } from '../src/simulation/economy.ts';
import { offlineReportContent } from '../src/ui/offline.ts';

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
  source.automation = { explore: true, develop: true, assist: true, research: true, mine: true };
  const live = structuredClone(source); for (let i = 0; i < 1200; i++) advance(live, 1); live.lastTimestamp = 1200000;
  const offline = await catchUp(source, 1200000);
  for (const id of Object.keys(live.resources) as (keyof typeof live.resources)[]) assert.ok(Math.abs(offline.state.resources[id] - live.resources[id]) <= Math.max(1, live.resources[id]) * 1e-12);
  assert.deepEqual({ ...offline.state, resources: {} }, { ...live, resources: {} });
  assert.ok(live.exploration.completed.orbital > 0); assert.ok(live.totalUpgrades > 2); assertUniverse(live);
});

function addAsteroid(state: ReturnType<typeof createUniverse>, id: string, deposit: number, systemId = 'system-0') {
  const parentId = state.systems[systemId].starId, object = makeObject(state.seed, id, 'asteroid', parentId);
  object.systemId = systemId; object.deposit = deposit; state.objects[id] = object; state.objects[parentId].children.push(id);
  return object;
}

test('mining prioritizes the selected asteroid, local deposits and then distant deposits', () => {
  const state = automatedUniverse(); state.automation.mine = true; generateSystem(state, 0);
  const small = addAsteroid(state, 'local-small', 100), rich = addAsteroid(state, 'local-rich', 200), remote = addAsteroid(state, 'remote-rich', 300, 'galaxy-0-system-0');
  advance(state, 59); assert.equal(rich.mined, false); advance(state, 1); assert.equal(rich.mined, true); assert.equal(small.mined, false); assert.equal(remote.mined, false);
  state.selectedId = remote.id; advance(state, 60); assert.equal(remote.mined, true); assert.equal(small.mined, false);
  advance(state, 60); assert.equal(small.mined, true); assert.equal(state.events.filter(e => e.type === 'AsteroidMined').length, 3); assertUniverse(state);
});

test('mining requires AI, its saved toggle and affordable resources', () => {
  const state = createUniverse(41, 0), asteroid = addAsteroid(state, 'test-asteroid', 100); state.automation.mine = true;
  let original = structuredClone(state); automate(state); assert.deepEqual(state, original);
  foundCivilization(state, 'planet-0').technologies = ['ai']; state.resources.energy = 1000; state.resources.matter = 1000; state.automation.mine = false;
  original = structuredClone(state); automate(state); assert.deepEqual(state, original);
  state.automation.mine = true; state.resources.matter = 24; original = structuredClone(state);
  automate(state); assert.deepEqual(state, original); assert.match(automationStatus(state, 'mine'), /Waiting for 60 energy and 25 matter/);
  state.resources.matter = 25; automate(state); assert.equal(asteroid.mined, true); assert.equal(state.resources.matter, 0);
  assert.match(automationStatus(state, 'mine'), /Waiting for an unmined asteroid/);
});

test('mining awards a bounded deposit once and adds continuous production', () => {
  const state = automatedUniverse(), asteroid = addAsteroid(state, 'test-asteroid', BALANCE.resourceLimit), baseline = rates(state).minerals;
  state.resources.minerals = BALANCE.resourceLimit;
  assert.equal(mineAsteroid(state, asteroid.id).ok, true); assert.equal(state.resources.minerals, BALANCE.resourceLimit);
  assert.equal(rates(state).minerals, baseline + BALANCE.asteroidYield);
  const original = structuredClone(state); assert.equal(mineAsteroid(state, asteroid.id).ok, false); assert.deepEqual(state, original); assertUniverse(state);
});

test('waiting expedition budgets protect mining, development, aid and research spending', () => {
  const state = automatedUniverse(); generateSystem(state, 0); generateSystem(state, 1); state.exploration.completed.orbital = 3;
  const civ = Object.values(state.civilizations)[0]; civ.technologies.push('spaceflight', 'interstellar'); civ.researching = 'reality'; civ.researchPoints = 0; civ.stability = 0.2;
  state.objects['planet-0'].planet!.habitability = 0.4;
  state.automation = { explore: true, mine: true, develop: true, assist: true, research: true };
  state.resources.energy = 1000; state.resources.knowledge = 450; state.resources.minerals = state.resources.biology = 0; state.resources.matter = 100;
  const asteroid = addAsteroid(state, 'waiting-asteroid', 200), upgrades = structuredClone(state.objects['planet-0'].upgrades);
  automate(state); assert.equal(state.exploration.job, null); assert.equal(asteroid.mined, false); assert.equal(state.resources.energy, 1000);
  assert.deepEqual(state.objects['planet-0'].upgrades, upgrades); assert.equal(civ.stability, 0.2); assert.equal(state.resources.knowledge, 415);
  assert.match(automationStatus(state, 'mine'), /Saving expedition resources/); assert.match(automationStatus(state, 'develop'), /Saving expedition resources/);
  assert.match(automationStatus(state, 'research'), /435 knowledge \(400 kept in reserve\)/);
  state.resources.energy = 8000; automate(state); assert.equal(state.exploration.job!.kind, 'galactic'); assert.equal(state.resources.energy, 0); assert.equal(state.resources.knowledge, 15);
});

test('waiting for expedition knowledge still permits upgrades using unrelated resources', () => {
  const state = automatedUniverse(); generateSystem(state, 0); generateSystem(state, 1); state.exploration.completed.orbital = 3;
  Object.values(state.civilizations)[0].technologies.push('spaceflight', 'interstellar');
  state.automation.explore = state.automation.develop = true; state.resources.energy = 1000; state.resources.knowledge = 0;
  automate(state); assert.equal(state.exploration.job, null); assert.equal(state.objects['planet-0'].upgrades.solar, 1); assert.equal(state.resources.energy, 1000);
});

test('offline summaries count mining outposts and include their costs, deposits and production', async () => {
  const state = automatedUniverse(); state.automation.mine = true; addAsteroid(state, 'asteroid-a', 100); addAsteroid(state, 'asteroid-b', 200);
  const live = structuredClone(state); advance(live, 180); live.lastTimestamp = 180000;
  const caught = await catchUp(state, 180000); assert.deepEqual(caught.state, live); assert.equal(caught.result.miningOutpostsBuilt, 2);
  assert.equal(caught.result.resources.minerals, 930); assert.equal(caught.result.resources.energy, 240);
  assert.ok(Math.abs(caught.result.resources.matter - 76) < 1e-8); assert.match(offlineReportContent(caught.result), /2 mining outposts built/); assertUniverse(caught.state);
});
