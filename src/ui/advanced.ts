import type { StructureType, Universe } from '../core/types.ts';
import { STRUCTURES } from '../gameplay/megastructures.ts';
import { canAfford } from '../simulation/economy.ts';
import { civilizationAt } from '../simulation/civilizations.ts';
import { mediationReadiness } from '../simulation/advanced.ts';
import { button } from './panels.ts';
import { costText, duration, escape } from './format.ts';
export function advancedPanel(state: Universe): string {
  const civ = civilizationAt(state, state.selectedId, true);
  const relations = Object.values(state.relations).filter(r => !civ || r.a === civ.id || r.b === civ.id).slice(0, 24);
  return `<h3>Between civilizations</h3><div class="cards">${relations.map(r => {
    const readiness = mediationReadiness(state, r.id);
    const archived = state.civilizations[r.a].status !== 'active' || state.civilizations[r.b].status !== 'active';
    return `<article class="card" data-relation="${escape(r.id)}"><strong>${escape(state.civilizations[r.a].name)} & ${escape(state.civilizations[r.b].name)}</strong><p>${archived ? 'Archived · last recorded ' : ''}${r.status} · trust ${Math.round(r.score)} / 100</p><p class="muted">${escape(readiness.message)}</p>${button('Mediate · 100 knowledge / 1K energy', 'mediate', r.id, !readiness.ok)}</article>`;
  }).join('') || '<p>Spacefaring civilizations have yet to meet.</p>'}</div><h3>Building beyond a world</h3>${civ ? `<p>Support ${escape(civ.name)} in its home system, ${escape(state.systems[state.objects[civ.planetId].systemId].name)}.${state.selectedId !== civ.planetId ? ` ${button('Visit home world', 'select', civ.planetId)}` : ''}</p>` : ''}<div class="cards">${civ ? (Object.keys(STRUCTURES) as StructureType[]).map(type => {
    const spec = STRUCTURES[type], structure = state.megastructures[`${civ.id}:${type}`];
    return `<article class="card"><strong>${spec.name}</strong><p>${spec.description}</p>${structure ? `<span class="badge">${structure.status === 'complete' ? 'Complete' : `Building · ${duration(Math.max(0, structure.endsAt - state.time))} remaining`}</span>` : button(civ.technologies.includes(spec.requires) ? costText(spec.cost) : `Needs ${spec.requires}`, 'build', `${civ.id}|${type}`, !civ.technologies.includes(spec.requires) || !canAfford(state, spec.cost))}</article>`;
  }).join('') : '<p>Select a living civilization’s world to support construction. Civilizations also build independently using their industry.</p>'}</div>`;
}
