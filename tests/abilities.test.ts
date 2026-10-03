import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { abilityReadiness, useAbility } from '../src/gameplay/abilities.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { influencePanel } from '../src/ui/influence.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
import { advance } from '../src/simulation/engine.ts';
import { foundCivilization, civilizationAt, collapse } from '../src/simulation/civilizations.ts';
import { civilizationPanel, researchPanel } from '../src/ui/civilizations.ts';
test('interventions cost resources, respect cooldowns and alter conditions', () => {
  const state = createUniverse(3, 0); state.resources.energy = 10000; state.resources.matter = 10000;
  const water = state.objects['planet-0'].planet!.water;
  assert.equal(useAbility(state, 'terraform', 'planet-0').ok, true); assert.ok(state.objects['planet-0'].planet!.water > water);
  const energy = state.resources.energy; assert.equal(useAbility(state, 'terraform', 'planet-0').ok, false); assert.equal(state.resources.energy, energy);
  assert.equal(useAbility(state, 'gravityUp', 'planet-0').ok, false); advance(state, 90); assert.equal(useAbility(state, 'terraform', 'planet-0').ok, true);
});
test('gifts affect civilization support and knowledge inspires ongoing research', () => {
  const state = createUniverse(3, 0), civ = foundCivilization(state, 'planet-0'); state.resources.energy = 1000; state.resources.minerals = 1000; state.resources.knowledge = 100;
  advance(state, 30); assert.equal(useAbility(state, 'gift', 'planet-0').ok, true); assert.ok(civ.supportUntil > state.time);
  const points = civ.researchPoints; assert.equal(useAbility(state, 'inspire', 'planet-0').ok, true); assert.ok(civ.researchPoints > points);
});

function influenceUniverse() {
  const state = createUniverse(3, 0); foundCivilization(state, 'planet-0').technologies = ['spaceflight', 'gravity'];
  state.resources.energy = state.resources.matter = state.resources.knowledge = state.resources.minerals = 10000;
  return state;
}

test('clipped orbital pushes scale period and climate by the actual movement', () => {
  const state = influenceUniverse(), planet = state.objects['planet-0']; planet.orbit!.radius = 780;
  const period = planet.orbit!.period, temperature = planet.planet!.temperature;
  assert.equal(useAbility(state, 'push', planet.id).ok, true); assert.equal(planet.orbit!.radius, 800);
  assert.ok(Math.abs(planet.orbit!.period - period * (800 / 780) ** 1.5) < 1e-10);
  assert.ok(Math.abs(planet.planet!.temperature - temperature / Math.sqrt(800 / 780)) < 1e-10);
  const original = structuredClone(state); assert.equal(useAbility(state, 'push', planet.id).ok, false); assert.deepEqual(state, original); assertUniverse(state);
});

test('orbital pull reverses a free push after shared recovery and preserves old save cooldowns', () => {
  let state = influenceUniverse(); const original = structuredClone(state.objects['planet-0']);
  assert.equal(useAbility(state, 'push', original.id).ok, true);
  const pushed = structuredClone(state); assert.equal(useAbility(state, 'pull', original.id).ok, false); assert.deepEqual(state, pushed);
  state = deserialize(serialize(state)); delete state.cooldowns['pull:planet-0'];
  assert.equal(abilityReadiness(state, 'pull', original.id).reason, 'cooldown');
  state.time = 90; assert.equal(useAbility(state, 'pull', original.id).ok, true);
  const returned = state.objects['planet-0'];
  for (const key of ['radius', 'period'] as const) assert.ok(Math.abs(returned.orbit![key] - original.orbit![key]) < 1e-10);
  assert.ok(Math.abs(returned.planet!.temperature - original.planet!.temperature) < 1e-10); assertUniverse(state);
});

test('orbital pulls stop at radius and period limits, including hot imported climates', () => {
  const state = influenceUniverse(), planet = state.objects['planet-0']; planet.orbit!.radius = 61; planet.planet!.temperature = 10000;
  assert.equal(useAbility(state, 'pull', planet.id).ok, true); assert.equal(planet.orbit!.radius, 60); assert.equal(planet.planet!.temperature, 10000); assertUniverse(state);
  state.time = 90; const original = structuredClone(state); assert.equal(useAbility(state, 'pull', planet.id).ok, false); assert.deepEqual(state, original);
  planet.orbit!.radius = 120; planet.orbit!.period = 1;
  assert.equal(useAbility(state, 'pull', planet.id).ok, false);
  planet.orbit = null; assert.equal(useAbility(state, 'push', planet.id).ok, false);
});

test('invalid influence names and targets are rejected without costs, cooldowns or events', () => {
  const state = influenceUniverse(), original = structuredClone(state);
  for (const id of ['toString', '__proto__', 'missing']) assert.equal(useAbility(state, id, 'planet-0').ok, false);
  assert.equal(useAbility(state, 'terraform', '__proto__').ok, false);
  assert.equal(useAbility(state, 'terraform', 'star-0').ok, false); assert.deepEqual(state, original);
});

