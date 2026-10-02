import { BALANCE, UPGRADES } from '../core/config.ts';
import { logEvent } from '../core/universe.ts';
import { RESOURCE_IDS } from '../core/types.ts';
import type { ActionResult, CelestialObject, Cost, Resources, Universe, UpgradeId } from '../core/types.ts';
export function rates(state: Universe): Resources {
  const result: Resources = { energy: 0, matter: 0, minerals: 0, biology: 0 };
  for (const object of Object.values(state.objects)) {
    if (!object.planet) continue;
    result.energy += BALANCE.production.energy + object.upgrades.solar * 2;
    result.matter += BALANCE.production.matter;
    result.minerals += BALANCE.production.minerals + object.upgrades.mining * 1.5;
    result.biology += BALANCE.production.biology + object.upgrades.oceans * 0.08 + object.upgrades.biodiversity * 0.2;
  }
  return result;
}
export function produce(state: Universe, seconds: number): void {
  const production = rates(state);
  for (const id of RESOURCE_IDS) state.resources[id] = Math.min(BALANCE.resourceLimit, state.resources[id] + production[id] * seconds);
}
export function canAfford(state: Universe, cost: Cost): boolean {
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
  if (!object?.planet || !UPGRADES[id]) return { ok: false, message: 'Select a planet to develop.' };
  if (object.upgrades[id] >= BALANCE.maxUpgrade) return { ok: false, message: 'This upgrade is complete.' };
  if (!spend(state, upgradeCost(object, id))) return { ok: false, message: 'Your world is still gathering the resources for this upgrade.' };
  object.upgrades[id]++;
  state.totalUpgrades++;
  const p = object.planet;
  if (id === 'atmosphere') p.atmosphere = Math.min(1, p.atmosphere + 0.08);
  if (id === 'oceans') p.water = Math.min(1, p.water + 0.07);
  if (id === 'biodiversity') p.biodiversity = Math.min(1, p.biodiversity + 0.06);
  p.habitability = Math.min(1, 0.2 + p.atmosphere * 0.3 + p.water * 0.3 + p.magneticField * 0.2);
  logEvent(state, 'UpgradePurchased', objectId, `${object.name}: ${UPGRADES[id].name}`, `Level ${object.upgrades[id]}`);
  return { ok: true, message: `${UPGRADES[id].name} improved.` };
}
