import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASTEROID_BALANCE, SAVE_VERSION } from '../src/core/config.ts';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { hash } from '../src/core/random.ts';
import { advance } from '../src/simulation/engine.ts';
import { completeImpacts, simulateAsteroids } from '../src/simulation/asteroids.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
import { rates } from '../src/simulation/economy.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import { abilityCooldown, abilityReadiness, useAbility } from '../src/gameplay/abilities.ts';
import { startExploration } from '../src/gameplay/exploration.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
import { asteroidActivityPanel } from '../src/ui/asteroids.ts';
import { influencePanel } from '../src/ui/influence.ts';
import { explorationPanel } from '../src/ui/exploration.ts';

function incomingUniverse(seed = 12) {
  const state = createUniverse(seed, 0), asteroid = makeObject(seed, 'test-asteroid', 'asteroid', 'star-0');
  asteroid.name = 'Bright shard'; state.objects[asteroid.id] = asteroid; state.objects['star-0'].children.push(asteroid.id);
  asteroid.asteroid = { status: 'incoming', lastActivityAt: 0, targetId: 'planet-0', impactAt: 11.5 };
  state.resources.energy = state.resources.minerals = state.resources.matter = 10000;
  return { state, asteroid, home: state.objects['planet-0'] };
}
function envelope(state: unknown): string { const payload = JSON.stringify(state); return JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload }); }

test('debris impacts resolve once at their exact deadline and retain the asteroid and mining outpost', () => {
  const { state, asteroid, home } = incomingUniverse(); asteroid.mined = true; home.life!.populations.microorganisms = 0.8;
  const mineralRate = rates(state).minerals, before = structuredClone(home), remote = generateSystem(state, 0);
  const remoteWorld = state.objects[state.objects[remote.starId].children[0]], remoteBefore = structuredClone(remoteWorld);
  advance(state, 11); assert.equal(asteroid.asteroid!.status, 'incoming'); assert.deepEqual(home.planet, before.planet);
  advance(state, 0.5); assert.equal(asteroid.asteroid!.status, 'spent'); assert.equal(asteroid.asteroid!.impactAt, null); assert.equal(asteroid.asteroid!.targetId, null);
  assert.equal(home.planet!.temperature, before.planet!.temperature + ASTEROID_BALANCE.heat);
  assert.equal(home.planet!.atmosphere, before.planet!.atmosphere - ASTEROID_BALANCE.atmosphereLoss);
  assert.equal(home.planet!.water, before.planet!.water - ASTEROID_BALANCE.waterLoss);
  assert.ok(Math.abs(home.life!.populations.microorganisms - 0.56) < 1e-12); assert.ok(home.planet!.habitability < before.planet!.habitability);
  assert.deepEqual(remoteWorld, remoteBefore); assert.equal(asteroid.mined, true); assert.ok(rates(state).minerals >= mineralRate);
  const after = structuredClone(state); completeImpacts(state); assert.deepEqual(state, after);
  assert.equal(state.events.find(e => e.type === 'AsteroidImpact')!.time, 11.5); assert.ok(state.discoveries['cosmic:asteroid-impact']); assertUniverse(state);
});

test('shelter prevents debris damage locally and protection must extend beyond the arrival deadline', () => {
  const { state, asteroid, home } = incomingUniverse(), second = makeObject(state.seed, 'other-world', 'planet', 'star-0');
  state.objects[second.id] = second; state.objects['star-0'].children.push(second.id);
  const other = makeObject(state.seed, 'other-asteroid', 'asteroid', 'star-0'); state.objects[other.id] = other; state.objects['star-0'].children.push(other.id);
  other.asteroid = { status: 'incoming', lastActivityAt: 0, targetId: second.id, impactAt: 11.5 };
  home.shieldUntil = 12; second.shieldUntil = 11.5; const protectedBefore = structuredClone(home);
  assert.match(asteroidActivityPanel(state), /shelter covers its arrival/); advance(state, 11.5);
  assert.deepEqual(home, protectedBefore); assert.equal(asteroid.asteroid!.status, 'deflected'); assert.equal(other.asteroid!.status, 'spent');
  assert.ok(second.planet!.temperature > 288); assert.ok(state.discoveries['cosmic:asteroid-averted']); assertUniverse(state);
});

