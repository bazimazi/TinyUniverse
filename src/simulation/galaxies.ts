import { GALAXY_BALANCE } from '../core/config.ts';
import { civilizationEvent } from './civilizations.ts';
import type { Universe } from '../core/types.ts';
export function simulateGalaxies(state: Universe): void {
  if (Math.round(state.time) % GALAXY_BALANCE.backgroundInterval !== 0) return;
  for (const galaxy of Object.values(state.galaxies)) {
    const elapsed = state.time - galaxy.lastUpdate; galaxy.lastUpdate = state.time;
    galaxy.backgroundPopulation = Math.min(galaxy.totalSystems * 1e10, galaxy.backgroundPopulation * Math.exp(GALAXY_BALANCE.populationGrowth * elapsed));
  }
  if (Math.round(state.time) % GALAXY_BALANCE.expansionInterval !== 0) return;
  const occupied = new Set(Object.values(state.civilizations).filter(c => c.status === 'active').flatMap(c => c.colonies));
  const planets = Object.values(state.objects).filter(o => o.planet && o.planet.habitability >= 0.4);
  for (const civ of Object.values(state.civilizations)) {
    if (civ.status !== 'active' || !civ.technologies.includes('spaceflight') || civ.traits.includes('Isolationist')) continue;
    const source = state.objects[civ.planetId];
    const candidates = planets.filter(o => !occupied.has(o.id) && (o.systemId === source.systemId || civ.technologies.includes('interstellar')));
    if (Math.round(state.time) % GALAXY_BALANCE.expansionInterval === 0 && candidates.length) {
      const destination = candidates[0]; civ.colonies.push(destination.id); occupied.add(destination.id);
      civilizationEvent(state, civ, 'CivilizationExpanded', `${civ.name} reached ${destination.name}`, 'Their world is no longer their only home.', 'wonder');
    } else if (civ.technologies.includes('interstellar') && Math.round(state.time) % GALAXY_BALANCE.expansionInterval === 0) {
      const galaxy = state.galaxies[state.systems[source.systemId].galaxyId];
      if (galaxy.backgroundCivilizations < galaxy.totalSystems) { galaxy.backgroundCivilizations++; galaxy.backgroundPopulation += civ.population * 0.05; }
    }
  }
}
