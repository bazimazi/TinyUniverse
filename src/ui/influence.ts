import { ABILITIES, abilityReadiness, orbitAfterInfluence } from '../gameplay/abilities.ts';
import { button } from './panels.ts';
import { costText, duration, escape, number } from './format.ts';
import type { Universe } from '../core/types.ts';
export function influencePanel(state: Universe): string {
  const object = state.objects[state.selectedId];
  return `<div class="eyebrow">POWERFUL, BUT INDIRECT</div><h2>A gentle hand</h2><p>Influence ${escape(object.name)}. A world and its inhabitants will respond to the conditions you create.</p><div class="cards">${Object.entries(ABILITIES).map(([id, ability]) => {
    const readiness = abilityReadiness(state, id, object.id);
    const next = id === 'push' || id === 'pull' ? orbitAfterInfluence(object, id) : null;
    const preview = next ? `<p class="muted">Orbit radius ${number(object.orbit!.radius)} → ${number(next.radius)} · temperature ${number(object.planet!.temperature)}K → ${number(next.temperature)}K</p>` : '';
    return `<article class="card" data-ability="${id}"><strong>${ability.name}</strong><p>${ability.description}</p>${preview}<p class="muted">${escape(readiness.message)}</p>${button(readiness.reason === 'cooldown' ? `Recovering · ${duration(readiness.cooldown)}` : costText(ability.cost), 'ability', id, !readiness.ok)}</article>`;
  }).join('')}</div>`;
}