test('settled conditions, capped gravity and existing shelter do not spend resources', () => {
  const state = influenceUniverse(), planet = state.objects['planet-0'];
  planet.planet!.water = planet.planet!.atmosphere = 1; planet.planet!.temperature = 288; planet.planet!.gravity = 4; planet.shieldUntil = 900;
  const original = structuredClone(state);
  for (const id of ['terraform', 'gravityUp', 'protect']) assert.equal(useAbility(state, id, planet.id).ok, false);
  assert.deepEqual(state, original); planet.planet!.gravity = 0.25;
  assert.equal(useAbility(state, 'gravityDown', planet.id).ok, false);
  const moon = makeObject(state.seed, 'fast-moon', 'moon', planet.id); moon.orbit!.period = 1; state.objects[moon.id] = moon; planet.children.push(moon.id);
  assert.equal(useAbility(state, 'gravityUp', planet.id).ok, true); assert.equal(moon.orbit!.period, 1); assertUniverse(state);
});

test('parentless asteroids can be captured locally and existing companions are retained', () => {
  const state = influenceUniverse(), asteroid = makeObject(state.seed, 'root-asteroid', 'asteroid', null); state.objects[asteroid.id] = asteroid;
  assert.equal(useAbility(state, 'capture', asteroid.id).ok, true); assert.equal(asteroid.parentId, 'planet-0'); assertUniverse(state);
  const original = structuredClone(state); assert.equal(useAbility(state, 'capture', asteroid.id).ok, false); assert.deepEqual(state, original);
  asteroid.parentId = null; state.objects['planet-0'].children = []; asteroid.systemId = 'empty-system';
  const star = makeObject(state.seed, 'empty-star', 'star', null); star.systemId = 'empty-system'; state.objects[star.id] = star;
  state.systems['empty-system'] = { id: 'empty-system', seed: star.seed, name: 'Empty reach', starId: star.id, position: { x: 10, y: 10 }, galaxyId: 'galaxy-0' };
  assertUniverse(state);
  const before = structuredClone(state); assert.equal(useAbility(state, 'capture', asteroid.id).ok, false); assert.deepEqual(state, before);
});

test('influence readiness is read-only and UI shares funded research and target checks', () => {
  const state = influenceUniverse(), civ = Object.values(state.civilizations)[0]; civ.researching = 'writing'; civ.researchPoints = 80;
  const original = structuredClone(state); assert.equal(abilityReadiness(state, 'inspire', civ.planetId).reason, 'opportunity');
  assert.match(influencePanel(state), /Wait for a new research question/); assert.deepEqual(state, original);
  assert.equal(useAbility(state, 'inspire', civ.planetId).ok, false); assert.deepEqual(state, original);
});

test('colony gifts and inspiration support the owner with civilization-wide saved recovery', () => {
  const state = influenceUniverse(), civ = Object.values(state.civilizations)[0], colony = makeObject(state.seed, 'colony', 'planet', 'star-0');
  state.objects[colony.id] = colony; state.objects['star-0'].children.push(colony.id); civ.colonies.push(colony.id); civ.researching = 'spaceflight';
  state.selectedId = colony.id; assert.equal(useAbility(state, 'gift', colony.id).ok, true); assert.equal(civ.supportUntil, 600);
  assert.equal(useAbility(state, 'inspire', colony.id).ok, true); assert.equal(civ.researchPoints, 120);
  const saved = deserialize(serialize(state)), original = structuredClone(saved);
  for (const target of [civ.planetId, colony.id]) for (const id of ['gift', 'inspire']) assert.equal(useAbility(saved, id, target).ok, false);
  assert.deepEqual(saved, original); assert.match(influencePanel(saved), /Recovery is shared across their worlds/);
  saved.time = 120; assert.equal(useAbility(saved, 'inspire', civ.planetId).ok, true);
  assert.match(civ.timeline.at(-1)!.detail, new RegExp(colony.name)); assertUniverse(saved);
});
test('colony context prefers a living owner over ruins and world links escape imported names', () => {
  const state = influenceUniverse(), former = Object.values(state.civilizations)[0], colony = makeObject(state.seed, 'settled-world', 'planet', 'star-0');
  state.objects[colony.id] = colony; state.objects['star-0'].children.push(colony.id); collapse(state, former, 'Test collapse.');
  const owner = foundCivilization(state, colony.id); owner.colonies.push(former.planetId); owner.name = 'Living owner'; former.traits = ['<img src=x>'];
  state.objects[former.planetId].name = '<b>New colony</b>'; state.selectedId = former.planetId;
  assert.equal(civilizationAt(state, state.selectedId), owner); assert.match(researchPanel(state), /Living owner chooses research/);
  assert.match(civilizationPanel(state), /Visit &lt;b&gt;New colony&lt;\/b&gt;/); assert.doesNotMatch(civilizationPanel(state), /<img src=x>/);
  assert.equal(useAbility(state, 'gift', former.planetId).ok, true); assert.equal(owner.supportUntil, 600); assert.equal(former.supportUntil, 0);
  collapse(state, owner, 'Test collapse.'); const original = structuredClone(state);
  assert.equal(useAbility(state, 'gift', former.planetId).ok, false); assert.deepEqual(state, original); assertUniverse(state);
});
