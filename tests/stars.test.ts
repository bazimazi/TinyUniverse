import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { simulateStars } from '../src/simulation/stars.ts';
import { useAbility } from '../src/gameplay/abilities.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import { stellarActivityPanel } from '../src/ui/stellar.ts';
test('seeded systems are idempotent and have valid parent-child orbits', () => {
  const a = createUniverse(3, 0), b = createUniverse(3, 0); generateSystem(a, 2); generateSystem(b, 2);
  assert.deepEqual(a, b); const count = Object.keys(a.objects).length; generateSystem(a, 2); assert.equal(Object.keys(a.objects).length, count); assertUniverse(a);
});
test('mass determines stellar remnants and affects planetary climates', () => {
  const state = createUniverse(3, 0), system = generateSystem(state, 3), star = state.objects[system.starId];
  star.stellar!.lifespan = 90; const planet = state.objects[star.children[0]], before = planet.planet!.temperature;
  advance(state, 60); assert.equal(star.stellar!.stage, 'main-sequence'); advance(state, 30);
  assert.equal(star.type, 'black-hole'); assert.ok(planet.planet!.temperature < before); assertUniverse(state);
});

function flareUniverse() {
  const state = createUniverse(3, 0), star = state.objects['star-0']; star.stellar!.flareAt = 11;
  const second = makeObject(state.seed, 'flare-world', 'planet', star.id); state.objects[second.id] = second; star.children.push(second.id);
  return { state, star, home: state.objects['planet-0'], second };
}
test('flares arrive at the exact deadline, soften with natural protection and spare other systems', () => {
  const { state, star, home, second } = flareUniverse(), remote = generateSystem(state, 0);
  const remoteWorld = state.objects[state.objects[remote.starId].children[0]], remoteBefore = structuredClone(remoteWorld);
  home.planet!.atmosphere = home.planet!.magneticField = 0; second.planet!.atmosphere = second.planet!.magneticField = 1;
  home.life!.populations.microorganisms = second.life!.populations.microorganisms = 0.8;
  advance(state, 10.5); assert.equal(home.planet!.temperature, 288); assert.equal(star.stellar!.flareAt, 11);
  advance(state, 0.5); assert.equal(star.stellar!.flareAt, null); assert.equal(home.planet!.temperature, 296);
  assert.ok(second.planet!.temperature > 288 && second.planet!.temperature < home.planet!.temperature);
  assert.ok(second.life!.populations.microorganisms > home.life!.populations.microorganisms);
  assert.deepEqual(remoteWorld, remoteBefore); assert.equal(state.events.find(e => e.type === 'StellarFlare')!.time, 11); assertUniverse(state);
  const original = structuredClone(home); advance(state, 1); assert.deepEqual(home, original);
});
test('planetary shelter protects one world and expires before a flare arriving at its endpoint', () => {
  const { state, home, second } = flareUniverse(); home.shieldUntil = 12; second.shieldUntil = 11;
  const protectedBefore = structuredClone(home.planet); advance(state, 11);
  assert.deepEqual(home.planet, protectedBefore); assert.ok(second.planet!.temperature > 288);
  assert.ok(state.events.some(e => e.type === 'StellarFlareSheltered' && e.targetId === home.id)); assertUniverse(state);
});
test('fusion suppression protects all local worlds, persists and rejects unavailable actions atomically', () => {
  const { state, star, home, second } = flareUniverse(); state.resources.energy = 10000; state.resources.knowledge = 1000;
  let original = structuredClone(state); assert.equal(useAbility(state, 'suppress', star.id).ok, false); assert.deepEqual(state, original);
  foundCivilization(state, home.id).technologies = ['fusion'];
  original = structuredClone(state); assert.equal(useAbility(state, 'suppress', home.id).ok, false); assert.deepEqual(state, original);
  assert.equal(useAbility(state, 'suppress', star.id).ok, true); assert.equal(star.stellar!.suppressedUntil, 600);
  assert.equal(state.resources.energy, 8800); assert.equal(state.resources.knowledge, 940);
  const saved = deserialize(serialize(state)); original = structuredClone(saved);
  assert.equal(useAbility(saved, 'suppress', star.id).ok, false); assert.deepEqual(saved, original);
  assert.match(stellarActivityPanel(saved), /suppression covers its arrival/);
  advance(saved, 11); for (const id of [home.id, second.id]) assert.deepEqual(saved.objects[id].planet, state.objects[id].planet);
  assert.ok(saved.events.some(e => e.type === 'StellarFlareSuppressed')); assertUniverse(saved);
  saved.time = 300; assert.equal(useAbility(saved, 'suppress', star.id).ok, true); assert.equal(saved.objects[star.id].stellar!.suppressedUntil, 900);
});
test('suppression cannot delay stellar death and remnants never retain or schedule flares', () => {
  const { state, star } = flareUniverse(); star.stellar!.lifespan = 10; star.stellar!.suppressedUntil = 600;
  advance(state, 30); assert.equal(star.stellar!.stage, 'remnant'); assert.equal(star.stellar!.flareAt, null);
  assert.equal(state.events.some(e => e.type === 'StellarFlare'), false);
  foundCivilization(state, 'planet-0').technologies = ['fusion']; state.resources.energy = 10000; state.resources.knowledge = 1000;
  const original = structuredClone(state); assert.equal(useAbility(state, 'suppress', star.id).ok, false); assert.deepEqual(state, original);
  advance(state, 1800); assert.equal(star.stellar!.flareAt, null); assertUniverse(state);
});
test('pending flares resolve identically during stepped play, save reload and offline catch-up', async () => {
  const { state } = flareUniverse(), live = structuredClone(state);
  for (let i = 0; i < 120; i++) advance(live, 0.5);
  const saved = deserialize(serialize(state)), offline = await catchUp(saved, 60000);
  assert.deepEqual(offline.state.objects, live.objects); assert.deepEqual(offline.state.events, live.events);
  for (const id of Object.keys(state.resources) as (keyof typeof state.resources)[]) assert.ok(Math.abs(offline.state.resources[id] - live.resources[id]) < 1e-8);
  assert.ok(offline.result.highlights.some(e => e.type === 'StellarFlare')); assertUniverse(offline.state);
});
test('generated stars begin their activity clock on discovery rather than replaying old checks', () => {
  const state = createUniverse(3, 0); state.time = 10000;
  const system = generateSystem(state, 2), star = state.objects[system.starId]; assert.equal(star.stellar!.lastActivityAt, 10000);
  simulateStars(state); assert.equal(star.stellar!.flareAt, null); assertUniverse(state);
});
test('seeded activity gives one durable warning after the opening and resolves it after 90 seconds', () => {
  const state = createUniverse(7, 0); advance(state, 899); assert.equal(state.objects['star-0'].stellar!.flareAt, null);
  advance(state, 1); const star = state.objects['star-0'].stellar!;
  assert.equal(star.flareAt, 990); assert.equal(star.lastActivityAt, 900); assert.equal(state.events.filter(e => e.type === 'StellarFlareWarning').length, 1);
  simulateStars(state); assert.equal(state.events.filter(e => e.type === 'StellarFlareWarning').length, 1);
  const saved = deserialize(serialize(state)); advance(saved, 89); assert.equal(saved.objects['star-0'].stellar!.flareAt, 990);
  advance(saved, 1); assert.equal(saved.objects['star-0'].stellar!.flareAt, null); assert.ok(saved.events.some(e => e.type === 'StellarFlare')); assertUniverse(saved);
});
test('witnessing and suppressing flares record distinct, lasting Codex discoveries once', () => {
  const { state, star } = flareUniverse(); star.stellar!.suppressedUntil = 600; advance(state, 11);
  assert.ok(state.discoveries['cosmic:flare-suppressed']); assert.equal(Object.hasOwn(state.discoveries, 'cosmic:stellar-flare'), false);
  star.stellar!.suppressedUntil = 0; star.stellar!.flareAt = 12; advance(state, 1);
  const discovery = structuredClone(state.discoveries['cosmic:stellar-flare']); assert.equal(discovery.time, 12);
  star.stellar!.flareAt = 13; advance(state, 1); assert.deepEqual(state.discoveries['cosmic:stellar-flare'], discovery);
  const saved = deserialize(serialize(state)); assert.ok(saved.discoveries['cosmic:flare-suppressed']); assert.deepEqual(saved.discoveries['cosmic:stellar-flare'], discovery);
});
