import { BALANCE, SAVE_VERSION } from './config.ts';
import { entitySeed, nameFor, random } from './random.ts';
import type { CelestialObject, Universe } from './types.ts';
import { initialLife } from './ecosystem.ts';
export function makeObject(seed: number, id: string, type: CelestialObject['type'], parentId: string | null): CelestialObject {
  const objectSeed = entitySeed(seed, id);
  const rng = random(objectSeed);
  return {
    id, seed: objectSeed, type, name: nameFor(objectSeed), mass: type === 'star' ? 330000 : 0.8 + rng(),
    radius: type === 'star' ? 35 : 16 + rng() * 8, createdAt: 0, parentId, children: [],
    orbit: parentId ? { radius: 120, period: 100, eccentricity: 0.05, phase: rng() * Math.PI * 2 } : null,
    color: type === 'star' ? '#ffd39b' : '#6cdcc0',
    upgrades: { solar: 0, mining: 0, atmosphere: 0, oceans: 0, biodiversity: 0 },
    planet: type === 'planet' ? { temperature: 288, atmosphere: 0.45, water: 0.45, magneticField: 0.55, habitability: 0.52, biodiversity: 0.05, gravity: 1 } : null,
    favorite: false, mined: false, deposit: type === 'asteroid' ? 100 + rng() * 200 : 0,
    life: type === 'planet' ? initialLife(id === 'planet-0') : null
  };
}
export function createUniverse(seed = 1307, timestamp = Date.now()): Universe {
  const star = makeObject(seed, 'star-0', 'star', null);
  star.name = 'Solace';
  const planet = makeObject(seed, 'planet-0', 'planet', star.id);
  planet.name = 'Aurelia';
  star.children.push(planet.id);
  return {
    version: SAVE_VERSION, seed: seed >>> 0, time: 0, lastTimestamp: timestamp, selectedId: planet.id,
    resources: { energy: 25, matter: 12, minerals: 20, biology: 0, knowledge: 0 },
    objects: { [star.id]: star, [planet.id]: planet }, events: [], totalUpgrades: 0,
    exploration: { job: null, completed: { orbital: 0 } },
    civilizations: {},
    settings: { reducedMotion: false, highContrast: false, largeText: false, sound: false }
  };
}
export function logEvent(state: Universe, type: string, targetId: string, title: string, detail = '', severity: 'info' | 'wonder' | 'danger' = 'info'): void {
  state.events.push({ id: `${type}:${targetId}:${state.time}:${state.events.length}`, type, time: state.time, targetId, title, detail, severity });
  if (state.events.length > BALANCE.maxEvents) state.events.splice(0, state.events.length - BALANCE.maxEvents);
}
export function selectedObject(state: Universe): CelestialObject { return state.objects[state.selectedId] ?? state.objects['planet-0']; }
