import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, DISCOVERY_BALANCE } from '../src/core/config.ts';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { hash } from '../src/core/random.ts';
import { advance } from '../src/simulation/engine.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import { collapse, foundCivilization } from '../src/simulation/civilizations.ts';
import { simulateDiscoveries } from '../src/simulation/discoveries.ts';
import { findAnomaly, investigate, investigationReadiness, investigationReward, recordRuins, ruinsId } from '../src/gameplay/discoveries.ts';
import type { InvestigationChoice } from '../src/gameplay/discoveries.ts';
import { rebirth } from '../src/gameplay/prestige.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
import { civilizationPanel } from '../src/ui/civilizations.ts';
import { discoveriesPanel } from '../src/ui/discoveries.ts';

function fallenArchive() {
  const state = createUniverse(45, 0), civ = foundCivilization(state, 'planet-0');
  civ.technologies = ['agriculture', 'writing']; state.resources.energy = state.resources.knowledge = state.resources.biology = 10000;
  collapse(state, civ, 'Their environment changed.');
  return { state, civ, id: ruinsId(state, civ) };
}
function envelope(state: unknown): string { const payload = JSON.stringify(state); return JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload }); }

test('collapse leaves a named, deterministic and deduplicated archive alongside its history', () => {
  const { state, civ, id } = fallenArchive(), other = fallenArchive();
  assert.equal(state.anomalies[id].kind, 'ancient-ruins'); assert.equal(state.anomalies[id].status, 'found');
  assert.deepEqual(state.anomalies, other.state.anomalies); assert.match(state.discoveries[id].detail, /2 technologies/);
  assert.ok(state.discoveries[id].title.includes(civ.name)); assert.match(civilizationPanel(state), /Explore their legacy/);
  const original = structuredClone(state); collapse(state, civ, 'Repeated collapse.'); recordRuins(state, civ); assert.deepEqual(state, original);
  assert.deepEqual(deserialize(serialize(state)), state); assertUniverse(state);
});

test('old fallen civilizations acquire archives during simulation without reviving or losing records', () => {
  const { state, civ, id } = fallenArchive(); delete state.anomalies[id]; delete state.discoveries[id]; civ.timeline.pop();
  const archived = deserialize(serialize(state)); advance(archived, 30);
  assert.equal(archived.anomalies[id].status, 'found'); assert.equal(archived.civilizations[civ.id].status, 'extinct');
  assert.deepEqual(archived.civilizations[civ.id].technologies, civ.technologies); assert.equal(archived.civilizations[civ.id].population, 0);
  const count = archived.events.filter(e => e.type === 'RuinsDiscovered').length; simulateDiscoveries(archived);
  assert.equal(archived.events.filter(e => e.type === 'RuinsDiscovered').length, count); assertUniverse(archived);
});

test('investigation readiness rejects unavailable, inherited, premature and unfunded choices atomically', () => {
  const { state, id } = fallenArchive();
  for (const [target, choice] of [['__proto__', null], ['constructor', null], ['missing', null], [id, 'preserve'], [id, 'decode'], [id, 'wrong']] as [string, InvestigationChoice][]) {
    const original = structuredClone(state); assert.equal(investigationReadiness(state, target, choice).ok, false);
    assert.equal(investigate(state, target, choice).ok, false); assert.deepEqual(state, original);
  }
  state.resources.knowledge = 0; const original = structuredClone(state);
  assert.equal(investigate(state, id).ok, false); assert.deepEqual(state, original);
  const html = discoveriesPanel(state); assert.match(html, /Gather the resources/); assert.match(html, /data-action="investigate"[^>]+disabled/);
  state.resources.knowledge = 1000; assert.equal(investigate(state, id).ok, true); const busy = structuredClone(state);
  assert.equal(investigate(state, id).ok, false); assert.deepEqual(state, busy);
  advance(state, DISCOVERY_BALANCE.investigation); const awaiting = structuredClone(state);
  assert.equal(investigate(state, id).ok, false); assert.deepEqual(state, awaiting);
  const readiness = investigationReadiness(state, id, 'preserve'); assert.equal(readiness.duration, DISCOVERY_BALANCE.resolution); assert.deepEqual(state, awaiting);
});

