import type { Universe } from '../core/types.ts';
import { initialLife } from '../core/ecosystem.ts';
import { initialStar } from '../core/stellar.ts';
import { entitySeed } from '../core/random.ts';
import { initialGalaxy } from '../gameplay/galaxies.ts';
export function migrate(state: Universe): void {
  if (state.version < 2) {
    state.exploration = { job: null, completed: { orbital: 0, interstellar: 0, galactic: 0 } };
    for (const object of Object.values(state.objects)) { object.mined = false; object.deposit = 0; }
  }
  if (state.version < 3) for (const object of Object.values(state.objects)) object.life = object.planet ? initialLife(object.id === 'planet-0') : null;
  if (state.version < 4) { state.civilizations = {}; state.resources.knowledge = 0; }
  if (state.version < 5) {
    state.cooldowns = {}; state.speed = 1;
    for (const object of Object.values(state.objects)) object.shieldUntil = 0;
    for (const civ of Object.values(state.civilizations)) civ.supportUntil = 0;
  }
  if (state.version < 6) {
    state.exploration.completed.interstellar = 0;
    state.systems = { 'system-0': { id: 'system-0', seed: entitySeed(state.seed, 'system-0'), name: 'Solace', starId: 'star-0', position: { x: 0, y: 0 }, galaxyId: 'galaxy-0' } };
    for (const object of Object.values(state.objects)) { object.systemId = 'system-0'; object.stellar = object.type === 'star' ? initialStar() : null; }
  }
  if (state.version < 7) {
    state.galaxies = { 'galaxy-0': initialGalaxy(state.seed, 'galaxy-0', state.time) }; state.exploration.completed.galactic = 0;
    for (const object of Object.values(state.objects)) object.lastLifeUpdate = state.time;
    for (const civ of Object.values(state.civilizations)) civ.lastUpdate = state.time;
  }
  if (state.version < 8) {
    state.relations = {}; state.megastructures = {}; state.resources.exotic = 0; state.resources.stellar = 0; state.resources.quantum = 0;
    for (const civ of Object.values(state.civilizations)) { civ.archetype = 'seekers'; civ.industry = 0; }
  }
}
