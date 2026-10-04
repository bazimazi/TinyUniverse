import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { foundCivilization, collapse } from '../src/simulation/civilizations.ts';
import { mediate, mediationReadiness, simulateAdvanced } from '../src/simulation/advanced.ts';
import { advancedPanel } from '../src/ui/advanced.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
import { advance } from '../src/simulation/engine.ts';
import { buildStructure, structureAt, structureReadiness } from '../src/gameplay/megastructures.ts';
import { rates } from '../src/simulation/economy.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
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
  assert.equal(a.status, 'extinct'); assert.deepEqual(a.timeline.slice(-2).map(e => e.type), ['CivilizationCollapse', 'RuinsDiscovered']);
  assert.equal(state.relations[[a.id, c.id].sort().join('|')], undefined);
  assert.ok(state.relations[[b.id, c.id].sort().join('|')]); assertUniverse(state);
});

function constructionUniverse() {
  const state = createUniverse(12, 0), civ = foundCivilization(state, 'planet-0'), system = generateSystem(state, 0);
  const colony = state.objects[state.objects[system.starId].children.find(id => state.objects[id].planet)!];
  civ.colonies.push(colony.id); civ.technologies = ['spaceflight', 'interstellar', 'dyson', 'spacetime'];
  state.resources.minerals = state.resources.matter = state.resources.knowledge = state.resources.exotic = 100000;
  return { state, civ, system, colony };
}
test('one structure per civilization and system recognizes legacy IDs and colony duplicates', () => {
  const { state, civ, system, colony } = constructionUniverse();
  assert.equal(buildStructure(state, civ.id, 'dyson').ok, true); assert.equal(buildStructure(state, civ.id, 'dyson', true, colony.id).ok, true);
  const original = structuredClone(state); assert.equal(buildStructure(state, civ.id, 'dyson', true, colony.id).ok, false); assert.deepEqual(state, original);
  const second = makeObject(state.seed, 'shared-system-colony', 'planet', system.starId); second.systemId = system.id;
  state.objects[second.id] = second; state.objects[system.starId].children.push(second.id); civ.colonies.push(second.id);
  assert.equal(buildStructure(state, civ.id, 'dyson', true, second.id).ok, false);
  const saved = deserialize(serialize(state)); advance(saved, 899.5); assert.equal(structureAt(saved, civ.id, 'dyson', system.id)!.status, 'building');
  advance(saved, 0.5); assert.equal(structureAt(saved, civ.id, 'dyson', system.id)!.status, 'complete'); assert.equal(rates(saved).stellar, 24); assertUniverse(saved);
});
test('construction readiness rejects invalid sites, inherited names, own-tech gaps and costs atomically', () => {
  const { state, civ, colony } = constructionUniverse();
  for (const type of ['toString', '__proto__', 'missing']) { const original = structuredClone(state); assert.equal(buildStructure(state, civ.id, type as 'habitat').ok, false); assert.deepEqual(state, original); }
  for (const id of ['toString', '__proto__', 'missing']) { const original = structuredClone(state); assert.equal(buildStructure(state, id, 'habitat').ok, false); assert.deepEqual(state, original); }
  for (const id of ['star-0', '__proto__', 'missing']) { const original = structuredClone(state); assert.equal(buildStructure(state, civ.id, 'habitat', true, id).ok, false); assert.deepEqual(state, original); }
  civ.technologies = ['spaceflight']; const original = structuredClone(state);
  assert.match(structureReadiness(state, civ.id, 'habitat', true, colony.id).message, /Interstellar travel/); assert.equal(buildStructure(state, civ.id, 'habitat', true, colony.id).ok, false); assert.deepEqual(state, original);
  civ.technologies.push('interstellar'); civ.colonies = [civ.planetId]; assert.equal(buildStructure(state, civ.id, 'habitat', true, colony.id).ok, false);
  civ.colonies.push(colony.id); state.resources.minerals = 0; let snapshot = structuredClone(state);
  assert.equal(buildStructure(state, civ.id, 'habitat', true, colony.id).ok, false); assert.deepEqual(state, snapshot);
  collapse(state, civ, 'Test collapse.'); snapshot = structuredClone(state); assert.equal(buildStructure(state, civ.id, 'habitat').ok, false); assert.deepEqual(state, snapshot);
});
test('black-hole construction uses the selected colony star and shares UI readiness', () => {
  const { state, civ, system, colony } = constructionUniverse(), star = state.objects[system.starId];
  state.selectedId = colony.id; const original = structuredClone(state);
  assert.equal(structureReadiness(state, civ.id, 'black-hole-generator', true, colony.id).ok, false); assert.equal(buildStructure(state, civ.id, 'black-hole-generator', true, colony.id).ok, false); assert.deepEqual(state, original);
  star.type = 'black-hole'; star.stellar!.stage = 'remnant'; star.stellar!.luminosity = 0.025;
  assert.equal(structureReadiness(state, civ.id, 'dyson', true, colony.id).ok, false); assert.match(advancedPanel(state), /A Dyson swarm needs a luminous star/);
  assert.equal(buildStructure(state, civ.id, 'black-hole-generator', true, colony.id).ok, true); assert.ok(structureAt(state, civ.id, 'black-hole-generator', system.id));
  assert.match(civ.timeline.at(-1)!.detail, new RegExp(system.name)); assertUniverse(state);
});
test('autonomous construction skips unsuitable home sites, uses industry and starts only one project', () => {
  const { state, civ, system, colony } = constructionUniverse(); state.time = 600; civ.industry = 30000;
  const star = state.objects[system.starId]; star.type = 'black-hole'; star.stellar!.stage = 'remnant'; star.stellar!.luminosity = 0.025;
  civ.technologies = ['spaceflight', 'interstellar', 'spacetime'];
  for (const systemId of ['system-0', system.id]) { const id = `existing-${systemId}`; state.megastructures[id] = { id, type: 'habitat', civilizationId: civ.id, systemId, startedAt: 0, endsAt: 300, status: 'complete' }; }
  const resources = { ...state.resources }; simulateAdvanced(state);
  assert.equal(Object.keys(state.megastructures).length, 3); assert.equal(civ.industry, 10000); assert.deepEqual(state.resources, resources);
  assert.ok(structureAt(state, civ.id, 'black-hole-generator', state.objects[colony.id].systemId)); assertUniverse(state);
});
test('a changed home system can build without overwriting the previous home structure', () => {
  const { state, civ, system, colony } = constructionUniverse(); assert.equal(buildStructure(state, civ.id, 'habitat').ok, true);
  const previous = structuredClone(state.megastructures[`${civ.id}:habitat`]); civ.planetId = colony.id;
  assert.equal(buildStructure(state, civ.id, 'habitat').ok, true); assert.deepEqual(state.megastructures[previous.id], previous);
  assert.ok(structureAt(state, civ.id, 'habitat', system.id)); assert.equal(Object.keys(state.megastructures).length, 2); assertUniverse(state);
});
test('the global construction limit refuses a new project without changing resources or industry', () => {
  const { state, civ } = constructionUniverse();
  for (let i = 0; i < 64; i++) {
    const world = makeObject(state.seed, `builder-world-${i}`, 'planet', 'star-0'); state.objects[world.id] = world; state.objects['star-0'].children.push(world.id);
    const owner = foundCivilization(state, world.id), id = `builder-habitat-${i}`;
    state.megastructures[id] = { id, type: 'habitat', civilizationId: owner.id, systemId: world.systemId, startedAt: 0, endsAt: 300, status: 'complete' };
  }
  const original = structuredClone(state); assert.equal(buildStructure(state, civ.id, 'habitat').ok, false); assert.deepEqual(state, original); assertUniverse(state);
});
