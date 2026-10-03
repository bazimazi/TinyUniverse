import { RESOURCE_IDS } from '../core/types.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import type { OfflineReport } from '../simulation/offline-report.ts';
import { duration, escape, number } from './format.ts';

const signed = (value: number) => `${value >= 0 ? '+' : '\u2212'}${number(Math.abs(value))}`;
export function offlineReportContent(report: OfflineReport): string {
  const changes: string[] = [];
  if (Math.abs(report.populationChange) >= 1) changes.push(`${signed(report.populationChange)} population across your universe`);
  if (report.expeditionsCompleted) changes.push(`${report.expeditionsCompleted} expedition${report.expeditionsCompleted === 1 ? '' : 's'} completed`);
  if (report.newWorlds) changes.push(`${report.newWorlds} celestial object${report.newWorlds === 1 ? '' : 's'} discovered`);
  if (report.newSystems) changes.push(`${report.newSystems} star system${report.newSystems === 1 ? '' : 's'} charted`);
  if (report.newGalaxies) changes.push(`${report.newGalaxies} galax${report.newGalaxies === 1 ? 'y' : 'ies'} charted`);
  if (report.civilizationsFounded) changes.push(`${report.civilizationsFounded} civilization${report.civilizationsFounded === 1 ? '' : 's'} emerged`);
  if (report.civilizationsLost) changes.push(`${report.civilizationsLost} civilization${report.civilizationsLost === 1 ? '' : 's'} fell silent`);
  if (report.technologies.length) changes.push(`New knowledge: ${report.technologies.slice(0, 3).map(id => TECHNOLOGIES[id].name).join(', ')}${report.technologies.length > 3 ? ` and ${report.technologies.length - 3} more` : ''}`);
  if (report.structuresCompleted) changes.push(`${report.structuresCompleted} megastructure${report.structuresCompleted === 1 ? '' : 's'} completed`);
  if (report.discoveries) changes.push(`${report.discoveries} new Codex entr${report.discoveries === 1 ? 'y' : 'ies'}`);
  return `<div class="return-heading"><div><span class="eyebrow">A LIVING UNIVERSE</span><h2 id="return-title">While you were away</h2><p>${duration(report.seconds)} of progress${report.capped ? '. Your offline horizon was reached; universal laws can extend it.' : '.'}</p></div><button class="icon-button" data-action="dismiss-return" aria-label="Dismiss return summary">\u00d7</button></div>
    <div class="return-resources" aria-label="Net resource changes">${RESOURCE_IDS.filter(id => Math.abs(report.resources[id]) >= 0.01).map(id => `<div class="metric ${report.resources[id] < 0 ? 'loss' : ''}"><span>${id === 'biology' ? 'Biological potential' : id[0].toUpperCase() + id.slice(1)}</span><strong>${signed(report.resources[id])}</strong></div>`).join('')}</div>
    <p class="muted return-note">Resource changes include any spending by automation.</p>
    ${changes.length ? `<ul class="return-changes">${changes.map(change => `<li>${escape(change)}</li>`).join('')}</ul>` : ''}
    ${report.highlights.length ? `<details><summary>Recent moments</summary><ol class="timeline">${report.highlights.map(event => `<li class="${event.severity}"><strong>${escape(event.title)}</strong><p>${escape(event.detail)}</p></li>`).join('')}</ol></details>` : ''}
    <div class="button-row"><button class="action" data-action="dismiss-return">Continue exploring</button><button class="secondary" data-action="return-journal">Open journal</button></div>`;
}
