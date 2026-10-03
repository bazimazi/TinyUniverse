import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { startExploration, completeExploration, mineAsteroid } from '../src/gameplay/exploration.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { deserialize } from '../src/persistence/save.ts';
import { hash } from '../src/core/random.ts';
import { BALANCE, GALAXY_BALANCE } from '../src/core/config.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { discoverGalaxy } from '../src/gameplay/galaxies.ts';
import { collapse, foundCivilization, hasTechnology } from '../src/simulation/civilizations.ts';
import { maximumSpeed } from '../src/gameplay/abilities.ts';
import { canRebirth, rebirth } from '../src/gameplay/prestige.ts';
import { buildStructure } from '../src/gameplay/megastructures.ts';
test('exploration gates, discovers deterministic bodies and completes offline', () => {
  const a = createUniverse(41, 0), b = createUniverse(41, 0);
  assert.equal(startExploration(a).ok, false);
  for (const state of [a, b]) { state.totalUpgrades = 2; state.resources.energy = 10000; state.resources.minerals = 10000; }
  for (let i = 0; i < 3; i++) { assert.equal(startExploration(a).ok, true); assert.equal(startExploration(b).ok, true); advance(a, 45); advance(b, 45); }
  assert.deepEqual(a, b); assert.equal(Object.values(a.objects).filter(o => o.type === 'moon').length, 1); assert.equal(Object.values(a.objects).filter(o => o.type === 'planet').length, 2);
  a.resources.matter = 100; const asteroid = Object.values(a.objects).find(o => o.type === 'asteroid')!;
  assert.equal(mineAsteroid(a, asteroid.id).ok, true); assert.equal(mineAsteroid(a, asteroid.id).ok, false); assertUniverse(a);
});
test('phase 1 save migrates without losing progression', () => {
  const old: Record<string, unknown> = { ...createUniverse(41, 0), version: 1 }; delete old.exploration;
  const payload = JSON.stringify(old); const state = deserialize(JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload }));
  assert.equal(state.exploration.completed.orbital, 0); assert.equal(state.seed, 41); assertUniverse(state);
});

function readyToExplore() {
  const state = createUniverse(41, 0);
  state.totalUpgrades = 2; state.resources.energy = 100000; state.resources.minerals = 100000; state.resources.knowledge = 10000;
  foundCivilization(state, 'planet-0').technologies = ['spaceflight', 'interstellar', 'dyson'];
  return state;
}

test('interstellar expeditions find an uncharted system in the destination galaxy', () => {
  const state = readyToExplore(); discoverGalaxy(state, 1);
  state.selectedId = 'galaxy-1-system-0-planet-0';
  assert.equal(startExploration(state, 'interstellar').ok, true); advance(state, 120);
  assert.ok(state.systems['galaxy-1-system-1']); assert.equal(state.galaxies['galaxy-1'].surveyed, 2);
  state.selectedId = 'planet-0'; generateSystem(state, 0); generateSystem(state, 1);
  assert.equal(startExploration(state, 'interstellar').ok, true); advance(state, 120);
  assert.ok(state.systems['galaxy-0-system-2']); assert.equal(state.exploration.completed.interstellar, 2); assertUniverse(state);
});

test('galactic expeditions skip known reaches and procedural addresses stay bounded', () => {
  const state = readyToExplore(); discoverGalaxy(state, 1);
  assert.equal(startExploration(state, 'galactic').ok, true); advance(state, 180);
  assert.ok(state.galaxies['galaxy-2']);
  assert.throws(() => discoverGalaxy(state, -1)); assert.throws(() => generateSystem(state, 0.5));
  for (let i = 3; i < GALAXY_BALANCE.maxGalaxies; i++) discoverGalaxy(state, i);
  assert.throws(() => discoverGalaxy(state, GALAXY_BALANCE.maxGalaxies));
  const energy = state.resources.energy; assert.equal(startExploration(state, 'galactic').ok, false); assert.equal(state.resources.energy, energy); assertUniverse(state);
});

test('an orbital expedition refunds its cost if the region fills before arrival', () => {
  const state = readyToExplore(), before = { ...state.resources };
  assert.equal(startExploration(state).ok, true);
  while (Object.keys(state.objects).length < BALANCE.maxObjects) {
    const id = `filler-${Object.keys(state.objects).length}`, object = makeObject(state.seed, id, 'asteroid', 'star-0');
    state.objects[id] = object; state.objects['star-0'].children.push(id);
  }
  state.time = 45; completeExploration(state);
  assert.equal(Object.keys(state.objects).length, BALANCE.maxObjects); assert.deepEqual(state.resources, before);
  assert.equal(state.exploration.completed.orbital, 0); assert.equal(state.exploration.job, null); assertUniverse(state);
});

test('aggregate surveys award knowledge and fully charted galaxies reject further costs', () => {
  const state = readyToExplore();
  for (let i = 0; i < GALAXY_BALANCE.maxDetailedSystems - 1; i++) generateSystem(state, i);
  const before = Object.keys(state.objects).length, surveyed = state.galaxies['galaxy-0'].surveyed;
  assert.equal(startExploration(state, 'interstellar').ok, true);
  const knowledge = state.resources.knowledge; state.time = 120; completeExploration(state);
  assert.equal(state.resources.knowledge, knowledge + 75); assert.equal(Object.keys(state.objects).length, before);
  assert.equal(state.galaxies['galaxy-0'].surveyed, surveyed + 1);
  state.galaxies['galaxy-0'].surveyed = state.galaxies['galaxy-0'].totalSystems;
  const energy = state.resources.energy; assert.equal(startExploration(state, 'interstellar').ok, false); assert.equal(state.resources.energy, energy); assertUniverse(state);
});

test('recorded technology survives collapse for player unlocks and resets on rebirth', () => {
  const state = readyToExplore(), civ = state.civilizations['civ-planet-0'];
  state.megastructures.test = { id: 'test', type: 'dyson', civilizationId: civ.id, systemId: 'system-0', startedAt: 0, endsAt: 0, status: 'complete' };
  collapse(state, civ, 'A test collapse.');
  assert.equal(hasTechnology(state, 'spaceflight'), true); assert.equal(maximumSpeed(state), 25); assert.equal(canRebirth(state), true);
  assert.equal(startExploration(state, 'interstellar').ok, true);
  assert.equal(buildStructure(state, civ.id, 'habitat').ok, false);
  assert.equal(hasTechnology(rebirth(state, 77), 'spaceflight'), false); assertUniverse(state);
});

test('exploration rejects nonplanet origins and invalid schedules before import', () => {
  for (const invalid of [{ targetId: 'star-0' }, { index: 0.5 }, { startedAt: 46 }, { endsAt: 0 }]) {
    const state = readyToExplore(); startExploration(state);
    Object.assign(state.exploration.job!, invalid); assert.throws(() => assertUniverse(state), /Invalid exploration job/);
  }
});