test('preserving ruins restores ecology and pays one bounded reward at the exact saved deadline', () => {
  const { state, civ, id } = fallenArchive(); advance(state, 7.5);
  assert.equal(investigate(state, id).ok, true); advance(state, 60); const choice = deserialize(serialize(state));
  assert.equal(investigate(choice, id, 'preserve').ok, true); const deadline = choice.anomalies[id].nextAt!;
  advance(choice, 89.5); assert.equal(choice.anomalies[id].status, 'investigating'); assert.equal(choice.artifacts.length, 0);
  const before = structuredClone(choice), world = choice.objects['planet-0']; advance(choice, 0.5);
  assert.equal(choice.time, deadline); assert.equal(choice.anomalies[id].status, 'resolved');
  assert.equal(choice.resources.knowledge - before.resources.knowledge, DISCOVERY_BALANCE.rewardKnowledge);
  assert.ok(choice.resources.biology - before.resources.biology >= DISCOVERY_BALANCE.ruinsBiology);
  assert.ok(Math.abs(world.life!.progress - before.objects['planet-0'].life!.progress - DISCOVERY_BALANCE.archiveProgress) < 1e-10);
  const populations = world.life!.populations;
  for (const key of Object.keys(populations) as (keyof typeof populations)[]) assert.ok(Math.abs(populations[key] - Math.min(1, before.objects['planet-0'].life!.populations[key] + DISCOVERY_BALANCE.ruinsEcosystemBoost)) < 1e-12);
  assert.equal(choice.civilizations[civ.id].status, 'extinct'); assert.equal(choice.civilizations[civ.id].timeline.at(-1)!.type, 'RuinsRecovered');
  assert.equal(choice.artifacts.length, 1); const resolved = structuredClone(choice); assert.equal(investigate(choice, id, 'decode').ok, false); assert.deepEqual(choice, resolved);
  advance(choice, 60); assert.deepEqual(choice.artifacts, resolved.artifacts); assertUniverse(choice);
});

test('decoding ruins assists the living colony owner and leaves the fallen civilization silent', () => {
  const { state, civ, id } = fallenArchive(), successorWorld = makeObject(state.seed, 'successor', 'planet', 'star-0');
  state.objects[successorWorld.id] = successorWorld; state.objects['star-0'].children.push(successorWorld.id);
  const successor = foundCivilization(state, successorWorld.id); successor.colonies.push(civ.planetId); successor.researching = 'reality';
  successor.domains.quantum = 0.01; successor.science = 0;
  const reward = investigationReward(state, id, 'decode'); assert.equal(reward.resources.minerals, DISCOVERY_BALANCE.ruinsMinerals);
  investigate(state, id); advance(state, 60); const points = successor.researchPoints; investigate(state, id, 'decode'); advance(state, 90);
  assert.equal(successor.researchPoints - points, DISCOVERY_BALANCE.rewardResearch); assert.equal(civ.researchPoints, 0); assert.equal(civ.population, 0);
  assert.equal(state.resources.exotic, DISCOVERY_BALANCE.rewardExotic); assert.ok(state.resources.minerals >= DISCOVERY_BALANCE.ruinsMinerals);
  assert.match(state.artifacts[0], /^star-map:/); assertUniverse(state);
});

test('generic signals retain their rewards and never bank research for an idle civilization', () => {
  const state = createUniverse(45, 0), civ = foundCivilization(state, 'planet-0'); findAnomaly(state, 'planet-0', 0);
  const id = Object.keys(state.anomalies)[0]; state.resources.energy = state.resources.knowledge = 10000;
  const reward = investigationReward(state, id, 'decode'); assert.equal(reward.resources.minerals, undefined);
  investigate(state, id); advance(state, 60); investigate(state, id, 'decode');
  // Finish between decision ticks while the owner has no active project.
  civ.researching = null; state.anomalies[id].nextAt = state.time + 1; const points = civ.researchPoints;
  advance(state, 1); assert.equal(civ.researchPoints, points); assert.equal(state.resources.exotic, DISCOVERY_BALANCE.rewardExotic); assertUniverse(state);
});

