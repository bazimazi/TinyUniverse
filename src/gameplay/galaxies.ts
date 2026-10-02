import { GALAXY_BALANCE } from '../core/config.ts';
import { entitySeed, nameFor, random } from '../core/random.ts';
import type { Galaxy, Universe } from '../core/types.ts';
import { generateSystem } from './systems.ts';
import { logEvent } from '../core/universe.ts';
export function initialGalaxy(seed: number, id: string, time = 0): Galaxy {
  const galaxySeed = entitySeed(seed, id), rng = random(galaxySeed);
  return { id, seed: galaxySeed, name: `${nameFor(galaxySeed)} Reach`, totalSystems: 3000 + Math.floor(rng() * 9000), surveyed: 0, backgroundCivilizations: 0, backgroundPopulation: 0, lastUpdate: time };
}
export function discoverGalaxy(state: Universe, index: number): Galaxy {
  const id = `galaxy-${index}`;
  if (state.galaxies[id]) return state.galaxies[id];
  const galaxy = initialGalaxy(state.seed, id, state.time); state.galaxies[id] = galaxy;
  if (Object.keys(state.systems).length < GALAXY_BALANCE.maxDetailedSystems) generateSystem(state, 0, id);
  logEvent(state, 'GalaxyDiscovered', state.selectedId, `The ${galaxy.name}`, `${galaxy.totalSystems.toLocaleString('en')} potential systems. Only surveyed worlds become detailed objects.`, 'wonder');
  return galaxy;
}
