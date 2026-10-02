import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
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
