import { BALANCE, GALAXY_BALANCE, STELLAR_BALANCE } from '../core/config.ts';
import { logEvent, makeObject } from '../core/universe.ts';
import { random, entitySeed } from '../core/random.ts';
import { spend } from '../simulation/economy.ts';
import type { ActionResult, Cost, ExploreKind, Universe } from '../core/types.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import { canDetailSystem, generateSystem, nextSystemIndex } from './systems.ts';
import { discoverGalaxy } from './galaxies.ts';
import { findAnomaly } from './discoveries.ts';
export function explorationAvailability(state: Universe, kind: ExploreKind): ActionResult {
  if (!['orbital', 'interstellar', 'galactic'].includes(kind)) return { ok: false, message: 'Choose an orbital, interstellar or galactic expedition.' };
  if (state.totalUpgrades < BALANCE.exploration.unlockUpgrades) return { ok: false, message: 'Build two planet upgrades to unlock orbital exploration.' };
  if (state.exploration.job) return { ok: false, message: 'An expedition is already underway.' };
  if (kind === 'interstellar' && !hasTechnology(state, 'spaceflight')) return { ok: false, message: 'A civilization must discover spaceflight to reach another star.' };
  if (kind === 'galactic' && !hasTechnology(state, 'interstellar')) return { ok: false, message: 'Interstellar travel opens galactic exploration.' };
  if (kind === 'galactic' && Object.keys(state.galaxies).length >= GALAXY_BALANCE.maxGalaxies) return { ok: false, message: 'This universe is fully charted. A rebirth will reveal new reaches.' };
  if (kind === 'orbital' && Object.keys(state.objects).length >= BALANCE.maxObjects) return { ok: false, message: 'This region is fully surveyed.' };
  const target = state.objects[state.selectedId];
  const home = target.type === 'planet' ? target : Object.values(state.objects).find(o => o.systemId === target.systemId && o.planet) ?? state.objects['planet-0'];
  const galaxy = state.galaxies[state.systems[home.systemId].galaxyId];
  if (kind === 'interstellar' && galaxy.surveyed >= galaxy.totalSystems) return { ok: false, message: 'This galaxy is fully surveyed. Explore another reach.' };
  return { ok: true, message: 'An expedition can reach this destination.' };
}
export function startExploration(state: Universe, kind: ExploreKind = 'orbital'): ActionResult {
  const availability = explorationAvailability(state, kind);
  if (!availability.ok) return availability;
  const target = state.objects[state.selectedId];
  const home = target.type === 'planet' ? target : Object.values(state.objects).find(o => o.systemId === target.systemId && o.planet) ?? state.objects['planet-0'];
  if (!spend(state, kind === 'orbital' ? BALANCE.exploration.cost : kind === 'interstellar' ? STELLAR_BALANCE.interstellarCost : GALAXY_BALANCE.cost)) return { ok: false, message: 'Gather resources for an expedition.' };
  state.exploration.job = { kind, targetId: home.id, startedAt: state.time, endsAt: state.time + (kind === 'orbital' ? BALANCE.exploration.duration : kind === 'interstellar' ? STELLAR_BALANCE.interstellarDuration : GALAXY_BALANCE.duration), index: state.exploration.completed[kind] };
  return { ok: true, message: kind === 'orbital' ? 'Your little probe is on its way.' : kind === 'interstellar' ? 'An expedition is heading for an uncharted star.' : 'An expedition is heading beyond the galaxy.' };
}
function cancelExpedition(state: Universe, cost: Cost, targetId: string): void {
  for (const [resource, amount] of Object.entries(cost)) {
    const id = resource as keyof typeof state.resources;
    state.resources[id] = Math.min(BALANCE.resourceLimit, state.resources[id] + amount);
  }
  state.exploration.job = null;
  logEvent(state, 'ExpeditionReturned', targetId, 'The expedition returned safely', 'Its destination was already fully surveyed. Expedition resources have been returned.');
}
export function completeExploration(state: Universe): void {
  const job = state.exploration.job;
  if (!job || job.endsAt > state.time + 1e-7) return;
  if (job.kind === 'galactic') {
    if (Object.keys(state.galaxies).length >= GALAXY_BALANCE.maxGalaxies) { cancelExpedition(state, GALAXY_BALANCE.cost, job.targetId); return; }
    let index = job.index + 1;
    while (Object.hasOwn(state.galaxies, `galaxy-${index}`)) index++;
    discoverGalaxy(state, index); state.exploration.completed.galactic++; state.exploration.job = null; return;
  }
  if (job.kind === 'interstellar') {
    const galaxyId = state.systems[state.objects[job.targetId].systemId].galaxyId;
    const galaxy = state.galaxies[galaxyId];
    if (galaxy.surveyed >= galaxy.totalSystems) { cancelExpedition(state, STELLAR_BALANCE.interstellarCost, job.targetId); return; }
    if (canDetailSystem(state)) generateSystem(state, nextSystemIndex(state, galaxyId), galaxyId);
    else { galaxy.surveyed++; state.resources.knowledge = Math.min(BALANCE.resourceLimit, state.resources.knowledge + 75); logEvent(state, 'SectorSurveyed', job.targetId, 'A distant sector catalogued', 'New stars mapped by the expedition. Survey data adds 75 knowledge.'); }
    findAnomaly(state, job.targetId, job.index); state.exploration.completed.interstellar++; state.exploration.job = null; return;
  }
  if (Object.keys(state.objects).length >= BALANCE.maxObjects) { cancelExpedition(state, BALANCE.exploration.cost, job.targetId); return; }
  const type = (['moon', 'planet', 'asteroid'] as const)[job.index % 3];
  const home = state.objects[job.targetId];
  const parent = type === 'moon' ? home : state.objects[home.parentId!];
  const id = `${parent.id}-${type}-${job.index}`;
  const object = makeObject(state.seed, id, type, parent.id);
  object.systemId = home.systemId;
  object.lastLifeUpdate = state.time;
  const rng = random(entitySeed(state.seed, id));
  object.createdAt = state.time;
  object.radius = type === 'moon' ? 7 : type === 'asteroid' ? 4 : 15 + rng() * 7;
  object.mass = type === 'moon' ? 0.02 + rng() * 0.05 : type === 'asteroid' ? 0.001 : 0.6 + rng();
  object.color = type === 'moon' ? '#c8cfdf' : type === 'asteroid' ? '#bcb098' : ['#dda383', '#8aaee7', '#b0cf89'][job.index % 3];
  object.orbit = { radius: type === 'moon' ? 33 : 160 + parent.children.length * 35, period: type === 'moon' ? 25 : 140 + parent.children.length * 35, eccentricity: rng() * 0.15, phase: rng() * Math.PI * 2 };
  if (object.planet) {
    object.planet.water = 0.25 + rng() * 0.5;
    object.planet.temperature = 265 + rng() * 50;
    object.planet.habitability = 0.4 + rng() * 0.3;
  }
  if (type === 'moon' && home.planet) home.planet.habitability = Math.min(1, home.planet.habitability + 0.025);
  state.objects[id] = object; parent.children.push(id);
  if (type === 'asteroid') findAnomaly(state, id, job.index);
  state.exploration.completed.orbital++;
  state.exploration.job = null;
  logEvent(state, 'CelestialDiscovered', id, `${object.name}, a new ${type}`, type === 'moon' ? `A companion to ${home.name}. Its tides help steady the climate.` : 'Another small piece of a much larger universe.', 'wonder');
}
export function mineAsteroid(state: Universe, id: string): ActionResult {
  const object = state.objects[id];
  if (object?.type !== 'asteroid' || object.mined) return { ok: false, message: 'Choose an unmined asteroid.' };
  if (!spend(state, { energy: 60, matter: 25 })) return { ok: false, message: 'A mining station needs 60 energy and 25 matter.' };
  object.mined = true; state.resources.minerals += object.deposit;
  logEvent(state, 'AsteroidMined', id, `A mining outpost on ${object.name}`, 'A mineral deposit recovered; the outpost now supplies a steady stream of minerals.');
  return { ok: true, message: 'Mining outpost established.' };
}
