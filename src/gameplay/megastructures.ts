import { ADVANCED_BALANCE } from '../core/config.ts';
import type { ActionResult, Cost, Megastructure, StructureType, Universe } from '../core/types.ts';
import { canAfford, spend } from '../simulation/economy.ts';
import { civilizationEvent } from '../simulation/civilizations.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
export const STRUCTURES: Record<StructureType, { name: string; requires: string; cost: Cost; industry: number; duration: number; description: string }> = {
  habitat: { name: 'Orbital habitat', requires: 'spaceflight', cost: { minerals: 1500, matter: 600 }, industry: 4000, duration: 300, description: 'Room for a civilization to grow beyond its planet.' },
  dyson: { name: 'Dyson swarm', requires: 'dyson', cost: { minerals: 10000, matter: 4000, knowledge: 500 }, industry: 16000, duration: 900, description: 'A constellation of collectors harvesting stellar energy.' },
  wormhole: { name: 'Wormhole gateway', requires: 'wormholes', cost: { stellar: 3000, exotic: 200, knowledge: 700 }, industry: 20000, duration: 1200, description: 'A bridge between distant worlds. Generates quantum energy.' },
  'black-hole-generator': { name: 'Accretion collector', requires: 'spacetime', cost: { minerals: 12000, exotic: 500 }, industry: 20000, duration: 1200, description: 'Energy and exotic matter from a black hole.' }
};
export function structureAt(state: Universe, civId: string, type: StructureType, systemId: string): Megastructure | undefined {
  return Object.values(state.megastructures).find(s => s.civilizationId === civId && s.type === type && s.systemId === systemId);
}
function structureId(state: Universe, civId: string, type: StructureType, systemId: string): string {
  const legacy = `${civId}:${type}`;
  return state.objects[state.civilizations[civId].planetId].systemId === systemId && !Object.hasOwn(state.megastructures, legacy) ? legacy : `${legacy}:${systemId}`;
}
export function structureReadiness(state: Universe, civId: string, type: StructureType, player = true, worldId?: string): ActionResult {
  if (!Object.hasOwn(state.civilizations, civId) || !Object.hasOwn(STRUCTURES, type)) return { ok: false, message: 'Choose a valid civilization and structure.' };
  const civ = state.civilizations[civId], spec = STRUCTURES[type];
  if (civ.status !== 'active') return { ok: false, message: 'A living civilization must support construction.' };
  if (!civ.technologies.includes(spec.requires)) return { ok: false, message: `This civilization needs ${TECHNOLOGIES[spec.requires].name} research.` };
  const targetId = worldId ?? civ.planetId;
  if (!Object.hasOwn(state.objects, targetId) || !state.objects[targetId].planet || targetId !== civ.planetId && !civ.colonies.includes(targetId)) return { ok: false, message: 'Choose this civilization’s home world or a settled colony.' };
  const systemId = state.objects[targetId].systemId;
  if (systemId !== state.objects[civ.planetId].systemId && !civ.technologies.includes('interstellar')) return { ok: false, message: 'This civilization needs Interstellar travel to build in a distant colony system.' };
  if (structureAt(state, civId, type, systemId)) return { ok: false, message: 'This civilization already has this structure underway or complete in this system.' };
  if (Object.keys(state.megastructures).length >= ADVANCED_BALANCE.maxStructures) return { ok: false, message: 'The universe’s construction limit is reached.' };
  if (Object.hasOwn(state.megastructures, structureId(state, civId, type, systemId))) return { ok: false, message: 'This construction address is already occupied.' };
  if (type === 'black-hole-generator' && state.objects[state.systems[systemId].starId].type !== 'black-hole') return { ok: false, message: 'An accretion collector needs a black hole in this system.' };
  if (type === 'dyson' && state.objects[state.systems[systemId].starId].type === 'black-hole') return { ok: false, message: 'A Dyson swarm needs a luminous star.' };
  if (player ? !canAfford(state, spec.cost) : civ.industry < spec.industry) return { ok: false, message: player ? 'Construction needs more resources.' : 'This civilization is gathering industry for construction.' };
  return { ok: true, message: `Ready to build in ${state.systems[systemId].name}.` };
}
export function buildStructure(state: Universe, civId: string, type: StructureType, player = true, worldId?: string): ActionResult {
  const readiness = structureReadiness(state, civId, type, player, worldId);
  if (!readiness.ok) return readiness;
  const civ = state.civilizations[civId], spec = STRUCTURES[type], systemId = state.objects[worldId ?? civ.planetId].systemId;
  const id = structureId(state, civId, type, systemId);
  if (player) spend(state, spec.cost);
  if (!player) civ.industry -= spec.industry;
  state.megastructures[id] = { id, type, civilizationId: civId, systemId, startedAt: state.time, endsAt: state.time + spec.duration, status: 'building' };
  civilizationEvent(state, civ, 'ConstructionStarted', `${civ.name}: ${spec.name} underway`, `${state.systems[systemId].name}: ${spec.description}`, 'wonder');
  return { ok: true, message: 'Construction has begun. It continues while you are away.' };
}
