import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { foundCivilization, collapse } from '../src/simulation/civilizations.ts';
import { mediate, mediationReadiness, simulateAdvanced } from '../src/simulation/advanced.ts';
import { advancedPanel } from '../src/ui/advanced.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
import { advance } from '../src/simulation/engine.ts';
import { buildStructure } from '../src/gameplay/megastructures.ts';
import { rates } from '../src/simulation/economy.ts';
test('construction completes offline and adds production', () => {
  const state = createUniverse(12, 0), civ = foundCivilization(state, 'planet-0'); civ.technologies = ['dyson'];
  state.resources.minerals = 20000; state.resources.matter = 10000; state.resources.knowledge = 1000;
  assert.equal(buildStructure(state, civ.id, 'dyson').ok, true); assert.equal(buildStructure(state, civ.id, 'dyson').ok, false);
  advance(state, 900); assert.equal(state.megastructures[`${civ.id}:dyson`].status, 'complete'); assert.ok(rates(state).stellar >= 12);
});
test('independent civilizations meet, trade and build alliances', () => {
  const state = createUniverse(12, 0), planet = makeObject(12, 'test-planet', 'planet', 'star-0'); state.objects[planet.id] = planet; state.objects['star-0'].children.push(planet.id);
  const a = foundCivilization(state, 'planet-0'), b = foundCivilization(state, planet.id);
  for (const civ of [a, b]) { civ.technologies = ['spaceflight']; civ.archetype = 'stewards'; civ.traits = ['Cooperative']; }
  advance(state, 12000); const relation = Object.values(state.relations)[0]; assert.ok(relation); assert.equal(relation.status, 'alliance');
});

function diplomaticUniverse() {
  const state = createUniverse(12, 0), planet = makeObject(12, 'second-world', 'planet', 'star-0');
  state.objects[planet.id] = planet; state.objects['star-0'].children.push(planet.id);
  const a = foundCivilization(state, 'planet-0'), b = foundCivilization(state, planet.id);
  for (const civ of [a, b]) civ.technologies = ['spaceflight'];
  const id = [a.id, b.id].sort().join('|');
  state.relations[id] = { id, a: a.id, b: b.id, score: -60, status: 'war', lastUpdate: 0 };
  state.resources.energy = 10000; state.resources.knowledge = 1000; state.time = 100;
  return { state, a, b, id };
}
test('mediation ends war immediately, records both histories and persists the agreement', () => {
  const { state, a, b, id } = diplomaticUniverse();
  const original = structuredClone(state); assert.equal(mediationReadiness(state, id).ok, true); assert.deepEqual(state, original);
  assert.equal(mediate(state, id).ok, true); assert.equal(state.relations[id].status, 'neutral'); assert.equal(state.relations[id].score, -30);
  assert.equal(state.relations[id].lastUpdate, 100); assert.equal(state.resources.energy, 9000); assert.equal(state.resources.knowledge, 900);
  for (const civ of [a, b]) assert.equal(civ.timeline.at(-1)!.type, 'DiplomacyMediated');
  assert.equal(deserialize(serialize(state)).relations[id].status, 'neutral');
  state.relations[id].score = 40; assert.equal(mediate(state, id).ok, true); assert.equal(state.relations[id].status, 'alliance'); assertUniverse(state);
});
test('archived, capped, unfunded and invalid mediation cannot charge or alter history', () => {
  const { state, b, id } = diplomaticUniverse();
  for (const invalid of ['missing', 'toString', '__proto__']) { const original = structuredClone(state); assert.equal(mediate(state, invalid).ok, false); assert.deepEqual(state, original); }
  state.resources.energy = 0; let original = structuredClone(state); assert.equal(mediate(state, id).ok, false); assert.deepEqual(state, original);
  state.resources.energy = 10000; state.relations[id].score = 100; original = structuredClone(state);
  assert.equal(mediate(state, id).ok, false); assert.match(advancedPanel(state), /Trust is already at its highest/); assert.deepEqual(state, original);
  state.relations[id].score = -60; collapse(state, b, 'Test collapse.'); original = structuredClone(state);
  assert.equal(mediate(state, id).ok, false); assert.match(advancedPanel(state), /Archived · last recorded war/); assert.deepEqual(state, original);
});
test('civilizations that fall in one conflict cannot participate in later pairs that tick', () => {
  const { state, a, b } = diplomaticUniverse(), planet = makeObject(12, 'third-world', 'planet', 'star-0');
  state.objects[planet.id] = planet; state.objects['star-0'].children.push(planet.id);
  const c = foundCivilization(state, planet.id); c.technologies = ['spaceflight'];
  a.population = 5.1; a.archetype = 'conquerors'; state.time = 600; simulateAdvanced(state);
  assert.equal(a.status, 'extinct'); assert.equal(a.timeline.at(-1)!.type, 'CivilizationCollapse');
  assert.equal(state.relations[[a.id, c.id].sort().join('|')], undefined);
  assert.ok(state.relations[[b.id, c.id].sort().join('|')]); assertUniverse(state);
});
