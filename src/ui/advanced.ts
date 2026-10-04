import type { StructureType, Universe } from '../core/types.ts';
import { STRUCTURES, structureAt, structureReadiness } from '../gameplay/megastructures.ts';
import { civilizationAt } from '../simulation/civilizations.ts';
import { mediationReadiness } from '../simulation/advanced.ts';
import { button } from './panels.ts';
import { costText, duration, escape } from './format.ts';
export function advancedPanel(state: Universe): string {
  const civ = civilizationAt(state, state.selectedId, true);
  const system = state.systems[state.objects[state.selectedId].systemId];
  const relations = Object.values(state.relations).filter(r => !civ || r.a === civ.id || r.b === civ.id).slice(0, 24);
  return `<h3>Between civilizations</h3><div class="cards">${relations.map(r => {
    const readiness = mediationReadiness(state, r.id);
    const archived = state.civilizations[r.a].status !== 'active' || state.civilizations[r.b].status !== 'active';
    return `<article class="card" data-relation="${escape(r.id)}"><strong>${escape(state.civilizations[r.a].name)} & ${escape(state.civilizations[r.b].name)}</strong><p>${archived ? 'Archived · last recorded ' : ''}${r.status} · trust ${Math.round(r.score)} / 100</p><p class="muted">${escape(readiness.message)}</p>${button('Mediate · 100 knowledge / 1K energy', 'mediate', r.id, !readiness.ok)}</article>`;
  }).join('') || '<p>Spacefaring civilizations have yet to meet.</p>'}</div><h3>Building beyond a world</h3>${civ ? `<p>Support ${escape(civ.name)} in ${escape(system.name)}, the selected settled world’s system. One structure of each kind per civilization in each system.${state.selectedId !== civ.planetId ? ` ${button('Visit home world', 'select', civ.planetId)}` : ''}</p>` : ''}<div class="cards">${civ ? (Object.keys(STRUCTURES) as StructureType[]).map(type => {
    const spec = STRUCTURES[type], structure = structureAt(state, civ.id, type, system.id), readiness = structureReadiness(state, civ.id, type, true, state.selectedId);
    return `<article class="card" data-structure="${type}"><strong>${spec.name}</strong><p>${spec.description}</p>${structure ? `<span class="badge">${structure.status === 'complete' ? 'Complete' : `Building · ${duration(Math.max(0, structure.endsAt - state.time))} remaining`}</span>` : `<p class="muted">${escape(readiness.message)}</p>${button(costText(spec.cost), 'build', `${civ.id}|${type}|${state.selectedId}`, !readiness.ok)}`}</article>`;
  }).join('') : '<p>Select a living civilization’s world to support construction. Civilizations also build independently using their industry.</p>'}</div>`;
}
