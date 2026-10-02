import { ABILITIES } from '../gameplay/abilities.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import { canAfford } from '../simulation/economy.ts';
import { button } from './panels.ts';
import { costText, duration, escape } from './format.ts';
import type { Universe } from '../core/types.ts';
export function influencePanel(state: Universe): string {
  const object = state.objects[state.selectedId];
  return `<div class="eyebrow">POWERFUL, BUT INDIRECT</div><h2>A gentle hand</h2><p>Influence ${escape(object.name)}. A world and its inhabitants will respond to the conditions you create.</p><div class="cards">${Object.entries(ABILITIES).map(([id, ability]) => {
    const cooldown = Math.max(0, (state.cooldowns[`${id}:${object.id}`] ?? 0) - state.time);
    const unlocked = !ability.requires || hasTechnology(state, ability.requires);
    const target = ability.target === 'planet' ? !!object.planet : ability.target === 'asteroid' ? object.type === 'asteroid' : Object.values(state.civilizations).some(c => c.planetId === object.id && c.status === 'active');
    return `<article class="card"><strong>${ability.name}</strong><p>${ability.description}</p>${button(!unlocked ? `Needs ${ability.requires}` : cooldown ? `Recovering · ${duration(cooldown)}` : costText(ability.cost), 'ability', id, !unlocked || !target || cooldown > 0 || !canAfford(state, ability.cost))}</article>`;
  }).join('')}</div>`;
}
