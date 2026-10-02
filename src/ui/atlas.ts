import { button, metric } from './panels.ts';
import { duration, escape, number } from './format.ts';
import type { Universe } from '../core/types.ts';
export function atlasPanel(state: Universe): string {
  const objects = Object.values(state.objects), civilizations = Object.values(state.civilizations);
  return `<div class="eyebrow">A UNIVERSE LARGER THAN ITS WORLDS</div><h2>Cosmic atlas</h2><div class="metrics">${metric('Known planets', number(objects.filter(o => o.planet).length))}${metric('Detailed systems', String(Object.keys(state.systems).length))}${metric('Living civilizations', String(civilizations.filter(c => c.status === 'active').length))}${metric('Silent civilizations', String(civilizations.filter(c => c.status === 'extinct').length))}${metric('Total population', number(civilizations.reduce((n, c) => n + c.population, 0) + Object.values(state.galaxies).reduce((n, g) => n + g.backgroundPopulation, 0)))}${metric('Oldest civilization', civilizations.length ? duration(state.time - Math.min(...civilizations.map(c => c.foundedAt))) : 'None yet')}</div><div class="cards">${Object.values(state.galaxies).map(g => {
    const systems = Object.values(state.systems).filter(s => s.galaxyId === g.id), first = systems[0];
    return `<article class="card"><div class="card-title"><strong>${escape(g.name)}</strong><span class="badge">${number(g.totalSystems)} systems</span></div><p>${g.surveyed} surveyed · ${g.backgroundCivilizations} distant colonies · ${number(g.backgroundPopulation)} aggregate population</p>${first ? button('Visit galaxy', 'select', state.objects[first.starId].children.find(id => state.objects[id].planet) ?? first.starId, false, true) : '<p>A distant reach, charted through survey data.</p>'}</article>`;
  }).join('')}</div>`;
}
