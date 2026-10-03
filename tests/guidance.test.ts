import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { advance } from '../src/simulation/engine.ts';
import { produce, timeToAfford } from '../src/simulation/economy.ts';
import { evolutionRate, habitability } from '../src/simulation/life.ts';
import { collapse, foundCivilization, researchRate } from '../src/simulation/civilizations.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { nextGoal } from '../src/ui/goals.ts';
import { lifeProgress, researchProgress } from '../src/ui/progress.ts';
import { PLAYTEST_SEEDS, runPlaythrough } from '../scripts/playthrough.ts';

test('32 active-care openings find a moon within three minutes and a culture within ten', () => {
  for (const seed of PLAYTEST_SEEDS) {
    const { milestones } = runPlaythrough(seed, 600);
    assert.ok(milestones.moon !== null && milestones.moon <= 180, `Moon missing for seed ${seed}`);
    assert.ok(milestones.civilization !== null && milestones.civilization <= 600, `Civilization missing for seed ${seed}`);
  }
});

test('affordability estimates cover all required resources and unavailable production', () => {
  const state = createUniverse(41, 0); state.resources.energy = 0; state.resources.minerals = 0;
  const cost = { energy: 90, minerals: 60 }, seconds = timeToAfford(state, cost)!;
  assert.equal(seconds, 60); produce(state, seconds); assert.equal(timeToAfford(state, cost), 0);
  assert.equal(timeToAfford(state, { quantum: 1 }), null); assert.equal(timeToAfford(state, { energy: -1 }), null);
});

test('evolution estimates use the simulated rate and hostile worlds show useful guidance', () => {
  const state = createUniverse(41, 0), world = state.objects['planet-0'];
  world.planet!.habitability = habitability(world, state); world.shieldUntil = 1000;
  const rate = evolutionRate(state, world), before = world.life!.progress; advance(state, 30);
  assert.ok(Math.abs(world.life!.progress - before - rate * 30) < 1e-9); assert.match(lifeProgress(state, world), /universe time/);
  world.planet!.habitability = 0.1; assert.equal(evolutionRate(state, world), 0); assert.match(lifeProgress(state, world), /gentler climate/);
});

test('research estimates include support and laws, and stop for extinct civilizations', () => {
  const state = createUniverse(41, 0), civ = foundCivilization(state, 'planet-0'); civ.researching = 'writing';
  const initial = researchRate(state, civ); civ.supportUntil = 600; state.meta.laws.research = 1;
  assert.ok(Math.abs(researchRate(state, civ) / initial - 1.5 * 1.12) < 1e-9); assert.match(researchProgress(state, civ), /Research progress: Writing/);
  collapse(state, civ, 'A test collapse.'); assert.equal(researchRate(state, civ), 0); assert.equal(researchProgress(state, civ), '');
});

test('guidance selects the correct world and late climate changes do not reset onboarding', () => {
  const state = createUniverse(41, 0); state.selectedId = 'star-0'; assert.equal(nextGoal(state).targetId, 'planet-0');
  state.totalUpgrades = 2; assert.equal(nextGoal(state).panel, 'explore');
  state.exploration.completed.orbital = 1;
  const civ = foundCivilization(state, 'planet-0'); civ.technologies = ['spaceflight']; generateSystem(state, 0);
  state.objects['planet-0'].planet!.habitability = 0.1;
  assert.equal(nextGoal(state).panel, 'research'); assert.equal(nextGoal(state).targetId, civ.planetId);
});

test('guidance gives a fallen early civilization a path to a fresh world', () => {
  const state = createUniverse(41, 0); state.totalUpgrades = 2; state.exploration.completed.orbital = 1;
  const civ = foundCivilization(state, 'planet-0'); collapse(state, civ, 'A test collapse.');
  assert.equal(nextGoal(state).panel, 'explore');
  generateSystem(state, 0);
  assert.equal(nextGoal(state).panel, 'develop'); assert.equal(nextGoal(state).targetId, 'galaxy-0-system-0-planet-0');
});
