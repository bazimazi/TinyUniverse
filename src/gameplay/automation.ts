import { BALANCE, GALAXY_BALANCE, STELLAR_BALANCE, UPGRADES } from '../core/config.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import { buyUpgrade, canAfford, upgradeCost } from '../simulation/economy.ts';
import { explorationAvailability, mineAsteroid, startExploration } from './exploration.ts';
import { ABILITIES, abilityReadiness, useAbility } from './abilities.ts';
import type { Cost, ExploreKind, ResourceId, Universe, UpgradeId } from '../core/types.ts';

type AutomationId = keyof Universe['automation'];
const RESEARCH_RESERVE = 200;
const EXPEDITION_COSTS = { orbital: BALANCE.exploration.cost, interstellar: STELLAR_BALANCE.interstellarCost, galactic: GALAXY_BALANCE.cost };

function expeditionPlan(state: Universe): { kind: ExploreKind | null; message: string } {
  const preferred: ExploreKind[] = hasTechnology(state, 'interstellar') && Object.keys(state.systems).length >= 3
    ? ['galactic', 'interstellar', 'orbital']
    : state.exploration.completed.orbital >= 3 ? ['interstellar', 'orbital', 'galactic'] : ['orbital', 'interstellar', 'galactic'];
  for (const kind of preferred) {
    if (!explorationAvailability(state, kind).ok) continue;
    // Reserve resources for the preferred reachable destination rather than spending them on cheaper trips.
    return { kind, message: canAfford(state, EXPEDITION_COSTS[kind]) ? `Next: ${kind} expedition.` : `Waiting for resources for ${kind === 'galactic' ? 'a' : 'an'} ${kind} expedition.` };
  }
  return { kind: null, message: explorationAvailability(state, preferred[0]).message };
}

function expeditionReserve(state: Universe): Cost {
  if (!state.automation.explore || state.exploration.job) return {};
  const { kind } = expeditionPlan(state);
  return kind ? EXPEDITION_COSTS[kind] : {};
}
function canAutomateSpend(state: Universe, cost: Cost, knowledgeReserve = 0): boolean {
  const reserve = expeditionReserve(state);
  return canAfford(state, cost) && Object.entries(cost).every(([id, amount]) => state.resources[id as ResourceId] >= amount! + Math.max(reserve[id as ResourceId] ?? 0, id === 'knowledge' ? knowledgeReserve : 0));
}

function miningPlan(state: Universe) {
  const systemId = state.objects[state.selectedId].systemId;
  const candidates = Object.values(state.objects).filter(o => o.type === 'asteroid' && !o.mined).sort((a, b) =>
    Number(b.id === state.selectedId) - Number(a.id === state.selectedId) || Number(b.systemId === systemId) - Number(a.systemId === systemId) || b.deposit - a.deposit || (a.id === b.id ? 0 : a.id < b.id ? -1 : 1));
  const target = candidates[0] ?? null;
  const message = !target ? 'Waiting for an unmined asteroid.' : !canAfford(state, BALANCE.asteroidCost) ? 'Waiting for 60 energy and 25 matter for a mining outpost.' : !canAutomateSpend(state, BALANCE.asteroidCost) ? 'Saving expedition resources before building a mining outpost.' : `Next: mining outpost on ${target.name}.`;
  return { target, message };
}

function developmentPlan(state: Universe) {
  const selected = state.objects[state.selectedId];
  const planet = selected.planet ? selected : Object.values(state.objects).find(o => o.systemId === selected.systemId && o.planet) ?? state.objects['planet-0'];
  const pending = (Object.keys(UPGRADES) as UpgradeId[]).filter(id => planet.upgrades[id] < BALANCE.maxUpgrade).sort((a, b) => planet.upgrades[a] - planet.upgrades[b]);
  const upgrade = pending.find(id => canAutomateSpend(state, upgradeCost(planet, id))) ?? null;
  const reserved = pending.some(id => canAfford(state, upgradeCost(planet, id)));
  return { planet, upgrade, message: upgrade ? `Next: ${UPGRADES[upgrade].name} on ${planet.name}.` : !pending.length ? `Development complete on ${planet.name}.` : reserved ? `Saving expedition resources before developing ${planet.name}.` : `Waiting for upgrade resources on ${planet.name}.` };
}

function interventionPlan(state: Universe, kind: 'assist' | 'research'): { ability: string; targetId: string }[] {
  const actions: { ability: string; targetId: string }[] = [];
  for (const civ of Object.values(state.civilizations)) {
    if (civ.status !== 'active') continue;
    const planet = state.objects[civ.planetId].planet!;
    if (kind === 'assist') {
      if (planet.habitability < 0.5 && (planet.water < 1 || planet.atmosphere < 1 || Math.abs(planet.temperature - 288) > 0.01)) actions.push({ ability: 'terraform', targetId: civ.planetId });
      if (civ.stability < 0.4) actions.push({ ability: 'gift', targetId: civ.planetId });
    } else if (civ.researching && civ.researchPoints < TECHNOLOGIES[civ.researching].cost) {
      actions.push({ ability: 'inspire', targetId: civ.planetId });
    }
  }
  return actions.filter(({ ability, targetId }) => abilityReadiness(state, ability, targetId).ok && canAutomateSpend(state, ABILITIES[ability].cost, kind === 'research' ? RESEARCH_RESERVE : 0));
}

export function automationStatus(state: Universe, id: AutomationId): string {
  if (!hasTechnology(state, 'ai')) return 'Unlock Artificial intelligence to enable automation.';
  if (!state.automation[id]) return 'Paused.';
  if (id === 'explore') return expeditionPlan(state).message;
  if (id === 'develop') return developmentPlan(state).message;
  if (id === 'mine') return miningPlan(state).message;
  const action = interventionPlan(state, id)[0];
  if (action) return `Next: ${ABILITIES[action.ability].name} on ${state.objects[action.targetId].name}.`;
  const keep = Math.max(RESEARCH_RESERVE, expeditionReserve(state).knowledge ?? 0);
  return id === 'assist' ? 'Waiting for a world that needs help, spendable resources or a recovering influence.' : `Waiting for active research, a recovering influence or ${keep + ABILITIES.inspire.cost.knowledge!} knowledge (${keep} kept in reserve).`;
}

export function automate(state: Universe): void {
  if (!hasTechnology(state, 'ai') || Math.round(state.time) % 60 !== 0) return;
  if (state.automation.explore) {
    const { kind } = expeditionPlan(state);
    if (kind) startExploration(state, kind);
  }
  if (state.automation.mine) {
    const { target } = miningPlan(state);
    if (target && canAutomateSpend(state, BALANCE.asteroidCost)) mineAsteroid(state, target.id);
  }
  if (state.automation.develop) {
    const { planet, upgrade } = developmentPlan(state);
    if (upgrade) buyUpgrade(state, planet.id, upgrade);
  }
  for (const kind of ['assist', 'research'] as const) if (state.automation[kind]) {
    for (const { ability, targetId } of interventionPlan(state, kind)) {
      if (canAutomateSpend(state, ABILITIES[ability].cost, kind === 'research' ? RESEARCH_RESERVE : 0)) useAbility(state, ability, targetId);
    }
  }
}
