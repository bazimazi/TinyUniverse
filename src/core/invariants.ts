import { RESOURCE_IDS } from './types.ts';
import type { Universe } from './types.ts';
export function assertUniverse(state: Universe): void {
  const finite = (value: unknown, minimum = 0) => typeof value === 'number' && Number.isFinite(value) && value >= minimum;
  if (!state || !finite(state.seed) || !finite(state.time) || !finite(state.lastTimestamp) || !finite(state.totalUpgrades)) throw new Error('Invalid universe clock or progression.');
  if (!state.resources || RESOURCE_IDS.some(id => !finite(state.resources[id]))) throw new Error('Invalid resource balance.');
  if (!state.objects || !state.objects['planet-0'] || !state.objects[state.selectedId]) throw new Error('Missing home world or selection.');
  if (!Array.isArray(state.events) || !state.settings || Object.values(state.settings).some(value => typeof value !== 'boolean')) throw new Error('Invalid history or settings.');
  for (const [id, object] of Object.entries(state.objects)) {
    if (!object || object.id !== id || typeof object.name !== 'string' || object.name.length > 80 || !finite(object.mass, Number.MIN_VALUE) || !finite(object.radius, Number.MIN_VALUE)) throw new Error('Invalid celestial object.');
    if (!['star', 'planet', 'moon', 'asteroid', 'gas-giant', 'nebula', 'black-hole', 'neutron-star', 'white-dwarf'].includes(object.type) || !Array.isArray(object.children) || !object.upgrades || ['solar', 'mining', 'atmosphere', 'oceans', 'biodiversity'].some(key => !finite(object.upgrades[key as keyof typeof object.upgrades]))) throw new Error('Invalid celestial properties.');
    if (!state.systems?.[object.systemId] || object.stellar && Object.values(object.stellar).filter(v => typeof v === 'number').some(v => !finite(v))) throw new Error('Invalid star system.');
    if (object.parentId && !state.objects[object.parentId]) throw new Error('Missing orbit parent.');
    if (object.orbit && (!finite(object.orbit.radius, 1) || !finite(object.orbit.period, 1) || !finite(object.orbit.eccentricity) || object.orbit.eccentricity >= 1 || !finite(object.orbit.phase))) throw new Error('Invalid orbit.');
    if (object.planet && Object.values(object.planet).some(value => !finite(value))) throw new Error('Invalid planet environment.');
    if (object.planet && (!object.life || !['chemistry', 'simple', 'complex', 'intelligent'].includes(object.life.stage) || !finite(object.life.progress) || !finite(object.life.species) || Object.values(object.life.populations).some(value => !finite(value) || value > 1))) throw new Error('Invalid ecosystem.');
    const ancestors = new Set<string>([id]);
    let parent = object.parentId;
    while (parent) {
      if (ancestors.has(parent)) throw new Error('Orbit hierarchy contains a cycle.');
      ancestors.add(parent);
      parent = state.objects[parent].parentId;
    }
  }
  if (!state.exploration || !finite(state.exploration.completed.orbital)) throw new Error('Invalid exploration state.');
  const job = state.exploration.job;
  if (job && (!['orbital', 'interstellar', 'galactic'].includes(job.kind) || !state.objects[job.targetId] || !finite(job.startedAt) || !finite(job.endsAt) || job.endsAt < state.time || !finite(job.index))) throw new Error('Invalid exploration job.');
  if (!state.galaxies || Object.values(state.galaxies).some(g => !finite(g.totalSystems, 1) || !finite(g.surveyed) || !finite(g.backgroundPopulation) || !finite(g.backgroundCivilizations))) throw new Error('Invalid galaxy aggregates.');
  if (!state.civilizations) throw new Error('Invalid civilizations.');
  if (!state.relations || !state.megastructures) throw new Error('Invalid advanced civilization state.');
  if (!state.cooldowns || Object.values(state.cooldowns).some(value => !finite(value)) || ![1, 2, 5, 10, 25].includes(state.speed)) throw new Error('Invalid abilities or speed.');
  for (const civ of Object.values(state.civilizations)) {
    if (!state.objects[civ.planetId]?.planet || !finite(civ.population) || !finite(civ.foundedAt) || !finite(civ.level) || !finite(civ.researchPoints) || !Array.isArray(civ.technologies) || !Array.isArray(civ.timeline) || !['active', 'extinct'].includes(civ.status)) throw new Error('Invalid civilization.');
    for (const value of [civ.stability, civ.science, civ.energy, civ.economy, civ.infrastructure, civ.military]) if (!finite(value) || value > 1) throw new Error('Invalid civilization statistics.');
  }
}
