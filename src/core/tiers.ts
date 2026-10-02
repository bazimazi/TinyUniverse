import { BALANCE, GALAXY_BALANCE } from './config.ts';
import type { CelestialObject, Universe } from './types.ts';
export function simulationTier(state: Universe, object: CelestialObject): 'active' | 'nearby' | 'background' {
  const selected = state.objects[state.selectedId];
  if (selected.systemId === object.systemId) return 'active';
  return state.systems[selected.systemId].galaxyId === state.systems[object.systemId].galaxyId ? 'nearby' : 'background';
}
export function updateInterval(state: Universe, object: CelestialObject): number {
  const tier = simulationTier(state, object);
  return tier === 'active' ? BALANCE.decisionInterval : tier === 'nearby' ? GALAXY_BALANCE.nearbyInterval : GALAXY_BALANCE.backgroundInterval;
}
