import type { Universe } from '../core/types.ts';
import { button } from './panels.ts';
import { duration, escape } from './format.ts';
export function asteroidActivityPanel(state: Universe, scope: 'selection' | 'universe' = 'selection'): string {
  const selected = state.objects[state.selectedId];
  const threats = Object.values(state.objects).filter(o => {
    if (o.asteroid?.status !== 'incoming') return false;
    return scope === 'universe' || (selected.asteroid ? o.id === selected.id : selected.planet ? o.asteroid.targetId === selected.id : o.systemId === selected.systemId);
  }).sort((a, b) => a.asteroid!.impactAt! - b.asteroid!.impactAt!);
  if (!threats.length) {
    if (!selected.asteroid || scope === 'universe') return '';
    const parent = selected.parentId ? state.objects[selected.parentId] : undefined;
    const detail = parent?.planet ? `Stable companion to ${parent.name}. No incoming debris threat.` : selected.asteroid.status === 'deflected' ? 'Trajectory secured. No further debris threats from this asteroid.' : selected.asteroid.status === 'spent' ? 'The debris shower is spent. The asteroid and its mining outpost remain.' : 'No incoming debris detected. Activity is checked every fifteen minutes of universe time.';
    return `<article class="card" data-asteroid-status="${escape(selected.id)}"><strong>Asteroid trajectory</strong><p>${escape(detail)}</p></article>`;
  }
  return threats.map(object => {
    const asteroid = object.asteroid!, target = state.objects[asteroid.targetId!];
    const covered = target.shieldUntil > asteroid.impactAt!;
    return `<article class="card" data-asteroid-threat="${escape(object.id)}"><div class="card-title"><strong>Incoming debris · ${escape(object.name)}</strong><span class="badge">${duration(Math.max(0, asteroid.impactAt! - state.time))}</span></div><p>Threatens ${escape(target.name)}. ${covered ? 'Planetary shelter covers its arrival.' : 'Shelter does not cover its arrival.'}</p><p>Spaceflight can redirect the debris. Gravity engineering can secure the asteroid as a companion. Planetary shelter protects the threatened world.</p><div class="button-row">${button('Asteroid influence', 'goal', `influence|${object.id}`)}${button('Shelter threatened world', 'goal', `influence|${target.id}`, false, true)}</div></article>`;
  }).join('');
}
