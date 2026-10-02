import { BALANCE, GALAXY_BALANCE, STELLAR_BALANCE } from '../core/config.ts';
import { logEvent, makeObject } from '../core/universe.ts';
import { random, entitySeed } from '../core/random.ts';
import { spend } from '../simulation/economy.ts';
import type { ActionResult, ExploreKind, Universe } from '../core/types.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import { generateSystem } from './systems.ts';
import { discoverGalaxy } from './galaxies.ts';
export function startExploration(state: Universe, kind: ExploreKind = 'orbital'): ActionResult {
  if (state.totalUpgrades < BALANCE.exploration.unlockUpgrades) return { ok: false, message: 'Build two planet upgrades to unlock orbital exploration.' };
  if (state.exploration.job) return { ok: false, message: 'An expedition is already underway.' };
  if (kind === 'interstellar' && !hasTechnology(state, 'spaceflight')) return { ok: false, message: 'A civilization must discover spaceflight to reach another star.' };
  if (kind === 'galactic' && !hasTechnology(state, 'interstellar')) return { ok: false, message: 'Interstellar travel opens galactic exploration.' };
  if (kind === 'galactic' && Object.keys(state.galaxies).length >= GALAXY_BALANCE.maxGalaxies) return { ok: false, message: 'This universe is fully charted. A rebirth will reveal new reaches.' };
  if (kind === 'orbital' && Object.keys(state.objects).length >= BALANCE.maxObjects) return { ok: false, message: 'This region is fully surveyed.' };
  const target = state.objects[state.selectedId];
  const home = target.type === 'planet' ? target : Object.values(state.objects).find(o => o.systemId === target.systemId && o.planet) ?? state.objects['planet-0'];
  if (!spend(state, kind === 'orbital' ? BALANCE.exploration.cost : kind === 'interstellar' ? STELLAR_BALANCE.interstellarCost : GALAXY_BALANCE.cost)) return { ok: false, message: 'Gather resources for an expedition.' };
  state.exploration.job = { kind, targetId: home.id, startedAt: state.time, endsAt: state.time + (kind === 'orbital' ? BALANCE.exploration.duration : kind === 'interstellar' ? STELLAR_BALANCE.interstellarDuration : GALAXY_BALANCE.duration), index: state.exploration.completed[kind] };
  return { ok: true, message: 'Your first little probe is on its way.' };
}
export function completeExploration(state: Universe): void {
  const job = state.exploration.job;
  if (!job || job.endsAt > state.time + 1e-7) return;
  if (job.kind === 'galactic') { discoverGalaxy(state, job.index + 1); state.exploration.completed.galactic++; state.exploration.job = null; return; }
  if (job.kind === 'interstellar') {
    const galaxyId = state.systems[state.objects[job.targetId].systemId].galaxyId;
    if (Object.keys(state.systems).length < GALAXY_BALANCE.maxDetailedSystems && Object.keys(state.objects).length < BALANCE.maxObjects - 4) generateSystem(state, job.index, galaxyId);
    else { state.galaxies[galaxyId].surveyed = Math.min(state.galaxies[galaxyId].totalSystems, state.galaxies[galaxyId].surveyed + 1); state.resources.knowledge += 75; logEvent(state, 'SectorSurveyed', job.targetId, 'A distant sector catalogued', 'The detailed simulation remains bounded. Survey data adds 75 knowledge.'); }
    state.exploration.completed.interstellar++; state.exploration.job = null; return;
  }
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
