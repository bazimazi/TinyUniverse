import { ADVANCED_BALANCE } from '../core/config.ts';
import type { ActionResult, Cost, StructureType, Universe } from '../core/types.ts';
import { spend } from '../simulation/economy.ts';
import { civilizationEvent } from '../simulation/civilizations.ts';
export const STRUCTURES: Record<StructureType, { name: string; requires: string; cost: Cost; industry: number; duration: number; description: string }> = {
  habitat: { name: 'Orbital habitat', requires: 'spaceflight', cost: { minerals: 1500, matter: 600 }, industry: 4000, duration: 300, description: 'Room for a civilization to grow beyond its planet.' },
  dyson: { name: 'Dyson swarm', requires: 'dyson', cost: { minerals: 10000, matter: 4000, knowledge: 500 }, industry: 16000, duration: 900, description: 'A constellation of collectors harvesting stellar energy.' },
  wormhole: { name: 'Wormhole gateway', requires: 'wormholes', cost: { stellar: 3000, exotic: 200, knowledge: 700 }, industry: 20000, duration: 1200, description: 'A bridge between distant worlds. Generates quantum energy.' },
  'black-hole-generator': { name: 'Accretion collector', requires: 'spacetime', cost: { minerals: 12000, exotic: 500 }, industry: 20000, duration: 1200, description: 'Energy and exotic matter from a black hole.' }
};
export function buildStructure(state: Universe, civId: string, type: StructureType, player = true): ActionResult {
  const civ = state.civilizations[civId], spec = STRUCTURES[type];
  if (!civ || civ.status !== 'active' || !spec || !civ.technologies.includes(spec.requires)) return { ok: false, message: 'This civilization has not discovered the required technology.' };
  const id = `${civId}:${type}`, systemId = state.objects[civ.planetId].systemId;
  if (state.megastructures[id] || Object.keys(state.megastructures).length >= ADVANCED_BALANCE.maxStructures) return { ok: false, message: 'This structure is already underway or the construction limit is reached.' };
  if (type === 'black-hole-generator' && state.objects[state.systems[systemId].starId].type !== 'black-hole') return { ok: false, message: 'An accretion collector needs a black hole in this system.' };
  if (type === 'dyson' && state.objects[state.systems[systemId].starId].type === 'black-hole') return { ok: false, message: 'A Dyson swarm needs a luminous star.' };
  if (player ? !spend(state, spec.cost) : civ.industry < spec.industry) return { ok: false, message: 'Construction needs more resources.' };
  if (!player) civ.industry -= spec.industry;
  state.megastructures[id] = { id, type, civilizationId: civId, systemId, startedAt: state.time, endsAt: state.time + spec.duration, status: 'building' };
  civilizationEvent(state, civ, 'ConstructionStarted', `${civ.name}: ${spec.name} underway`, spec.description, 'wonder');
  return { ok: true, message: 'Construction has begun. It continues while you are away.' };
}
