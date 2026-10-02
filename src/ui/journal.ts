import type { Universe } from '../core/types.ts';
import { duration, escape } from './format.ts';
export function journalPanel(state: Universe): string {
  const followed = Object.values(state.civilizations).filter(c => c.followed).flatMap(c => c.timeline).sort((a, b) => b.time - a.time).slice(0, 20);
  const list = (events: typeof followed) => `<ol class="timeline">${events.map(event => `<li class="${event.severity}"><small>${duration(event.time)}</small><strong>${escape(event.title)}</strong><p>${escape(event.detail)}</p></li>`).join('')}</ol>`;
  return `<div class="eyebrow">A HISTORY IN THE MAKING</div><h2>Universe journal</h2>${followed.length ? `<h3>The civilizations you follow</h3>${list(followed)}<h3>Elsewhere in the universe</h3>` : ''}${state.events.length ? list([...state.events].reverse().slice(0, 50)) : '<p>Your universe is young. Its story begins with your first upgrade.</p>'}`;
}
