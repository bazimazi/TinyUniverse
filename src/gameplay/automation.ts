import { hasTechnology } from '../simulation/civilizations.ts';
import { buyUpgrade } from '../simulation/economy.ts';
import { startExploration } from './exploration.ts';
import { useAbility } from './abilities.ts';
import type { Universe, UpgradeId } from '../core/types.ts';
export function automate(state: Universe): void {
  if (!hasTechnology(state, 'ai') || Math.round(state.time) % 60 !== 0) return;
  if (state.automation.explore && !state.exploration.job) startExploration(state, hasTechnology(state, 'interstellar') && Object.keys(state.systems).length >= 3 ? 'galactic' : state.exploration.completed.orbital >= 3 ? 'interstellar' : 'orbital');
  if (state.automation.develop) {
    const planet = state.objects[state.selectedId].planet ? state.objects[state.selectedId] : state.objects['planet-0'];
    const id = (Object.keys(planet.upgrades) as UpgradeId[]).sort((a, b) => planet.upgrades[a] - planet.upgrades[b])[0]; buyUpgrade(state, planet.id, id);
  }
  for (const civ of Object.values(state.civilizations)) if (civ.status === 'active') {
    if (state.automation.assist && state.objects[civ.planetId].planet!.habitability < 0.5) useAbility(state, 'terraform', civ.planetId);
    if (state.automation.assist && civ.stability < 0.4) useAbility(state, 'gift', civ.planetId);
    if (state.automation.research && civ.researching && state.resources.knowledge > 200) useAbility(state, 'inspire', civ.planetId);
  }
}
