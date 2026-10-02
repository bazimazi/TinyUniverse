import { DISCOVERY_BALANCE } from '../core/config.ts';
import { entitySeed, nameFor, random } from '../core/random.ts';
import { logEvent } from '../core/universe.ts';
import { spend } from '../simulation/economy.ts';
import type { ActionResult, Anomaly, Discovery, Universe } from '../core/types.ts';
export function discover(state: Universe, discovery: Omit<Discovery, 'time'>): void {
  if (state.discoveries[discovery.id]) return;
  state.discoveries[discovery.id] = { ...discovery, time: state.time };
}
export function findAnomaly(state: Universe, targetId: string, index: number): void {
  if (Object.keys(state.anomalies).length >= DISCOVERY_BALANCE.maxAnomalies) return;
  const id = `signal-${state.seed}-${targetId}-${index}`, seed = entitySeed(state.seed, id), rng = random(seed);
  if (state.anomalies[id] || (index > 0 && rng() > DISCOVERY_BALANCE.anomalyChance)) return;
  const kind = (['ancient-ruins', 'time-echo', 'strange-signal', 'artificial-moon'] as const)[Math.floor(rng() * 4)];
  const anomaly: Anomaly = { id, seed, targetId, kind, stage: 0, status: 'found', choice: null, nextAt: null };
  state.anomalies[id] = anomaly;
  discover(state, { id, title: `${nameFor(seed)} ${kind.replace('-', ' ')}`, category: 'anomaly', sourceId: targetId, detail: 'An unexplained signal waits for a careful investigation.', rarity: 1 + Math.floor(rng() * 4) });
  logEvent(state, 'AnomalyDiscovered', targetId, `An unexplained ${kind.replace('-', ' ')}`, 'Investigate it in Discoveries.', 'wonder');
}
export function investigate(state: Universe, id: string, choice: 'preserve' | 'decode' | null = null): ActionResult {
  const anomaly = state.anomalies[id];
  if (!anomaly || !['found', 'choice'].includes(anomaly.status)) return { ok: false, message: 'This investigation is already underway or complete.' };
  if (anomaly.status === 'choice' && !choice) return { ok: false, message: 'Choose whether to preserve or decode the discovery.' };
  const cost = anomaly.status === 'found' ? { energy: 400, knowledge: 50 } : choice === 'preserve' ? { biology: 80, knowledge: 50 } : { energy: 600, knowledge: 100 };
  if (!spend(state, cost)) return { ok: false, message: 'Gather the resources for this investigation.' };
  anomaly.choice = choice; anomaly.status = 'investigating'; anomaly.nextAt = state.time + (anomaly.stage === 0 ? DISCOVERY_BALANCE.investigation : DISCOVERY_BALANCE.resolution);
  return { ok: true, message: 'The investigation has begun.' };
}
export function advanceAnomalies(state: Universe): void {
  for (const anomaly of Object.values(state.anomalies)) {
    if (anomaly.nextAt === null || anomaly.nextAt > state.time + 1e-7) continue;
    anomaly.nextAt = null;
    if (anomaly.stage === 0) {
      anomaly.stage = 1; anomaly.status = 'choice';
      logEvent(state, 'SignalDecoded', anomaly.targetId, 'The signal has a history', 'Preserve its living legacy, or decode its technology? Your choice changes the reward.', 'wonder');
    } else {
      anomaly.stage = 3; anomaly.status = 'resolved'; state.resources.knowledge += DISCOVERY_BALANCE.rewardKnowledge;
      const object = state.objects[anomaly.targetId], civ = Object.values(state.civilizations).find(c => c.planetId === anomaly.targetId && c.status === 'active');
      if (anomaly.choice === 'preserve') { if (object.life) object.life.progress += 180; state.artifacts.push(`living-archive:${anomaly.seed}`); }
      else { state.resources.exotic += DISCOVERY_BALANCE.rewardExotic; if (civ) civ.researchPoints += 500; state.artifacts.push(`star-map:${anomaly.seed}`); }
      discover(state, { id: `history:${anomaly.seed}`, title: `The ${nameFor(anomaly.seed)} legacy`, category: 'historical', sourceId: anomaly.targetId, detail: `An ancient civilization left this ${anomaly.kind.replace('-', ' ')}. You chose to ${anomaly.choice} its legacy. Its history is now part of yours.`, rarity: 3 });
      logEvent(state, 'MysteryResolved', anomaly.targetId, 'A lost history, remembered', 'Cosmic knowledge and an enduring artifact recovered.', 'wonder');
    }
  }
}
