import { BALANCE } from './config.ts';
import type { Ecosystem } from './types.ts';
export function initialLife(primitive = false): Ecosystem {
  return { stage: primitive ? 'simple' : 'chemistry', progress: primitive ? BALANCE.life.simpleAt : 0, species: primitive ? 1 : 0,
    populations: { microorganisms: primitive ? 0.2 : 0, plants: 0, herbivores: 0, predators: 0, aquatic: 0, flying: 0 } };
}
