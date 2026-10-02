import { ADVANCED_BALANCE } from '../core/config.ts';
import { random, entitySeed } from '../core/random.ts';
import { civilizationEvent, collapse } from './civilizations.ts';
import { STRUCTURES, buildStructure } from '../gameplay/megastructures.ts';
import type { StructureType, Universe } from '../core/types.ts';
import { spend } from './economy.ts';
export function mediate(state: Universe, relationId: string): { ok: boolean; message: string } {
  const relation = state.relations[relationId];
  if (!relation || !spend(state, { knowledge: 100, energy: 1000 })) return { ok: false, message: 'Mediation needs 100 knowledge and 1,000 energy.' };
  relation.score = Math.min(100, relation.score + 30);
  return { ok: true, message: 'Shared knowledge has opened a path toward peace.' };
}
export function completeStructures(state: Universe): void {
  for (const structure of Object.values(state.megastructures)) if (structure.status === 'building' && state.time >= structure.endsAt) {
    structure.status = 'complete'; const civ = state.civilizations[structure.civilizationId];
    civilizationEvent(state, civ, 'MegastructureBuilt', `${civ.name}: ${STRUCTURES[structure.type].name} complete`, STRUCTURES[structure.type].description, 'wonder');
  }
}
export function simulateAdvanced(state: Universe): void {
  if (Math.round(state.time) % ADVANCED_BALANCE.diplomacyInterval !== 0) return;
  const civilizations = Object.values(state.civilizations).filter(c => c.status === 'active' && c.technologies.includes('spaceflight'));
  let relationCount = Object.keys(state.relations).length;
  for (const civ of civilizations) for (const type of Object.keys(STRUCTURES) as StructureType[]) {
    if (civ.industry >= STRUCTURES[type].industry && civ.technologies.includes(STRUCTURES[type].requires) && !state.megastructures[`${civ.id}:${type}`]) { buildStructure(state, civ.id, type, false); break; }
  }
  for (let i = 0; i < civilizations.length; i++) for (let j = i + 1; j < civilizations.length; j++) {
    const a = civilizations[i], b = civilizations[j];
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
    relation.score = Math.max(-100, Math.min(100, relation.score + tendency + (rng() - 0.5) * 4)); relation.lastUpdate = state.time;
    const status = relation.score >= ADVANCED_BALANCE.allianceAt ? 'alliance' : relation.score >= ADVANCED_BALANCE.tradeAt ? 'trade' : relation.score <= ADVANCED_BALANCE.warAt ? 'war' : 'neutral';
    if (status !== relation.status) {
      relation.status = status;
      for (const civ of [a, b]) civilizationEvent(state, civ, 'DiplomacyChanged', `${a.name} & ${b.name}: ${status}`, status === 'war' ? 'Rivalry is costing lives and stability.' : 'Independent societies are shaping their own relationship.', status === 'war' ? 'danger' : 'wonder');
    }
    if (status === 'war') for (const civ of [a, b]) { civ.population *= 1 - ADVANCED_BALANCE.warLoss; civ.stability = Math.max(0, civ.stability - 0.015); if (civ.population < 5) collapse(state, civ, 'Conflict exhausted their population.'); }
    if (status === 'trade' || status === 'alliance') for (const civ of [a, b]) civ.industry += 100;
  }
}