test('signal capacity retains existing investigations and explains unavailable ruin archives', () => {
  const state = createUniverse(45, 0), civ = foundCivilization(state, 'planet-0');
  for (let i = 0; i < DISCOVERY_BALANCE.maxAnomalies; i++) {
    const id = `full-${i}`; state.anomalies[id] = { id, seed: i, targetId: civ.planetId, kind: 'time-echo', stage: 0, status: 'found', choice: null, nextAt: null };
  }
  const signals = structuredClone(state.anomalies); collapse(state, civ, 'Test collapse.'); advance(state, 30);
  assert.deepEqual(state.anomalies, signals); assert.match(civilizationPanel(state), /signal archive is full/); assertUniverse(state);
});

test('impossible investigation stages and archives above the bound are rejected before import', () => {
  const { state, id } = fallenArchive();
  for (const fields of [{ stage: 1 }, { choice: 'decode' }, { stage: 3, status: 'resolved', choice: null }, { stage: 0, status: 'investigating', choice: 'decode', nextAt: 60 }, { stage: 1, status: 'investigating', choice: null, nextAt: 60 }]) {
    const invalid = structuredClone(state); Object.assign(invalid.anomalies[id], fields); assert.throws(() => deserialize(envelope(invalid)), /investigation stage/);
  }
  for (let i = 0; i < DISCOVERY_BALANCE.maxAnomalies; i++) state.anomalies[`extra-${i}`] = { ...state.anomalies[id], id: `extra-${i}` };
  assert.throws(() => deserialize(envelope(state)), /signal archive size/);
});

test('ruin rewards remain capped and imported names are escaped in legacy controls', () => {
  const { state, civ, id } = fallenArchive(); civ.name = '<img src=x onerror=alert(1)>';
  state.objects[civ.planetId].name = '<script>bad()</script>'; state.discoveries[id].title = `Ruins of ${civ.name}`;
  const html = civilizationPanel(state) + discoveriesPanel(state); assert.ok(html.includes('&lt;img')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>'));
  investigate(state, id); advance(state, 60); investigate(state, id, 'decode');
  state.resources.knowledge = state.resources.exotic = state.resources.minerals = BALANCE.resourceLimit; advance(state, 90);
  for (const resource of ['knowledge', 'exotic', 'minerals'] as const) assert.equal(state.resources[resource], BALANCE.resourceLimit); assertUniverse(state);
});

test('saved ruin investigations agree in stepped play and offline returns and survive rebirth as collections', async () => {
  const { state, civ, id } = fallenArchive(); investigate(state, id); advance(state, 60); investigate(state, id, 'decode');
  const live = structuredClone(state); for (let i = 0; i < 600; i++) advance(live, 1);
  const offline = await catchUp(deserialize(serialize(state)), 600000);
  assert.deepEqual(offline.state.anomalies, live.anomalies); assert.deepEqual(offline.state.civilizations, live.civilizations); assert.deepEqual(offline.state.discoveries, live.discoveries); assert.deepEqual(offline.state.artifacts, live.artifacts);
  for (const resource of Object.keys(state.resources) as (keyof typeof state.resources)[]) assert.ok(Math.abs(offline.state.resources[resource] - live.resources[resource]) < 1e-7);
  live.civilizations[civ.id].technologies.push('dyson'); live.megastructures.test = { id: 'test', civilizationId: civ.id, systemId: 'system-0', type: 'dyson', status: 'complete', startedAt: 0, endsAt: 0 };
  const next = rebirth(live, state.seed);
  assert.deepEqual(next.artifacts, live.artifacts); assert.deepEqual(next.discoveries, live.discoveries); assert.equal(Object.keys(next.anomalies).length, 0);
  const another = foundCivilization(next, civ.planetId); collapse(next, another, 'A new history.'); assert.notEqual(ruinsId(next, another), id);
  assert.ok(next.discoveries[id]); assert.ok(next.discoveries[ruinsId(next, another)]); assertUniverse(next);
});
