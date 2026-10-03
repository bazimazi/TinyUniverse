import type { Universe } from '../core/types.ts';
import { button } from './panels.ts';
import { duration, escape } from './format.ts';
export function stellarActivityPanel(state: Universe): string {
  const object = state.objects[state.selectedId], starObject = state.objects[state.systems[object.systemId].starId], star = starObject.stellar;
  if (!star) return '';
  const warning = star.flareAt !== null;
  const suppressed = star.suppressedUntil > state.time;
  if (object.id !== starObject.id && !warning && !suppressed) return '';
  const status = star.stage === 'remnant' ? 'A stellar remnant. Flare activity has ended.' : warning ? `Flare expected in ${duration(Math.max(0, star.flareAt! - state.time))}. ${star.suppressedUntil > star.flareAt! ? 'Stellar suppression covers its arrival.' : object.planet && object.shieldUntil > star.flareAt! ? 'This world’s shelter covers its arrival.' : 'Shelter worlds or suppress the star to prevent damage.'}` : 'Watching for stellar activity. A warning precedes each flare.';
  return `<article class="card" data-stellar-activity="${escape(starObject.id)}"><div class="card-title"><strong>${escape(starObject.name)} · stellar activity</strong><span class="badge">${star.stage === 'remnant' ? 'Remnant' : warning ? 'Flare warning' : suppressed ? 'Suppressed' : 'Quiet'}</span></div><p>${escape(status)}</p>${suppressed && star.stage !== 'remnant' ? `<p>Suppression remaining · ${duration(star.suppressedUntil - state.time)}</p>` : ''}${star.stage !== 'remnant' ? `<p class="muted">Atmospheres and magnetic fields reduce radiation damage. Planetary shelter protects one world; fusion unlocks suppression for the whole system. Suppression does not delay stellar aging.</p>${object.id !== starObject.id ? button(`Observe ${starObject.name}`, 'select', starObject.id, false, true) : button('Stellar influence', 'tab', 'influence', false, true)}` : ''}</article>`;
}
