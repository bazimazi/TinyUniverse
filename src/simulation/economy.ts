import { BALANCE, META_BALANCE, UPGRADES } from '../core/config.ts';
import { logEvent } from '../core/universe.ts';
import { RESOURCE_IDS } from '../core/types.ts';
import { habitability } from './life.ts';
import type { ActionResult, CelestialObject, Cost, Resources, Universe, UpgradeId } from '../core/types.ts';
export function rates(state: Universe): Resources {
  const result: Resources = { energy: 0, matter: 0, minerals: 0, biology: 0, knowledge: 0, exotic: 0, stellar: 0, quantum: 0 };
  for (const object of Object.values(state.objects)) {
    if (object.mined) result.minerals += BALANCE.asteroidYield;
    if (object.type === 'black-hole') { result.exotic += 0.08; result.quantum += 0.02; }
    if (!object.planet) continue;
    const star = state.objects[state.systems[object.systemId].starId].stellar;
    result.energy += (BALANCE.production.energy + object.upgrades.solar * 2) * Math.min(1000, star?.luminosity ?? 1);
    result.matter += BALANCE.production.matter;
    result.minerals += BALANCE.production.minerals + object.upgrades.mining * 1.5;
    result.biology += BALANCE.production.biology + object.upgrades.oceans * 0.08 + object.upgrades.biodiversity * 0.2 + object.planet.biodiversity * 0.3;
  }
  result.knowledge = knowledgeRate(state);
  for (const structure of Object.values(state.megastructures)) if (structure.status === 'complete') {
    if (structure.type === 'habitat') { result.matter += 1; result.knowledge += 0.05; }
    if (structure.type === 'dyson') { result.energy += 100; result.stellar += 12; }
    if (structure.type === 'wormhole') result.quantum += 0.4;
    if (structure.type === 'black-hole-generator') { result.exotic += 0.5; result.quantum += 0.1; result.energy += 80; }
  }
  const multiplier = (1 + state.meta.laws.production * META_BALANCE.productionPerLevel) * (1 + Math.log10(1 + state.meta.earnedKnowledge) * 0.1);
  for (const id of RESOURCE_IDS) result[id] *= multiplier;
  if (state.meta.activeModifiers.includes('abundant-minerals')) result.minerals *= 2;
  return result;
}
export function knowledgeRate(state: Universe): number {
  return Object.values(state.civilizations).reduce((sum, civ) => sum + (civ.status === 'active' ? (0.02 + civ.level * 0.015) * civ.science : 0), 0);
}
export function produce(state: Universe, seconds: number): void {
  const production = rates(state);
  for (const id of RESOURCE_IDS) state.resources[id] = Math.min(BALANCE.resourceLimit, state.resources[id] + production[id] * seconds);
}
export function canAfford(state: Universe, cost: Cost): boolean {
  if (Object.entries(cost).some(([id, amount]) => !RESOURCE_IDS.includes(id as typeof RESOURCE_IDS[number]) || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)) return false;
  return RESOURCE_IDS.every(id => state.resources[id] >= (cost[id] ?? 0));
}
export function spend(state: Universe, cost: Cost): boolean {
  if (!canAfford(state, cost)) return false;
  for (const id of RESOURCE_IDS) state.resources[id] -= cost[id] ?? 0;
  return true;
}
export function upgradeCost(object: CelestialObject, id: UpgradeId): Cost {
  return Object.fromEntries(Object.entries(UPGRADES[id].cost).map(([key, value]) => [key, Math.ceil(value * BALANCE.costGrowth ** object.upgrades[id])])) as Cost;
}
export function buyUpgrade(state: Universe, objectId: string, id: UpgradeId): ActionResult {
  const object = state.objects[objectId];
  if (!object?.planet || !Object.hasOwn(UPGRADES, id)) return { ok: false, message: 'Select a planet to develop.' };
  if (object.upgrades[id] >= BALANCE.maxUpgrade) return { ok: false, message: 'This upgrade is complete.' };
  if (!spend(state, upgradeCost(object, id))) return { ok: false, message: 'Your world is still gathering the resources for this upgrade.' };
  object.upgrades[id]++;
  state.totalUpgrades++;
  const p = object.planet;
  if (id === 'atmosphere') p.atmosphere = Math.min(1, p.atmosphere + 0.08);
  if (id === 'oceans') p.water = Math.min(1, p.water + 0.07);
  if (id === 'biodiversity') p.biodiversity = Math.min(1, p.biodiversity + 0.06);
  p.habitability = habitability(object, state);
  logEvent(state, 'UpgradePurchased', objectId, `${object.name}: ${UPGRADES[id].name}`, `Level ${object.upgrades[id]}`);
  return { ok: true, message: `${UPGRADES[id].name} improved.` };
}
