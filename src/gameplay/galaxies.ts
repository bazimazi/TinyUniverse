import { BALANCE, GALAXY_BALANCE } from '../core/config.ts';
import type { Galaxy, Universe } from '../core/types.ts';
import { generateSystem } from './systems.ts';
import { logEvent } from '../core/universe.ts';
import { initialGalaxy } from '../core/galaxy.ts';
export function discoverGalaxy(state: Universe, index: number): Galaxy {
  const id = `galaxy-${index}`;
  if (state.galaxies[id]) return state.galaxies[id];
  const galaxy = initialGalaxy(state.seed, id, state.time); state.galaxies[id] = galaxy;
  if (Object.keys(state.systems).length < GALAXY_BALANCE.maxDetailedSystems && Object.keys(state.objects).length < BALANCE.maxObjects - 4) generateSystem(state, 0, id);
  logEvent(state, 'GalaxyDiscovered', state.selectedId, `The ${galaxy.name}`, `${galaxy.totalSystems.toLocaleString('en')} potential systems. Only surveyed worlds become detailed objects.`, 'wonder');
  return galaxy;
}
