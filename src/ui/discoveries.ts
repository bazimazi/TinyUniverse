import { button, metric } from './panels.ts';
import { costText, duration, escape, number } from './format.ts';
import { achievementTitle, ACHIEVEMENT_GROUPS } from '../simulation/discoveries.ts';
import { investigationReadiness, investigationReward, ruinsOrigin } from '../gameplay/discoveries.ts';
import type { Anomaly, Universe } from '../core/types.ts';
function rewardPreview(state: Universe, anomaly: Anomaly, choice: 'preserve' | 'decode'): string {
  const reward = investigationReward(state, anomaly.id, choice);
  return `${costText(reward.resources)} · ${choice === 'preserve' ? `${reward.progress} evolution progress on worlds with life${reward.ecosystem ? ` · restore ecosystem abundance by up to ${Math.round(reward.ecosystem * 100)} percentage points` : ''}` : `${reward.research} research for a living owner with an active project`} · an enduring artifact`;
}
function investigationCard(state: Universe, anomaly: Anomaly): string {
  const origin = ruinsOrigin(state, anomaly), world = state.objects[anomaly.targetId];
  let controls = '', description = '';
  if (anomaly.status === 'found') {
    const readiness = investigationReadiness(state, anomaly.id);
    description = `${origin ? 'A fallen civilization left a recoverable archive.' : 'A signal hints at an older history.'} Survey it to reveal a permanent choice.`;
    controls = `<p class="muted">${escape(readiness.message)} · ${duration(readiness.duration)}</p>${button(`Investigate · ${costText(readiness.cost)}`, 'investigate', anomaly.id, !readiness.ok)}`;
  } else if (anomaly.status === 'choice') {
    description = 'The archive contains living patterns and ancient engineering. Choose which legacy to recover. Rewards arrive when the investigation finishes.';
    controls = (['preserve', 'decode'] as const).map(choice => {
      const readiness = investigationReadiness(state, anomaly.id, choice);
      return `<div data-investigation-choice="${choice}"><p><strong>${choice === 'preserve' ? 'Preserve its living archive' : 'Decode its engineering'}</strong></p><p>${escape(rewardPreview(state, anomaly, choice))}.</p><p class="muted">${escape(readiness.message)} · ${duration(readiness.duration)}</p>${button(`${choice === 'preserve' ? 'Preserve' : 'Decode'} · ${costText(readiness.cost)}`, 'investigate', `${anomaly.id}|${choice}`, !readiness.ok)}</div>`;
    }).join('');
  } else description = anomaly.status === 'resolved' ? `You chose to ${anomaly.choice} this legacy. Its artifact is yours to keep.` : `Investigating · ${duration(Math.max(0, (anomaly.nextAt ?? state.time) - state.time))} remaining${anomaly.choice ? ` · ${anomaly.choice} chosen` : ''}`;
  return `<article class="card" data-anomaly="${escape(anomaly.id)}"><div class="card-title"><strong>${escape(origin ? `Ruins of ${origin.name}` : state.discoveries[anomaly.id]?.title ?? anomaly.kind)}</strong><span class="badge">${anomaly.status}</span></div><p>${escape(world.name)}${origin ? ` · ${origin.technologies.length} recorded ${origin.technologies.length === 1 ? 'technology' : 'technologies'}` : ''}</p><p>${escape(description)}</p>${controls}${button('Observe site', 'select', world.id, false, true)}</article>`;
}
export function discoveriesPanel(state: Universe): string {
  const discoveries = Object.values(state.discoveries).sort((a, b) => b.time - a.time);
  const priority = (a: Anomaly) => (a.targetId === state.selectedId ? 2 : 0) + (a.status !== 'resolved' ? 1 : 0);
  const anomalies = Object.values(state.anomalies).sort((a, b) => priority(b) - priority(a));
  return `<div class="eyebrow">REMEMBER WHAT YOU FOUND</div><h2>Discovery Codex</h2><div class="metrics">${metric('Discoveries', String(discoveries.length))}${metric('Milestones', `${state.achievements.length} / ${ACHIEVEMENT_GROUPS.length * 10}`)}${metric('Population record', number(state.records.peakPopulation))}${metric('Artifacts', String(state.artifacts.length))}</div><h3>Signals and legacies</h3><div class="cards">${anomalies.map(a => investigationCard(state, a)).join('') || '<p>Explore beyond your system to uncover rare signals and ancient histories. Fallen civilizations also leave recoverable archives.</p>'}</div><h3>A permanent collection</h3><div class="cards">${discoveries.slice(0, 80).map(d => `<article class="card"><div class="card-title"><strong>${escape(d.title)}</strong><span class="badge">${d.category} · rarity ${d.rarity}</span></div><p>${escape(d.detail)}</p></article>`).join('')}</div><details><summary>Milestones · ${state.achievements.length} collected</summary><div class="achievement-list">${state.achievements.map(id => `<span class="badge">${escape(achievementTitle(id))}</span>`).join('')}</div></details>`;
}
