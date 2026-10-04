import { BALANCE, DISCOVERY_BALANCE } from '../core/config.ts';
import { entitySeed, nameFor, random } from '../core/random.ts';
import { logEvent } from '../core/universe.ts';
import { canAfford, spend } from '../simulation/economy.ts';
import { civilizationAt, civilizationEvent } from '../simulation/civilizations.ts';
import type { ActionResult, Anomaly, Civilization, Cost, Discovery, Universe } from '../core/types.ts';
import { ANOMALY_KINDS } from '../core/types.ts';
export function discover(state: Universe, discovery: Omit<Discovery, 'time'>): void {
  if (state.discoveries[discovery.id]) return;
  state.discoveries[discovery.id] = { ...discovery, time: state.time };
}
export function ruinsId(state: Universe, civ: Civilization): string { return `ruins-${state.seed}-${state.meta.runs}-${civ.id}`; }
export function ruinsOrigin(state: Universe, anomaly: Anomaly): Civilization | undefined {
  return anomaly.kind === 'ancient-ruins' ? Object.values(state.civilizations).find(c => c.status === 'extinct' && c.planetId === anomaly.targetId && ruinsId(state, c) === anomaly.id) : undefined;
}
export function recordRuins(state: Universe, civ: Civilization): void {
  const id = ruinsId(state, civ);
  if (civ.status !== 'extinct' || Object.hasOwn(state.anomalies, id) || Object.keys(state.anomalies).length >= DISCOVERY_BALANCE.maxAnomalies) return;
  const seed = entitySeed(civ.seed, id);
  state.anomalies[id] = { id, seed, targetId: civ.planetId, kind: 'ancient-ruins', stage: 0, status: 'found', choice: null, nextAt: null };
  discover(state, { id, title: `Ruins of ${civ.name}`, category: 'historical', sourceId: civ.planetId, detail: `${civ.name} left a recoverable archive on ${state.objects[civ.planetId].name}, with records of ${civ.technologies.length} technologies. Investigate to preserve its living patterns or recover engineering.`, rarity: 2 });
  civilizationEvent(state, civ, 'RuinsDiscovered', `${civ.name}: an archive remains`, 'Their ruins can be investigated in Discoveries. Their history and recorded technologies remain.', 'wonder');
}
export function findAnomaly(state: Universe, targetId: string, index: number): void {
  if (Object.keys(state.anomalies).length >= DISCOVERY_BALANCE.maxAnomalies) return;
  const id = `signal-${state.seed}-${targetId}-${index}`, seed = entitySeed(state.seed, id), rng = random(seed);
  if (state.anomalies[id] || (index > 0 && rng() > DISCOVERY_BALANCE.anomalyChance)) return;
  const kinds = state.meta.runs >= 3 ? ANOMALY_KINDS : ANOMALY_KINDS.slice(0, 4);
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const anomaly: Anomaly = { id, seed, targetId, kind, stage: 0, status: 'found', choice: null, nextAt: null };
  state.anomalies[id] = anomaly;
  discover(state, { id, title: `${nameFor(seed)} ${kind.replaceAll('-', ' ')}`, category: 'anomaly', sourceId: targetId, detail: 'An unexplained signal waits for a careful investigation.', rarity: Math.min(20, 1 + Math.floor(rng() * 4) + Math.floor(Math.log2(state.meta.runs + 1))) });
  logEvent(state, 'AnomalyDiscovered', targetId, `An unexplained ${kind.replace('-', ' ')}`, 'Investigate it in Discoveries.', 'wonder');
}
export type InvestigationChoice = 'preserve' | 'decode' | null;
export const INVESTIGATION_COSTS: { survey: Cost; preserve: Cost; decode: Cost } = { survey: { energy: 400, knowledge: 50 }, preserve: { biology: 80, knowledge: 50 }, decode: { energy: 600, knowledge: 100 } };
export interface InvestigationReadiness extends ActionResult { cost: Cost; duration: number }
export function investigationReadiness(state: Universe, id: string, choice: InvestigationChoice = null): InvestigationReadiness {
  const fail = (message: string, cost: Cost = {}, duration = 0): InvestigationReadiness => ({ ok: false, message, cost, duration });
  if (!Object.hasOwn(state.anomalies, id)) return fail('Choose a recorded signal or ruin.');
  const anomaly = state.anomalies[id];
  if (!Object.hasOwn(state.objects, anomaly.targetId)) return fail('The investigation site is unavailable.');
  if (choice !== null && choice !== 'preserve' && choice !== 'decode') return fail('Choose whether to preserve or decode the discovery.');
  if (!['found', 'choice'].includes(anomaly.status)) return fail('This investigation is already underway or complete.');
  if (anomaly.nextAt !== null || anomaly.choice !== null || anomaly.stage !== (anomaly.status === 'found' ? 0 : 1)) return fail('This investigation cannot advance from its current stage.');
  if (anomaly.status === 'found' && choice !== null) return fail('Survey the archive before choosing its legacy.');
  if (anomaly.status === 'choice' && choice === null) return fail('Choose whether to preserve or decode the discovery.');
  const cost = INVESTIGATION_COSTS[choice ?? 'survey'], duration = choice === null ? DISCOVERY_BALANCE.investigation : DISCOVERY_BALANCE.resolution;
  if (!canAfford(state, cost)) return fail('Gather the resources for this investigation.', cost, duration);
  return { ok: true, message: choice === null ? 'Survey the archive to reveal its choices.' : 'This choice is permanent once the investigation begins.', cost, duration };
}
export function investigationReward(state: Universe, id: string, choice: Exclude<InvestigationChoice, null>): { resources: Cost; progress: number; ecosystem: number; research: number } {
  const ruins = Object.hasOwn(state.anomalies, id) && !!ruinsOrigin(state, state.anomalies[id]);
  const resources: Cost = { knowledge: DISCOVERY_BALANCE.rewardKnowledge * (1 + Math.log2(state.meta.runs + 1)) };
  if (choice === 'preserve' && ruins) resources.biology = DISCOVERY_BALANCE.ruinsBiology;
  if (choice === 'decode') { resources.exotic = DISCOVERY_BALANCE.rewardExotic; if (ruins) resources.minerals = DISCOVERY_BALANCE.ruinsMinerals; }
  return { resources, progress: choice === 'preserve' ? DISCOVERY_BALANCE.archiveProgress : 0, ecosystem: choice === 'preserve' && ruins ? DISCOVERY_BALANCE.ruinsEcosystemBoost : 0, research: choice === 'decode' ? DISCOVERY_BALANCE.rewardResearch : 0 };
}
export function investigate(state: Universe, id: string, choice: InvestigationChoice = null): ActionResult {
  const readiness = investigationReadiness(state, id, choice);
  if (!readiness.ok) return readiness;
  spend(state, readiness.cost);
  const anomaly = state.anomalies[id];
  anomaly.choice = choice; anomaly.status = 'investigating'; anomaly.nextAt = state.time + readiness.duration;
  return { ok: true, message: 'The investigation has begun.' };
}
export function advanceAnomalies(state: Universe): void {
  for (const anomaly of Object.values(state.anomalies)) {
    if (anomaly.nextAt === null || anomaly.nextAt > state.time + 1e-7) continue;
    anomaly.nextAt = null;
    if (anomaly.stage === 0) {
      anomaly.stage = 1; anomaly.status = 'choice';
      logEvent(state, 'SignalDecoded', anomaly.targetId, 'The archive has a history', 'Preserve its living legacy, or decode its technology? Your choice changes the reward.', 'wonder');
    } else {
      const choice = anomaly.choice! as Exclude<InvestigationChoice, null>, reward = investigationReward(state, anomaly.id, choice), origin = ruinsOrigin(state, anomaly);
      anomaly.stage = 3; anomaly.status = 'resolved';
      for (const [id, amount] of Object.entries(reward.resources)) state.resources[id as keyof Cost] = Math.min(BALANCE.resourceLimit, state.resources[id as keyof Cost] + amount!);
      const object = state.objects[anomaly.targetId], civ = civilizationAt(state, anomaly.targetId, true);
      if (object.life) object.life.progress = Math.min(BALANCE.resourceLimit, object.life.progress + reward.progress);
      if (object.life && reward.ecosystem) {
        for (const key of Object.keys(object.life.populations) as (keyof typeof object.life.populations)[]) object.life.populations[key] = Math.min(1, object.life.populations[key] + reward.ecosystem);
        object.planet!.biodiversity = Math.min(1, Object.values(object.life.populations).reduce((sum, population) => sum + population, 0) / 6 + object.upgrades.biodiversity * 0.025);
      }
      if (civ?.researching) civ.researchPoints = Math.min(BALANCE.resourceLimit, civ.researchPoints + reward.research);
      const artifact = `${choice === 'preserve' ? 'living-archive' : 'star-map'}:${anomaly.seed}`;
      if (!state.artifacts.includes(artifact)) state.artifacts.push(artifact);
      discover(state, { id: `history:${anomaly.seed}`, title: origin ? `${origin.name}: a legacy recovered` : `The ${nameFor(anomaly.seed)} legacy`, category: 'historical', sourceId: anomaly.targetId, detail: `${origin ? origin.name : 'An ancient civilization'} left this ${anomaly.kind.replaceAll('-', ' ')}. You chose to ${choice} its legacy. Its history is now part of yours.`, rarity: 3 });
      if (origin) civilizationEvent(state, origin, 'RuinsRecovered', `${origin.name}: legacy ${choice === 'preserve' ? 'preserved' : 'decoded'}`, 'An enduring artifact and knowledge were recovered from their archive. Their civilization remains silent.', 'wonder');
      else logEvent(state, 'MysteryResolved', anomaly.targetId, 'A lost history, remembered', 'Knowledge and an enduring artifact recovered.', 'wonder');
    }
  }
}
