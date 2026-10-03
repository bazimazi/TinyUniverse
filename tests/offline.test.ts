import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, logEvent } from '../src/core/universe.ts';
import { advance } from '../src/simulation/engine.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import { SessionClock } from '../src/simulation/session-clock.ts';
import { captureProgress, summarizeProgress } from '../src/simulation/offline-report.ts';
import { offlineReportContent } from '../src/ui/offline.ts';
import { startExploration } from '../src/gameplay/exploration.ts';
import { collapse, foundCivilization } from '../src/simulation/civilizations.ts';
import { spend } from '../src/simulation/economy.ts';
import { assertUniverse } from '../src/core/invariants.ts';

test('a return reports resources and completed expeditions without mutating its source', async () => {
  const source = createUniverse(41, 0); source.totalUpgrades = 2; source.resources.energy = 1000; source.resources.minerals = 1000;
  startExploration(source);
  const original = structuredClone(source), caught = await catchUp(source, 60000);
  assert.deepEqual(source, original); assert.equal(caught.result.seconds, 60); assert.equal(caught.result.resources.energy, 120);
  assert.equal(caught.result.expeditionsCompleted, 1); assert.equal(caught.result.newWorlds, 1); assert.ok(caught.result.discoveries > 0);
  assert.equal(caught.state.exploration.job, null); assertUniverse(caught.state);
});

test('a return records research, construction and population while retaining collapse history', async () => {
  const source = createUniverse(41, 0), civ = foundCivilization(source, 'planet-0');
  civ.researching = 'writing'; civ.researchPoints = 80;
  source.megastructures.test = { id: 'test', type: 'habitat', civilizationId: civ.id, systemId: 'system-0', startedAt: 0, endsAt: 45, status: 'building' };
  const caught = await catchUp(source, 60000);
  assert.ok(caught.result.technologies.includes('writing')); assert.equal(caught.result.structuresCompleted, 1); assert.ok(caught.result.populationChange > 0);
  const before = captureProgress(caught.state);
  collapse(caught.state, caught.state.civilizations[civ.id], 'Their environment changed.');
  const report = summarizeProgress(before, caught.state, { seconds: 30, capped: false });
  assert.equal(report.civilizationsLost, 1); assert.ok(report.populationChange < 0); assert.deepEqual(report.technologies, []); assertUniverse(caught.state);
});

test('summary resource changes include spending and highlight text is escaped', () => {
  const state = createUniverse(41, 0); state.resources.energy = 1000;
  const before = captureProgress(state); advance(state, 30); spend(state, { energy: 200 });
  logEvent(state, 'Test', 'planet-0', '<img src=x onerror=alert(1)>', '<script>bad()</script>', 'danger');
  const report = summarizeProgress(before, state, { seconds: 30, capped: false });
  assert.equal(report.resources.energy, -140);
  const html = offlineReportContent(report);
  assert.ok(html.includes('\u2212140')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<img'));
});

test('failed catch-up leaves the current universe intact and long returns respect the cap', async () => {
  const source = createUniverse(41, 0), original = structuredClone(source);
  await assert.rejects(catchUp(source, Number.NaN)); assert.deepEqual(source, original);
  const caught = await catchUp(source, 172800000);
  assert.equal(caught.result.seconds, 86400); assert.equal(caught.result.capped, true); assertUniverse(caught.state);
});

test('session clocks route long gaps to offline catch-up and never repeat stale frames', () => {
  const clock = new SessionClock(1000, 0);
  assert.deepEqual(clock.sample(2000, 1000), { seconds: 1, needsCatchUp: false });
  assert.deepEqual(clock.sample(2001, 990), { seconds: 0, needsCatchUp: false });
  assert.deepEqual(clock.sample(2100, 1100), { seconds: 0.1, needsCatchUp: false });
  assert.deepEqual(clock.sample(62100, 61100), { seconds: 0, needsCatchUp: true });
  clock.reset(62100, 61100);
  assert.deepEqual(clock.sample(62000, 61200), { seconds: 0.1, needsCatchUp: false });
  assert.deepEqual(clock.sample(122000, 61300), { seconds: 0, needsCatchUp: true });
});

test('accelerated live time is credited once and subsequent gaps run at the offline rate', async () => {
  const source = createUniverse(41, 0), clock = new SessionClock(0, 0);
  const live = clock.sample(1000, 1000); advance(source, live.seconds * 5); source.lastTimestamp = 1000;
  assert.equal(clock.sample(61000, 61000).needsCatchUp, true);
  const caught = await catchUp(source, 61000);
  assert.equal(caught.state.time, 65); assert.equal(caught.result.seconds, 60);
  const repeated = await catchUp(caught.state, 61000);
  assert.equal(repeated.result.seconds, 0); assert.equal(repeated.state.time, 65);
});
