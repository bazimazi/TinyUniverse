import { META_BALANCE } from '../core/config.ts';
import { entitySeed } from '../core/random.ts';
import { createUniverse, logEvent } from '../core/universe.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import type { ActionResult, LawId, Universe } from '../core/types.ts';
export const MODIFIERS: Record<string, { name: string; description: string; runs: number }> = {
  'abundant-minerals': { name: 'Abundant minerals', description: 'Double mineral production.', runs: 1 },
  'fast-evolution': { name: 'Fast evolution', description: 'Life evolves 60% faster.', runs: 1 },
  'high-gravity': { name: 'High gravity', description: 'Start at 1.6g. Civilizations must adapt.', runs: 2 },
  'ancient-universe': { name: 'Ancient universe', description: 'Begin with complex life and a mature environment.', runs: 3 },
  'unstable-stars': { name: 'Unstable stars', description: 'Shorter stellar lifespans reveal remnants sooner.', runs: 4 }
};
export function canRebirth(state: Universe): boolean { return hasTechnology(state, 'dyson') && Object.values(state.megastructures).some(s => s.status === 'complete' && s.type === 'dyson'); }
export function rebirthReward(state: Universe): number {
  return Math.max(1, Math.floor(Math.sqrt(Object.keys(state.discoveries).length) + Object.keys(state.galaxies).length + Object.values(state.megastructures).filter(s => s.status === 'complete').length * 2 + state.records.mostAdvanced / 3));
}
export function lawCost(state: Universe, id: LawId): number { return META_BALANCE.lawBaseCost * (state.meta.laws[id] + 1) ** 2; }
export function buyLaw(state: Universe, id: LawId): ActionResult {
  if (!Object.hasOwn(state.meta.laws, id) || state.meta.laws[id] >= META_BALANCE.maxLaw) return { ok: false, message: 'This universal law is complete.' };
  const cost = lawCost(state, id);
  if (state.meta.cosmicKnowledge < cost) return { ok: false, message: 'Cosmic Knowledge is earned by rebirthing a developed universe.' };
  state.meta.cosmicKnowledge -= cost; state.meta.laws[id]++;
  return { ok: true, message: 'A new law will guide every universe you create.' };
}
export function rebirth(state: Universe, seed = entitySeed(state.seed, `rebirth:${state.meta.runs + 1}`)): Universe {
  if (!canRebirth(state)) throw new Error('Build a Dyson swarm before rebirthing your universe.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Universe seeds must be whole numbers from 0 to 4294967295.');
  const next = createUniverse(seed, state.lastTimestamp), reward = rebirthReward(state);
  next.meta = structuredClone(state.meta); next.meta.runs++; next.meta.cosmicKnowledge += reward; next.meta.earnedKnowledge += reward;
  next.meta.activeModifiers = state.meta.nextModifiers.filter(id => MODIFIERS[id] && MODIFIERS[id].runs <= next.meta.runs).slice(0, 2);
  next.discoveries = structuredClone(state.discoveries); next.achievements = [...state.achievements]; next.artifacts = [...state.artifacts]; next.records = { ...state.records }; next.settings = { ...state.settings };
  const home = next.objects['planet-0']; next.resources.energy += Math.min(1000, next.meta.runs * 10); next.resources.matter += Math.min(400, next.meta.runs * 5);
  if (next.meta.activeModifiers.includes('high-gravity')) home.planet!.gravity = 1.6;
  if (next.meta.activeModifiers.includes('ancient-universe')) { home.life!.progress = 240; home.life!.stage = 'complex'; home.planet!.water = 0.7; home.planet!.atmosphere = 0.8; }
  if (next.meta.activeModifiers.includes('unstable-stars')) next.objects['star-0'].stellar!.lifespan *= 0.5;
  logEvent(next, 'UniverseReborn', home.id, `A new universe. A familiar possibility.`, `${reward} Cosmic Knowledge retained alongside your discoveries, artifacts, records and laws.`, 'wonder');
  return next;
}
