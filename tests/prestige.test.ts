import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { rebirth, buyLaw } from '../src/gameplay/prestige.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
import { offlineCap } from '../src/core/meta.ts';
import { rates } from '../src/simulation/economy.ts';
import { assertUniverse } from '../src/core/invariants.ts';
test('rebirth requires developed worlds and retains only permanent progress', () => {
  const state = createUniverse(2, 0); assert.throws(() => rebirth(state)); const civ = foundCivilization(state, 'planet-0'); civ.technologies = ['dyson'];
  state.megastructures.test = { id: 'test', type: 'dyson', civilizationId: civ.id, systemId: 'system-0', startedAt: 0, endsAt: 0, status: 'complete' };
  state.achievements = ['worlds:1']; state.artifacts = ['living-archive:123']; state.meta.nextModifiers = ['abundant-minerals'];
  const next = rebirth(state, 77); assert.equal(next.seed, 77); assert.equal(next.meta.runs, 1); assert.ok(next.meta.cosmicKnowledge > 0); assert.equal(Object.keys(next.civilizations).length, 0);
  assert.deepEqual(next.achievements, state.achievements); assert.deepEqual(next.artifacts, state.artifacts); const boosted = rates(next).minerals; next.meta.activeModifiers = []; assert.equal(boosted, rates(next).minerals * 2); assertUniverse(next); assert.throws(() => rebirth(next));
});
test('universal laws have increasing costs, permanent effects and capped offline growth', () => {
  const state = createUniverse(2, 0); state.meta.cosmicKnowledge = 100000; assert.equal(buyLaw(state, 'production').ok, true); assert.ok(rates(state).energy > 2);
  for (let i = 0; i < 10; i++) buyLaw(state, 'offline'); assert.equal(offlineCap(state), 604800); assertUniverse(state);
});