test('Spaceflight deflection shares read-only readiness and refuses unavailable actions without spending', () => {
  const { state, asteroid, home } = incomingUniverse(), civ = foundCivilization(state, home.id);
  let original = structuredClone(state); assert.equal(useAbility(state, 'deflect', asteroid.id).ok, false); assert.deepEqual(state, original);
  civ.technologies = ['spaceflight'];
  for (const [action, target] of [['deflect', home.id], ['deflect', '__proto__'], ['constructor', asteroid.id]]) {
    original = structuredClone(state); assert.equal(useAbility(state, action, target).ok, false); assert.deepEqual(state, original);
  }
  state.resources.energy = 0; original = structuredClone(state); assert.equal(useAbility(state, 'deflect', asteroid.id).ok, false); assert.deepEqual(state, original);
  state.resources.energy = 10000; original = structuredClone(state); assert.equal(abilityReadiness(state, 'deflect', asteroid.id).ok, true); assert.deepEqual(state, original);
  state.selectedId = asteroid.id; const html = influencePanel(state); assert.ok(html.indexOf('data-ability="deflect"') < html.indexOf('data-ability="capture"'));
  assert.equal(useAbility(state, 'deflect', asteroid.id).ok, true); assert.equal(state.resources.energy, 9200); assert.equal(state.resources.minerals, 9850);
  assert.equal(abilityCooldown(state, 'deflect', asteroid.id), 180); assert.equal(asteroid.asteroid!.status, 'deflected');
  original = structuredClone(state); assert.equal(useAbility(state, 'deflect', asteroid.id).ok, false); assert.deepEqual(state, original);
  const saved = deserialize(serialize(state)); advance(saved, 11.5); assert.deepEqual(saved.objects[home.id].planet, state.objects[home.id].planet);
  assert.match(asteroidActivityPanel(saved), /Trajectory secured/); assert.ok(saved.discoveries['cosmic:asteroid-averted']); assertUniverse(saved);
});

test('orbital capture clears an incoming threat and secured companions never schedule another shower', () => {
  const { state, asteroid, home } = incomingUniverse(); foundCivilization(state, home.id).technologies = ['gravity'];
  assert.equal(useAbility(state, 'capture', asteroid.id).ok, true); assert.equal(asteroid.parentId, home.id); assert.ok(home.children.includes(asteroid.id));
  assert.ok(!state.objects['star-0'].children.includes(asteroid.id)); assert.equal(asteroid.asteroid!.status, 'deflected');
  advance(state, 1800); assert.equal(asteroid.asteroid!.impactAt, null); assert.equal(state.events.filter(e => e.type === 'AsteroidImpact').length, 0);
  assert.equal(state.events.filter(e => e.type === 'AsteroidAverted').length, 1); assertUniverse(state);
});

test('healthy colonies and completed habitats reduce the population exposed to one world’s impact', () => {
  const { state, home } = incomingUniverse(), civ = foundCivilization(state, home.id); civ.population = 10000;
  const colony = makeObject(state.seed, 'safe-colony', 'planet', 'star-0'); colony.planet = structuredClone(home.planet);
  state.objects[colony.id] = colony; state.objects['star-0'].children.push(colony.id); civ.colonies.push(colony.id);
  state.megastructures.habitat = { id: 'habitat', type: 'habitat', civilizationId: civ.id, systemId: 'system-0', startedAt: 0, endsAt: 0, status: 'complete' };
  const alone = structuredClone(state); alone.civilizations[civ.id].colonies = [home.id]; alone.megastructures = {};
  const colonyBefore = structuredClone(colony); advance(state, 11.5); advance(alone, 11.5);
  assert.equal(alone.civilizations[civ.id].population, 8000); assert.ok(civ.population > 8000 && civ.population < 10000);
  assert.ok(civ.stability > alone.civilizations[civ.id].stability); assert.deepEqual(colony, colonyBefore); assertUniverse(state); assertUniverse(alone);
});

test('an impact can collapse a depleted civilization while leaving its recoverable legacy', () => {
  const { state, home } = incomingUniverse(), civ = foundCivilization(state, home.id); civ.population = 5.1;
  advance(state, 11.5); assert.equal(civ.status, 'extinct'); assert.equal(civ.population, 0);
  assert.deepEqual(civ.timeline.slice(-3).map(e => e.type), ['AsteroidImpact', 'CivilizationCollapse', 'RuinsDiscovered']);
  assert.equal(Object.values(state.anomalies)[0].kind, 'ancient-ruins'); assertUniverse(state);
});

test('seeded activity gives a durable warning, stays local and starts after the discovery clock', () => {
  const state = createUniverse(14, 0), asteroid = makeObject(state.seed, 'test-asteroid', 'asteroid', 'star-0');
  state.objects[asteroid.id] = asteroid; state.objects['star-0'].children.push(asteroid.id); generateSystem(state, 0);
  advance(state, 899); assert.equal(asteroid.asteroid!.status, 'orbiting'); advance(state, 1);
  assert.equal(asteroid.asteroid!.status, 'incoming'); assert.equal(asteroid.asteroid!.impactAt, 1020); assert.equal(asteroid.asteroid!.targetId, 'planet-0');
  assert.equal(state.events.filter(e => e.type === 'AsteroidWarning').length, 1); simulateAsteroids(state);
  assert.equal(state.events.filter(e => e.type === 'AsteroidWarning').length, 1); advance(state, 120); assert.equal(asteroid.asteroid!.status, 'spent');
  advance(state, 1800); assert.equal(state.events.filter(e => e.type === 'AsteroidWarning').length, 1); assertUniverse(state);
});

