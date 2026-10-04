import { ADVANCED_BALANCE } from '../core/config.ts';
import { random, entitySeed } from '../core/random.ts';
import { civilizationEvent, collapse } from './civilizations.ts';
import { STRUCTURES, buildStructure } from '../gameplay/megastructures.ts';
import type { ActionResult, Relation, StructureType, Universe } from '../core/types.ts';
import { canAfford, spend } from './economy.ts';
export const MEDIATION_COST = { knowledge: 100, energy: 1000 };
export function mediationReadiness(state: Universe, relationId: string): ActionResult {
  if (!Object.hasOwn(state.relations, relationId)) return { ok: false, message: 'Choose a recorded relationship.' };
  const relation = state.relations[relationId];
  if ([relation.a, relation.b].some(id => state.civilizations[id].status !== 'active')) return { ok: false, message: 'Archived relationship · a civilization has fallen silent.' };
  if (relation.score >= 100) return { ok: false, message: 'Trust is already at its highest.' };
  if (!canAfford(state, MEDIATION_COST)) return { ok: false, message: 'Mediation needs 100 knowledge and 1,000 energy.' };
  return { ok: true, message: 'Share knowledge to improve trust by up to 30.' };
}
function updateRelationship(state: Universe, relation: Relation, mediated = false): void {
  const status = relation.score >= ADVANCED_BALANCE.allianceAt ? 'alliance' : relation.score >= ADVANCED_BALANCE.tradeAt ? 'trade' : relation.score <= ADVANCED_BALANCE.warAt ? 'war' : 'neutral';
  relation.lastUpdate = state.time;
  if (status === relation.status && !mediated) return;
  relation.status = status;
  const a = state.civilizations[relation.a], b = state.civilizations[relation.b];
  for (const civ of [a, b]) civilizationEvent(state, civ, mediated ? 'DiplomacyMediated' : 'DiplomacyChanged', `${a.name} & ${b.name}: ${status}`, mediated ? 'Shared knowledge improved trust. Their next decisions remain their own.' : status === 'war' ? 'Rivalry is costing lives and stability.' : 'Independent societies are shaping their own relationship.', status === 'war' ? 'danger' : 'wonder');
}
export function mediate(state: Universe, relationId: string): ActionResult {
  const readiness = mediationReadiness(state, relationId);
  if (!readiness.ok) return readiness;
  const relation = state.relations[relationId];
  spend(state, MEDIATION_COST);
  relation.score = Math.min(100, relation.score + 30);
  updateRelationship(state, relation, true);
  return { ok: true, message: 'Shared knowledge has opened a path toward peace.' };
}
export function completeStructures(state: Universe): void {
  for (const structure of Object.values(state.megastructures)) if (structure.status === 'building' && state.time >= structure.endsAt) {
    structure.status = 'complete'; const civ = state.civilizations[structure.civilizationId];
    civilizationEvent(state, civ, 'MegastructureBuilt', `${civ.name}: ${STRUCTURES[structure.type].name} complete`, `${state.systems[structure.systemId].name}: ${STRUCTURES[structure.type].description}`, 'wonder');
  }
}
export function simulateAdvanced(state: Universe): void {
  if (Math.round(state.time) % ADVANCED_BALANCE.diplomacyInterval !== 0) return;
  const civilizations = Object.values(state.civilizations).filter(c => c.status === 'active' && c.technologies.includes('spaceflight'));
  let relationCount = Object.keys(state.relations).length;
  for (const civ of civilizations) {
    const sites = new Map<string, string>();
    for (const id of new Set([civ.planetId, ...civ.colonies])) if (!sites.has(state.objects[id].systemId)) sites.set(state.objects[id].systemId, id);
    construction: for (const worldId of sites.values()) for (const type of Object.keys(STRUCTURES) as StructureType[]) {
      if (civ.industry >= STRUCTURES[type].industry && civ.technologies.includes(STRUCTURES[type].requires) && buildStructure(state, civ.id, type, false, worldId).ok) break construction;
    }
  }
  for (let i = 0; i < civilizations.length; i++) for (let j = i + 1; j < civilizations.length; j++) {
    const a = civilizations[i], b = civilizations[j];
    if (a.status !== 'active' || b.status !== 'active') continue;
    if (state.objects[a.planetId].systemId !== state.objects[b.planetId].systemId && !(a.technologies.includes('interstellar') && b.technologies.includes('interstellar'))) continue;
    const id = [a.id, b.id].sort().join('|');
    if (!state.relations[id]) {
      if (relationCount >= ADVANCED_BALANCE.maxRelations) continue;
      relationCount++;
      const cooperative = a.traits.includes('Cooperative') || b.traits.includes('Cooperative');
      const aggressive = a.archetype === 'conquerors' || b.archetype === 'conquerors';
      state.relations[id] = { id, a: a.id, b: b.id, score: (cooperative ? 20 : 0) - (aggressive ? 25 : 0), status: 'neutral', lastUpdate: state.time };
      civilizationEvent(state, a, 'FirstContact', `${a.name} encountered ${b.name}`, 'Their histories now intersect.', 'wonder');
      civilizationEvent(state, b, 'FirstContact', `${b.name} encountered ${a.name}`, 'A voice from beyond their world.', 'wonder');
    }
    const relation = state.relations[id], rng = random(entitySeed(state.seed, `${id}:${state.time}`));
    const tendency = (a.archetype === 'conquerors' || b.archetype === 'conquerors') ? -5 : 4;
    relation.score = Math.max(-100, Math.min(100, relation.score + tendency + (rng() - 0.5) * 4));
    updateRelationship(state, relation);
    const status = relation.status;
    if (status === 'war') for (const civ of [a, b]) { civ.population *= 1 - ADVANCED_BALANCE.warLoss; civ.stability = Math.max(0, civ.stability - 0.015); if (civ.population < 5) collapse(state, civ, 'Conflict exhausted their population.'); }
    if (status === 'trade' || status === 'alliance') for (const civ of [a, b]) civ.industry += 100;
  }
}
