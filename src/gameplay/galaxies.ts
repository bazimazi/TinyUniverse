import { GALAXY_BALANCE } from '../core/config.ts';
import type { Galaxy, Universe } from '../core/types.ts';
import { canDetailSystem, generateSystem } from './systems.ts';
import { logEvent } from '../core/universe.ts';
import { initialGalaxy } from '../core/galaxy.ts';
export function discoverGalaxy(state: Universe, index: number): Galaxy {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('Invalid procedural galaxy address.');
  const id = `galaxy-${index}`;
  if (Object.hasOwn(state.galaxies, id)) return state.galaxies[id];
  if (Object.keys(state.galaxies).length >= GALAXY_BALANCE.maxGalaxies) throw new Error('This universe is fully charted.');
  const galaxy = initialGalaxy(state.seed, id, state.time); state.galaxies[id] = galaxy;
  if (canDetailSystem(state)) generateSystem(state, 0, id);
  logEvent(state, 'GalaxyDiscovered', state.selectedId, `The ${galaxy.name}`, `${galaxy.totalSystems.toLocaleString('en')} potential systems. Only surveyed worlds become detailed objects.`, 'wonder');
  return galaxy;
}
