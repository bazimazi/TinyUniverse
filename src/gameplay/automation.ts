import { BALANCE, GALAXY_BALANCE, STELLAR_BALANCE, UPGRADES } from '../core/config.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import { buyUpgrade, canAfford, upgradeCost } from '../simulation/economy.ts';
import { explorationAvailability, startExploration } from './exploration.ts';
import { ABILITIES, abilityReadiness, useAbility } from './abilities.ts';
import type { ExploreKind, Universe, UpgradeId } from '../core/types.ts';

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

function developmentPlan(state: Universe) {
  const selected = state.objects[state.selectedId];
  const planet = selected.planet ? selected : Object.values(state.objects).find(o => o.systemId === selected.systemId && o.planet) ?? state.objects['planet-0'];
  const pending = (Object.keys(UPGRADES) as UpgradeId[]).filter(id => planet.upgrades[id] < BALANCE.maxUpgrade).sort((a, b) => planet.upgrades[a] - planet.upgrades[b]);
  const upgrade = pending.find(id => canAfford(state, upgradeCost(planet, id))) ?? null;
  return { planet, upgrade, message: upgrade ? `Next: ${UPGRADES[upgrade].name} on ${planet.name}.` : pending.length ? `Waiting for upgrade resources on ${planet.name}.` : `Development complete on ${planet.name}.` };
}

function interventionPlan(state: Universe, kind: 'assist' | 'research'): { ability: string; targetId: string }[] {
  const actions: { ability: string; targetId: string }[] = [];
  for (const civ of Object.values(state.civilizations)) {
    if (civ.status !== 'active') continue;
    const planet = state.objects[civ.planetId].planet!;
    if (kind === 'assist') {
      if (planet.habitability < 0.5 && (planet.water < 1 || planet.atmosphere < 1 || Math.abs(planet.temperature - 288) > 0.01)) actions.push({ ability: 'terraform', targetId: civ.planetId });
      if (civ.stability < 0.4) actions.push({ ability: 'gift', targetId: civ.planetId });
    } else if (civ.researching && civ.researchPoints < TECHNOLOGIES[civ.researching].cost && state.resources.knowledge >= RESEARCH_RESERVE + ABILITIES.inspire.cost.knowledge!) {
      actions.push({ ability: 'inspire', targetId: civ.planetId });
    }
  }
  return actions.filter(({ ability, targetId }) => abilityReadiness(state, ability, targetId).ok);
}

export function automationStatus(state: Universe, id: AutomationId): string {
  if (!hasTechnology(state, 'ai')) return 'Unlock Artificial intelligence to enable automation.';
  if (!state.automation[id]) return 'Paused.';
  if (id === 'explore') return expeditionPlan(state).message;
  if (id === 'develop') return developmentPlan(state).message;
  const action = interventionPlan(state, id)[0];
  if (action) return `Next: ${ABILITIES[action.ability].name} on ${state.objects[action.targetId].name}.`;
  return id === 'assist' ? 'Waiting for a world that needs help, resources or a recovering influence.' : `Waiting for active research, a recovering influence or ${RESEARCH_RESERVE + ABILITIES.inspire.cost.knowledge!} knowledge (${RESEARCH_RESERVE} kept in reserve).`;
}

export function automate(state: Universe): void {
  if (!hasTechnology(state, 'ai') || Math.round(state.time) % 60 !== 0) return;
  if (state.automation.explore) {
    const { kind } = expeditionPlan(state);
    if (kind) startExploration(state, kind);
  }
  if (state.automation.develop) {
    const { planet, upgrade } = developmentPlan(state);
    if (upgrade) buyUpgrade(state, planet.id, upgrade);
  }
  for (const kind of ['assist', 'research'] as const) if (state.automation[kind]) {
    for (const { ability, targetId } of interventionPlan(state, kind)) {
      if (kind === 'research' && state.resources.knowledge < RESEARCH_RESERVE + ABILITIES.inspire.cost.knowledge!) break;
      useAbility(state, ability, targetId);
    }
  }
}
