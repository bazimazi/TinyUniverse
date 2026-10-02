import { entitySeed, nameFor, random } from './random.ts';
import type { Galaxy } from './types.ts';
export function initialGalaxy(seed: number, id: string, time = 0): Galaxy {
  const galaxySeed = entitySeed(seed, id), rng = random(galaxySeed);
  return { id, seed: galaxySeed, name: `${nameFor(galaxySeed)} Reach`, totalSystems: 3000 + Math.floor(rng() * 9000), surveyed: 0, backgroundCivilizations: 0, backgroundPopulation: 0, lastUpdate: time };
}
