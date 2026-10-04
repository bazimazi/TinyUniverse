import { BALANCE, META_BALANCE } from '../core/config.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import { entitySeed, nameFor, random } from '../core/random.ts';
import { logEvent } from '../core/universe.ts';
import type { Civilization, Domain, Universe } from '../core/types.ts';
import { updateInterval } from '../core/tiers.ts';
import { recordRuins } from '../gameplay/discoveries.ts';
const DOMAINS: Domain[] = ['biology', 'physics', 'energy', 'computing', 'materials', 'space', 'social', 'gravity', 'quantum'];
const TRAITS = ['Curious', 'Cooperative', 'Scientific', 'Industrial', 'Adaptive', 'Expansionist', 'Spiritual', 'Aggressive', 'Isolationist'];
export function civilizationEvent(state: Universe, civ: Civilization, type: string, title: string, detail: string, severity: 'info' | 'wonder' | 'danger' = 'info'): void {
  logEvent(state, type, civ.planetId, title, detail, severity);
  civ.timeline.push({ ...state.events[state.events.length - 1] });
  if (civ.timeline.length > BALANCE.civilization.maxHistory) civ.timeline.splice(1, 1);
}
export function foundCivilization(state: Universe, planetId: string): Civilization {
  const id = `civ-${planetId}`, seed = entitySeed(state.seed, id), rng = random(seed);
  const traits = [...TRAITS].sort((a, b) => entitySeed(seed, a) - entitySeed(seed, b)).slice(0, 3);
  const domains = Object.fromEntries(DOMAINS.map(domain => [domain, 0.6 + rng() * 1.2])) as Record<Domain, number>;
  const civ: Civilization = {
    id, seed, planetId, name: `${nameFor(seed)} ${traits.includes('Cooperative') ? 'Collective' : traits.includes('Spiritual') ? 'Kinship' : 'Commonwealth'}`,
    foundedAt: state.time, population: BALANCE.civilization.basePopulation, status: 'active', traits,
    culture: traits.includes('Scientific') ? 'Scientific' : traits.includes('Spiritual') ? 'Philosophical' : 'Exploratory',
    government: traits.includes('Cooperative') ? 'Council' : traits.includes('Aggressive') ? 'Dominion' : 'Federation',
    stability: 0.7, science: traits.includes('Scientific') ? 0.9 : 0.6, energy: 0.6, economy: 0.5, infrastructure: 0.3,
    military: traits.includes('Aggressive') ? 0.8 : 0.3, knowledge: 0, level: 0, distress: 0, domains,
    technologies: [], researching: null, researchPoints: 0, timeline: [], followed: false, colonies: [planetId], supportUntil: 0, lastUpdate: state.time,
    archetype: traits.includes('Aggressive') ? 'conquerors' : traits.includes('Industrial') ? 'builders' : traits.includes('Cooperative') ? 'stewards' : 'seekers', industry: 0
  };
  state.civilizations[id] = civ;
  domains[civ.archetype === 'builders' ? 'energy' : civ.archetype === 'stewards' ? 'biology' : civ.archetype === 'conquerors' ? 'materials' : 'space'] *= 1.4;
  civilizationEvent(state, civ, 'CivilizationFounded', `${civ.name} has emerged`, `The first settlements on ${state.objects[planetId].name}. Their story is their own.`, 'wonder');
  return civ;
}
// Player unlocks retain discoveries recorded by fallen civilizations until rebirth.
// Civilization actions still check that civilization's own status and technology.
export function hasTechnology(state: Universe, id: string): boolean { return Object.values(state.civilizations).some(civ => civ.technologies.includes(id)); }
export function civilizationAt(state: Universe, worldId: string, activeOnly = false): Civilization | undefined {
  let archived: Civilization | undefined;
  for (const civ of Object.values(state.civilizations)) if (civ.planetId === worldId || civ.colonies.includes(worldId)) {
    if (civ.status === 'active') return civ;
    if (!activeOnly) archived ??= civ;
  }
  return archived;
}
export function collapse(state: Universe, civ: Civilization, reason: string): void {
  if (civ.status === 'extinct') return;
  civ.status = 'extinct'; civ.population = 0; civ.researching = null;
  civ.lastUpdate = state.time;
  civilizationEvent(state, civ, 'CivilizationCollapse', `${civ.name} fell silent`, `${reason} Their ruins and recorded history remain.`, 'danger');
  recordRuins(state, civ);
}
export interface CivilizationEnvironment { capacity: number; habitability: number; food: number; solar: number; gravity: number; worlds: number; habitats: number }
function environmentFor(state: Universe, civ: Civilization, habitats: number): CivilizationEnvironment {
  const worlds = new Set([civ.planetId, ...civ.colonies]);
  const home = state.objects[civ.planetId], homePlanet = home.planet!;
  const result: CivilizationEnvironment = { capacity: 0, habitability: 0, food: 0, solar: 0, gravity: 0, worlds: worlds.size, habitats };
  for (const id of worlds) {
    const world = state.objects[id];
    const p = world.planet!, food = Math.max(0.05, p.biodiversity + p.water * 0.5);
    const capacity = BALANCE.civilization.capacity * p.habitability * (0.2 + civ.infrastructure) * food;
    result.capacity += capacity; result.habitability += p.habitability * capacity; result.food += food * capacity;
    result.solar += world.upgrades.solar * capacity; result.gravity += p.gravity * capacity;
  }
  const habitatCapacity = result.habitats * BALANCE.civilization.habitatCapacity;
  result.capacity += habitatCapacity; result.habitability += BALANCE.civilization.habitatHabitability * habitatCapacity;
  result.food += BALANCE.civilization.habitatFood * habitatCapacity; result.gravity += habitatCapacity;
  if (result.capacity > 0) for (const key of ['habitability', 'food', 'solar', 'gravity'] as const) result[key] /= result.capacity;
  else { result.habitability = homePlanet.habitability; result.food = Math.max(0.05, homePlanet.biodiversity + homePlanet.water * 0.5); result.solar = home.upgrades.solar; result.gravity = homePlanet.gravity; }
  return result;
}
export function civilizationEnvironment(state: Universe, civ: Civilization): CivilizationEnvironment {
  const habitats = Object.values(state.megastructures).filter(s => s.civilizationId === civ.id && s.type === 'habitat' && s.status === 'complete').length;
  return environmentFor(state, civ, habitats);
}
function researchInEnvironment(state: Universe, civ: Civilization, environment: CivilizationEnvironment): number {
  if (civ.status !== 'active' || !civ.researching) return 0;
  const tech = TECHNOLOGIES[civ.researching];
  return BALANCE.civilization.research * civ.science * civ.energy * (0.5 + civ.infrastructure) * civ.domains[tech.domain] * Math.max(1, Math.log10(civ.population) / 3) * (civ.supportUntil > state.time ? 1.5 : 1) * (1 + state.meta.laws.research * META_BALANCE.researchPerLevel) / (1 + Math.abs(environment.gravity - 1) * 0.3);
}
export function researchRate(state: Universe, civ: Civilization): number {
  return civ.status !== 'active' || !civ.researching ? 0 : researchInEnvironment(state, civ, civilizationEnvironment(state, civ));
}
export function simulateCivilizations(state: Universe): void {
  const occupied = new Set(Object.values(state.civilizations).filter(c => c.status === 'active').flatMap(c => c.colonies));
  for (const object of Object.values(state.objects)) if (object.life?.stage === 'intelligent' && !state.civilizations[`civ-${object.id}`] && !occupied.has(object.id)) foundCivilization(state, object.id);
  const habitatCounts = new Map<string, number>();
  for (const structure of Object.values(state.megastructures)) if (structure.type === 'habitat' && structure.status === 'complete') habitatCounts.set(structure.civilizationId, (habitatCounts.get(structure.civilizationId) ?? 0) + 1);
  for (const civ of Object.values(state.civilizations)) {
    if (civ.status !== 'active') continue;
    const seconds = state.time - civ.lastUpdate;
    if (seconds + 1e-7 < updateInterval(state, state.objects[civ.planetId])) continue;
    civ.lastUpdate = state.time;
    civ.industry += seconds * civ.economy * (1 + civ.level) * (civ.archetype === 'builders' ? 1.3 : 1);
    const habitats = habitatCounts.get(civ.id) ?? 0, environment = environmentFor(state, civ, habitats), carrying = environment.capacity, food = environment.food;
    const growth = BALANCE.civilization.growth * environment.habitability * food * civ.stability * (0.5 + civ.energy);
    const retention = Math.exp(-growth * seconds), population = Math.max(1, civ.population);
    civ.population = carrying > 1 ? population / (retention + (population / carrying) * -Math.expm1(-growth * seconds)) : civ.population * Math.exp(-0.02 * seconds);
    const targetStability = Math.min(1, 0.2 + environment.habitability * 0.55 + food * 0.2);
    civ.stability += (targetStability - civ.stability) * (1 - Math.exp(-seconds / 300));
    civ.energy = Math.min(1, 0.5 + environment.solar * 0.04 + civ.level * 0.035);
    civ.infrastructure = Math.min(1, 0.3 + civ.technologies.length * 0.04);
    civ.economy = Math.min(1, civ.infrastructure * civ.stability + civ.level * 0.03);
    civ.distress = environment.habitability < 0.15 || civ.stability < 0.2 ? civ.distress + seconds : Math.max(0, civ.distress - seconds);
    if (civ.distress >= BALANCE.civilization.collapseDelay || civ.population < 5) { collapse(state, civ, 'Their environment could no longer sustain them.'); continue; }
    if (!civ.researching) {
      const options = Object.keys(TECHNOLOGIES).filter(id => !civ.technologies.includes(id) && TECHNOLOGIES[id].requires.every(required => civ.technologies.includes(required)));
      options.sort((a, b) => (civ.domains[TECHNOLOGIES[b].domain] / TECHNOLOGIES[b].cost) - (civ.domains[TECHNOLOGIES[a].domain] / TECHNOLOGIES[a].cost));
      civ.researching = options[0] ?? null;
    }
    if (civ.researching) {
      const id = civ.researching, tech = TECHNOLOGIES[id];
      const scaledResearch = seconds * researchInEnvironment(state, civ, environmentFor(state, civ, habitats));
      civ.researchPoints += scaledResearch; civ.knowledge += scaledResearch;
      if (civ.researchPoints >= tech.cost) {
        civ.researchPoints -= tech.cost; civ.technologies.push(id); civ.researching = null; civ.level = Math.max(civ.level, tech.level);
        civilizationEvent(state, civ, 'TechnologyDiscovered', `${civ.name}: ${tech.name}`, tech.description, 'wonder');
      }
    }
  }
}
