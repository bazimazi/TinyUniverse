import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE } from '../src/core/config.ts';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { civilizationEnvironment, foundCivilization, researchRate } from '../src/simulation/civilizations.ts';
import { habitability } from '../src/simulation/life.ts';
import { advance } from '../src/simulation/engine.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';

function settlements() {
  const state = createUniverse(12, 0), civ = foundCivilization(state, 'planet-0'), home = state.objects[civ.planetId];
  const colony = makeObject(state.seed, 'refuge-world', 'planet', 'star-0');
  state.objects[colony.id] = colony; state.objects['star-0'].children.push(colony.id);
  civ.colonies.push(colony.id); civ.technologies = ['spaceflight'];
  colony.planet!.atmosphere = colony.planet!.water = colony.planet!.magneticField = 1;
  colony.planet!.habitability = habitability(colony, state); home.shieldUntil = colony.shieldUntil = 86400;
  return { state, civ, home, colony };
}
function hostile(world: ReturnType<typeof makeObject>) {
  world.planet!.temperature = 600; world.planet!.habitability = 0; world.planet!.atmosphere = world.planet!.water = 0;
}
function habitat(state: ReturnType<typeof createUniverse>, civId: string, status: 'building' | 'complete' = 'complete') {
  const id = `${civId}:habitat`;
  state.megastructures[id] = { id, type: 'habitat', civilizationId: civId, systemId: 'system-0', startedAt: 0, endsAt: status === 'building' ? 45 : 0, status };
  return state.megastructures[id];
}
test('a single settled world retains its original carrying capacity and environmental factors', () => {
  const state = createUniverse(12, 0), civ = foundCivilization(state, 'planet-0'), world = state.objects[civ.planetId], p = world.planet!;
  world.upgrades.solar = 3; p.gravity = 1.6;
  const original = structuredClone(state), environment = civilizationEnvironment(state, civ), food = p.biodiversity + p.water * 0.5;
  assert.ok(Math.abs(environment.capacity - BALANCE.civilization.capacity * p.habitability * (0.2 + civ.infrastructure) * food) < 1e-8);
  for (const [actual, expected] of [[environment.habitability, p.habitability], [environment.food, food], [environment.gravity, p.gravity], [environment.solar, 3]]) assert.ok(Math.abs(actual - expected) < 1e-12);
  assert.equal(environment.worlds, 1); assert.equal(environment.habitats, 0); assert.deepEqual(state, original);
});
test('colonies add capacity once and gravity and solar conditions reflect their share of life support', () => {
  const { state, civ, home, colony } = settlements(); civ.colonies.push(colony.id, home.id); colony.planet!.gravity = 4; colony.upgrades.solar = 10;
  const original = structuredClone(state), environment = civilizationEnvironment(state, civ);
  const capacity = (world: typeof home) => BALANCE.civilization.capacity * world.planet!.habitability * (0.2 + civ.infrastructure) * Math.max(0.05, world.planet!.biodiversity + world.planet!.water * 0.5);
  const a = capacity(home), b = capacity(colony); assert.equal(environment.worlds, 2); assert.equal(environment.capacity, a + b);
  assert.ok(Math.abs(environment.gravity - (a + b * 4) / (a + b)) < 1e-12); assert.ok(Math.abs(environment.solar - b * 10 / (a + b)) < 1e-12);
  civ.researching = 'writing'; const shared = researchRate(state, civ); civ.colonies = [home.id]; assert.ok(researchRate(state, civ) > shared);
  civ.colonies = [...original.civilizations[civ.id].colonies]; civ.researching = null; assert.deepEqual(state, original); assertUniverse(state);
});
test('a healthy colony sustains a civilization after its home environment becomes hostile', () => {
  const { state, civ, home } = settlements(); hostile(home);
  const isolated = structuredClone(state); isolated.civilizations[civ.id].colonies = [home.id];
  advance(state, 180); advance(isolated, 180);
  assert.equal(civ.status, 'active'); assert.ok(civ.population > 1000); assert.equal(civ.distress, 0);
  assert.equal(isolated.civilizations[civ.id].status, 'extinct'); assertUniverse(state); assertUniverse(isolated);
});
test('completed owned habitats provide controlled conditions while building or foreign habitats do not', () => {
  const { state, civ, home, colony } = settlements(); civ.colonies = [home.id]; hostile(home);
  const other = foundCivilization(state, colony.id); habitat(state, other.id);
  assert.equal(civilizationEnvironment(state, civ).capacity, 0); const own = habitat(state, civ.id, 'building');
  assert.equal(civilizationEnvironment(state, civ).habitats, 0); own.status = 'complete'; own.endsAt = 0;
  const environment = civilizationEnvironment(state, civ); assert.equal(environment.capacity, BALANCE.civilization.habitatCapacity);
  assert.equal(environment.habitability, BALANCE.civilization.habitatHabitability); assert.equal(environment.food, BALANCE.civilization.habitatFood); assert.equal(environment.gravity, 1);
  const saved = deserialize(serialize(state)); advance(saved, 180); assert.equal(saved.civilizations[civ.id].status, 'active'); assert.ok(saved.civilizations[civ.id].population > 1000); assertUniverse(saved);
});
test('habitat capacity becomes available at completion and cannot resurrect a collapsed civilization', () => {
  const { state, civ } = settlements(); habitat(state, civ.id, 'building');
  const before = civilizationEnvironment(state, civ).capacity; advance(state, 44.5); assert.equal(civilizationEnvironment(state, civ).habitats, 0);
  advance(state, 0.5); assert.equal(civilizationEnvironment(state, civ).habitats, 1); assert.ok(civilizationEnvironment(state, civ).capacity > before);
  const failed = settlements(); failed.civ.colonies = [failed.home.id]; hostile(failed.home); failed.civ.distress = 150; habitat(failed.state, failed.civ.id, 'building');
  advance(failed.state, 45); assert.equal(failed.civ.status, 'extinct'); assert.equal(failed.state.megastructures[`${failed.civ.id}:habitat`].status, 'complete');
  advance(failed.state, 60); assert.equal(failed.civ.population, 0); assertUniverse(failed.state);
});
test('zero growth and extremely large imported populations remain finite', () => {
  const state = createUniverse(12, 0), civ = foundCivilization(state, 'planet-0'); civ.population = 1e100; civ.stability = 0;
  advance(state, 30); assert.equal(civ.population, 1e100); assertUniverse(state);
  advance(state, 30); assert.ok(Number.isFinite(civ.population)); assert.ok(civ.population < 1e100); assertUniverse(state);
});
test('settlement support, population and research agree during stepped play and saved offline returns', async () => {
  const { state, civ, home } = settlements(); hostile(home); habitat(state, civ.id, 'building'); civ.researching = 'writing';
  const live = structuredClone(state); for (let i = 0; i < 720; i++) advance(live, 1);
  const offline = await catchUp(deserialize(serialize(state)), 720000);
  assert.deepEqual(offline.state.civilizations, live.civilizations); assert.deepEqual(offline.state.megastructures, live.megastructures); assert.deepEqual(offline.state.events, live.events);
  for (const id of Object.keys(state.resources) as (keyof typeof state.resources)[]) assert.ok(Math.abs(offline.state.resources[id] - live.resources[id]) < 1e-8);
  assert.equal(offline.state.civilizations[civ.id].status, 'active'); assertUniverse(offline.state);
});
