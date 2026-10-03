import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createUniverse } from '../src/core/universe.ts';
import { hash } from '../src/core/random.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { advance } from '../src/simulation/engine.ts';
import { buyUpgrade } from '../src/simulation/economy.ts';
import { hasTechnology } from '../src/simulation/civilizations.ts';
import { startExploration } from '../src/gameplay/exploration.ts';
import { canRebirth } from '../src/gameplay/prestige.ts';

export const PLAYTEST_SEEDS = [0, 1, 7, 12, 42, 101, 1307, 4294967295, ...Array.from({ length: 24 }, (_, i) => hash(`playtest:${i}`))];
export type Milestone = 'moon' | 'civilization' | 'spaceflight' | 'system' | 'galaxy' | 'rebirth';

// A reproducible care policy, not a substitute for human retention playtesting.
// One purchase per five seconds; no gifts, debug resources or time acceleration.
export function runPlaythrough(seed: number, seconds = 14400) {
  const state = createUniverse(seed, 0);
  const milestones: Record<Milestone, number | null> = { moon: null, civilization: null, spaceflight: null, system: null, galaxy: null, rebirth: null };
  while (state.time < seconds) {
    const world = state.objects['planet-0'];
    if (!world.upgrades.solar) buyUpgrade(state, world.id, 'solar');
    else if (!world.upgrades.mining) buyUpgrade(state, world.id, 'mining');
    else if (!state.exploration.completed.orbital && !state.exploration.job) startExploration(state);
    else if (world.planet!.habitability < 0.8 || world.upgrades.biodiversity < 4) {
      for (const id of ['atmosphere', 'oceans', 'biodiversity'] as const) if (world.upgrades[id] < 8 && buyUpgrade(state, world.id, id).ok) break;
    }
    if (hasTechnology(state, 'spaceflight') && Object.keys(state.systems).length === 1 && !state.exploration.job) startExploration(state, 'interstellar');
    if (hasTechnology(state, 'interstellar') && Object.keys(state.galaxies).length === 1 && !state.exploration.job) startExploration(state, 'galactic');
    advance(state, Math.min(5, seconds - state.time));
    const reached: Record<Milestone, boolean> = {
      moon: state.exploration.completed.orbital > 0,
      civilization: !!state.civilizations['civ-planet-0'],
      spaceflight: hasTechnology(state, 'spaceflight'),
      system: Object.keys(state.systems).length > 1,
      galaxy: Object.keys(state.galaxies).length > 1,
      rebirth: canRebirth(state)
    };
    for (const id of Object.keys(reached) as Milestone[]) if (reached[id] && milestones[id] === null) milestones[id] = state.time;
  }
  assertUniverse(state);
  return { seed, milestones, state };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = PLAYTEST_SEEDS.map(seed => runPlaythrough(seed));
  console.log(`Active-care playthrough: ${results.length} seeds, four hours of universe time at 1x.`);
  for (const id of Object.keys(results[0].milestones) as Milestone[]) {
    const times = results.flatMap(result => result.milestones[id] === null ? [] : [result.milestones[id]!]).sort((a, b) => a - b);
    console.log(`${id}: ${times.length}/${results.length} reached; seconds min/median/max ${times[0] ?? '-'} / ${times[Math.floor(times.length / 2)] ?? '-'} / ${times.at(-1) ?? '-'}`);
  }
  for (const { seed, milestones } of results) {
    assert.ok(milestones.moon !== null && milestones.moon <= 180, `Seed ${seed}: first moon took ${milestones.moon}s.`);
    assert.ok(milestones.civilization !== null && milestones.civilization <= 600, `Seed ${seed}: first civilization took ${milestones.civilization}s.`);
    assert.ok(milestones.system !== null && milestones.system <= 7200, `Seed ${seed}: first system took ${milestones.system}s.`);
  }
}
