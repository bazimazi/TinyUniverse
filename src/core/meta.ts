import { BALANCE, META_BALANCE } from './config.ts';
import type { MetaProgression, Universe } from './types.ts';
export function initialMeta(): MetaProgression { return { runs: 0, cosmicKnowledge: 0, earnedKnowledge: 0, laws: { production: 0, evolution: 0, research: 0, offline: 0 }, activeModifiers: [], nextModifiers: [] }; }
export function offlineCap(state: Universe): number { return Math.min(META_BALANCE.maxOfflineDays * 86400, BALANCE.offlineCap + state.meta.laws.offline * 86400); }
export function evolutionMultiplier(state: Universe): number { return (1 + state.meta.laws.evolution * META_BALANCE.evolutionPerLevel) * (state.meta.activeModifiers.includes('fast-evolution') ? 1.6 : 1) * (1 + Math.min(0.3, state.artifacts.filter(id => id.startsWith('living-archive')).length * 0.02)); }
