import { STELLAR_BALANCE } from './config.ts';
import type { StellarState } from './types.ts';
export function initialStar(solarMass = 1): StellarState {
  return { class: solarMass < 0.7 ? 'red-dwarf' : solarMass > 3 ? 'blue' : 'yellow', stage: 'main-sequence', solarMass,
    luminosity: solarMass ** 3.5, temperature: 5778 * solarMass ** 0.5,
    lifespan: STELLAR_BALANCE.lifetime / solarMass ** 2.5, fuel: 1, spin: 0.3 };
}
