import { entitySeed, nameFor, random } from '../core/random.ts';
import { initialStar } from '../core/stellar.ts';
import { makeObject, logEvent } from '../core/universe.ts';
import { BALANCE, GALAXY_BALANCE } from '../core/config.ts';
import type { StarSystem, Universe } from '../core/types.ts';
export function generateSystem(state: Universe, index: number, galaxyId = 'galaxy-0'): StarSystem {
  const id = `${galaxyId}-system-${index}`;
  if (state.systems[id]) return state.systems[id];
  if (!Number.isInteger(index) || index < 0 || !state.galaxies[galaxyId]) throw new Error('Invalid procedural system address.');
  if (Object.keys(state.systems).length >= GALAXY_BALANCE.maxDetailedSystems || Object.keys(state.objects).length > BALANCE.maxObjects - 4) throw new Error('The detailed simulation is full; distant sectors remain aggregate survey data.');
  const seed = entitySeed(state.seed, id), rng = random(seed);
  const star = makeObject(state.seed, `${id}-star`, 'star', null);
  star.systemId = id; star.createdAt = state.time; star.stellar = initialStar(index % 4 === 3 ? 8 + rng() * 3 : 0.4 + rng() * 2);
  star.mass = star.stellar.solarMass * 330000; star.color = star.stellar.class === 'blue' ? '#a8cfff' : star.stellar.class === 'red-dwarf' ? '#ffa88c' : '#ffd39b';
  if (state.meta.activeModifiers.includes('unstable-stars')) star.stellar.lifespan *= 0.5;
  const angle = index * 2.399963, distance = 0.15 + Math.sqrt(index + 1) * 0.12;
  const system: StarSystem = { id, seed, name: star.name, starId: star.id, position: { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }, galaxyId };
  state.systems[id] = system; state.objects[star.id] = star;
  if (state.galaxies?.[galaxyId]) state.galaxies[galaxyId].surveyed++;
  for (let i = 0, count = 1 + Math.floor(rng() * 3); i < count; i++) {
    const type = i === 2 ? 'gas-giant' : 'planet', object = makeObject(state.seed, `${id}-planet-${i}`, type, star.id);
    object.systemId = id; object.createdAt = state.time; object.lastLifeUpdate = state.time; object.name = `${nameFor(object.seed)} ${i + 1}`;
    object.orbit = { radius: 90 + i * 70, period: 75 + i * 80, eccentricity: rng() * 0.12, phase: rng() * Math.PI * 2 };
    if (object.planet) { object.planet.temperature = 260 + rng() * 60; object.planet.water = 0.2 + rng() * 0.65; }
    if (type === 'gas-giant') { object.color = '#cca8df'; object.radius = 32; object.mass = 200; }
    state.objects[object.id] = object; star.children.push(object.id);
  }
  logEvent(state, 'SystemDiscovered', star.id, `The ${system.name} system`, 'A distant light becomes a place with worlds of its own.', 'wonder');
  return system;
}
