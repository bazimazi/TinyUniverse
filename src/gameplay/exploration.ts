import { BALANCE } from '../core/config.ts';
import { logEvent, makeObject } from '../core/universe.ts';
import { random, entitySeed } from '../core/random.ts';
import { spend } from '../simulation/economy.ts';
import type { ActionResult, Universe } from '../core/types.ts';
export function startExploration(state: Universe): ActionResult {
  if (state.totalUpgrades < BALANCE.exploration.unlockUpgrades) return { ok: false, message: 'Build two planet upgrades to unlock orbital exploration.' };
  if (state.exploration.job) return { ok: false, message: 'An expedition is already underway.' };
  if (Object.keys(state.objects).length >= BALANCE.maxObjects) return { ok: false, message: 'This region is fully surveyed.' };
  const target = state.objects[state.selectedId];
  const home = target.type === 'planet' ? target : state.objects['planet-0'];
  if (!spend(state, BALANCE.exploration.cost)) return { ok: false, message: 'Gather more energy and minerals for an expedition.' };
  state.exploration.job = { kind: 'orbital', targetId: home.id, startedAt: state.time, endsAt: state.time + BALANCE.exploration.duration, index: state.exploration.completed.orbital };
  return { ok: true, message: 'Your first little probe is on its way.' };
}
export function completeExploration(state: Universe): void {
  const job = state.exploration.job;
  if (!job || job.endsAt > state.time + 1e-7) return;
  const type = (['moon', 'planet', 'asteroid'] as const)[job.index % 3];
  const home = state.objects[job.targetId];
  const parent = type === 'moon' ? home : state.objects[home.parentId!];
  const id = `${parent.id}-${type}-${job.index}`;
  const object = makeObject(state.seed, id, type, parent.id);
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