test('late orbital discoveries initialize their activity clock at discovery rather than universe birth', () => {
  const state = createUniverse(14, 0); state.time = 10000; state.totalUpgrades = 2; state.exploration.completed.orbital = 2;
  state.resources.energy = state.resources.minerals = 1000; assert.equal(startExploration(state).ok, true); advance(state, 45);
  const asteroid = Object.values(state.objects).find(o => o.asteroid)!;
  assert.equal(asteroid.createdAt, 10045); assert.equal(asteroid.asteroid!.lastActivityAt, 10045); assert.equal(asteroid.asteroid!.status, 'orbiting'); assertUniverse(state);
});

test('saved impacts agree during stepped live play and offline catch-up with persistent Codex records', async () => {
  const { state, asteroid } = incomingUniverse(); const live = structuredClone(state), original = structuredClone(state);
  for (let i = 0; i < 120; i++) advance(live, 0.5);
  const offline = await catchUp(deserialize(serialize(state)), 60000);
  assert.deepEqual(state, original); assert.deepEqual(offline.state.objects, live.objects); assert.deepEqual(offline.state.events, live.events); assert.deepEqual(offline.state.discoveries, live.discoveries);
  for (const resource of Object.keys(state.resources) as (keyof typeof state.resources)[]) assert.ok(Math.abs(offline.state.resources[resource] - live.resources[resource]) < 1e-8);
  assert.equal(offline.state.objects[asteroid.id].asteroid!.status, 'spent'); assert.ok(offline.result.highlights.some(e => e.type === 'AsteroidImpact')); assertUniverse(offline.state);
});

test('version 12 saves initialize safe activity clocks while preserving mining and captured companions', () => {
  const { state, asteroid, home } = incomingUniverse(); state.time = 10000; state.version = 12; asteroid.mined = true;
  state.objects['star-0'].children = state.objects['star-0'].children.filter(id => id !== asteroid.id); asteroid.parentId = home.id; home.children.push(asteroid.id);
  const legacy = JSON.parse(JSON.stringify(state)); for (const object of Object.values(legacy.objects) as Record<string, unknown>[]) delete object.asteroid;
  const saved = deserialize(envelope(legacy)); assert.equal(saved.version, SAVE_VERSION); assert.equal(saved.objects[asteroid.id].asteroid!.lastActivityAt, 10000);
  assert.equal(saved.objects[asteroid.id].asteroid!.status, 'orbiting'); assert.equal(saved.objects[asteroid.id].mined, true); assert.equal(saved.objects[asteroid.id].parentId, home.id);
  advance(saved, 1800); assert.equal(saved.objects[asteroid.id].asteroid!.impactAt, null); assert.equal(saved.events.some(e => e.type === 'AsteroidWarning'), false); assertUniverse(saved);
});

test('impossible asteroid metadata and cross-system or stale impact deadlines are rejected before import', () => {
  const { state, asteroid } = incomingUniverse(), system = generateSystem(state, 0), remote = state.objects[system.starId].children[0];
  for (const fields of [{ status: 'unknown' }, { lastActivityAt: -1 }, { lastActivityAt: 1 }, { impactAt: -1 }, { impactAt: 121 }, { impactAt: null }, { targetId: '__proto__' }, { targetId: 'star-0' }, { targetId: remote }, { status: 'spent' }]) {
    const invalid = structuredClone(state); Object.assign(invalid.objects[asteroid.id].asteroid!, fields); assert.throws(() => deserialize(envelope(invalid)), /asteroid/);
  }
  const missing = structuredClone(state); delete (missing.objects[asteroid.id] as Partial<typeof asteroid>).asteroid; assert.throws(() => deserialize(envelope(missing)), /asteroid state/);
  const wrongType = structuredClone(state); wrongType.objects['planet-0'].asteroid = structuredClone(asteroid.asteroid); assert.throws(() => deserialize(envelope(wrongType)), /asteroid state/);
});

test('Explore exposes distant threats and warning cards escape imported object and world names', () => {
  const { state, asteroid, home } = incomingUniverse(), system = generateSystem(state, 0);
  asteroid.name = '<img src=x onerror=alert(1)>'; home.name = '<script>bad()</script>'; state.selectedId = system.starId;
  assert.equal(asteroidActivityPanel(state), ''); const html = explorationPanel(state);
  assert.ok(html.includes('Incoming debris')); assert.ok(html.includes('&lt;img')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>'));
  const original = structuredClone(state); asteroidActivityPanel(state, 'universe'); assert.deepEqual(state, original);
});
