import { RESOURCE_IDS } from '../core/types.ts';
import type { GameEvent, Resources, Universe } from '../core/types.ts';

export interface ProgressSnapshot {
  resources: Resources;
  population: number;
  objects: number;
  systems: number;
  galaxies: number;
  civilizationIds: Set<string>;
  extinctIds: Set<string>;
  technologies: Set<string>;
  structures: Set<string>;
  discoveries: number;
  expeditions: number;
  eventIds: Set<string>;
}
export interface OfflineReport {
  seconds: number;
  capped: boolean;
  resources: Resources;
  populationChange: number;
  newWorlds: number;
  newSystems: number;
  newGalaxies: number;
  civilizationsFounded: number;
  civilizationsLost: number;
  technologies: string[];
  structuresCompleted: number;
  discoveries: number;
  expeditionsCompleted: number;
  highlights: GameEvent[];
}

export function captureProgress(state: Universe): ProgressSnapshot {
  const civilizations = Object.values(state.civilizations);
  return {
    resources: { ...state.resources },
    population: civilizations.reduce((sum, civ) => sum + civ.population, 0) + Object.values(state.galaxies).reduce((sum, galaxy) => sum + galaxy.backgroundPopulation, 0),
    objects: Object.keys(state.objects).length,
    systems: Object.keys(state.systems).length,
    galaxies: Object.keys(state.galaxies).length,
    civilizationIds: new Set(civilizations.map(civ => civ.id)),
    extinctIds: new Set(civilizations.filter(civ => civ.status === 'extinct').map(civ => civ.id)),
    technologies: new Set(civilizations.flatMap(civ => civ.technologies)),
    structures: new Set(Object.values(state.megastructures).filter(s => s.status === 'complete').map(s => s.id)),
    discoveries: Object.keys(state.discoveries).length,
    expeditions: Object.values(state.exploration.completed).reduce((sum, count) => sum + count, 0),
    eventIds: new Set(state.events.map(event => event.id))
  };
}

export function summarizeProgress(before: ProgressSnapshot, state: Universe, timing: { seconds: number; capped: boolean }): OfflineReport {
  const after = captureProgress(state);
  const followed = new Set(Object.values(state.civilizations).filter(civ => civ.followed).flatMap(civ => civ.colonies));
  const priority = (event: GameEvent) => (event.severity === 'danger' ? 4 : event.severity === 'wonder' ? 2 : 0) + (followed.has(event.targetId) ? 1 : 0);
  return {
    ...timing,
    resources: Object.fromEntries(RESOURCE_IDS.map(id => [id, state.resources[id] - before.resources[id]])) as Resources,
    populationChange: after.population - before.population,
    newWorlds: after.objects - before.objects,
    newSystems: after.systems - before.systems,
    newGalaxies: after.galaxies - before.galaxies,
    civilizationsFounded: [...after.civilizationIds].filter(id => !before.civilizationIds.has(id)).length,
    civilizationsLost: [...after.extinctIds].filter(id => !before.extinctIds.has(id)).length,
    technologies: [...after.technologies].filter(id => !before.technologies.has(id)),
    structuresCompleted: [...after.structures].filter(id => !before.structures.has(id)).length,
    discoveries: after.discoveries - before.discoveries,
    expeditionsCompleted: after.expeditions - before.expeditions,
    highlights: state.events.filter(event => !before.eventIds.has(event.id)).sort((a, b) => priority(b) - priority(a) || b.time - a.time).slice(0, 3)
  };
}
