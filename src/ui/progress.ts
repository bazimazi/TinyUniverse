import { BALANCE } from '../core/config.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import type { CelestialObject, Civilization, Universe } from '../core/types.ts';
import { evolutionRate } from '../simulation/life.ts';
import { researchRate } from '../simulation/civilizations.ts';
import { duration, escape, number } from './format.ts';

export function lifeProgress(state: Universe, object: CelestialObject): string {
  const life = object.life;
  if (!life || life.stage === 'intelligent') return '';
  const previous = life.stage === 'complex' ? BALANCE.life.complexAt : life.stage === 'simple' ? BALANCE.life.simpleAt : 0;
  const target = life.stage === 'complex' ? BALANCE.life.intelligentAt : life.stage === 'simple' ? BALANCE.life.complexAt : BALANCE.life.simpleAt;
  const label = life.stage === 'complex' ? 'Intelligent life' : life.stage === 'simple' ? 'Complex life' : 'First organisms';
  const rate = evolutionRate(state, object), value = Math.max(0, Math.min(target - previous, life.progress - previous));
  return `<div class="progress-heading"><span>Toward ${label.toLowerCase()}</span><strong>${Math.floor(value / (target - previous) * 100)}%</strong></div><progress aria-label="Evolution toward ${label.toLowerCase()}" value="${value}" max="${target - previous}"></progress><p class="estimate">${rate > 0 ? `About ${duration(Math.ceil(Math.max(0, target - life.progress) / rate))} in universe time at current conditions.` : 'Life needs a gentler climate and enough water to evolve.'}</p>`;
}

export function researchProgress(state: Universe, civ: Civilization): string {
  if (!civ.researching || civ.status !== 'active') return '';
  const tech = TECHNOLOGIES[civ.researching], rate = researchRate(state, civ), value = Math.min(tech.cost, civ.researchPoints);
  return `<div class="progress-heading"><span>${escape(tech.name)}</span><strong>${number(value)} / ${number(tech.cost)}</strong></div><progress aria-label="Research progress: ${escape(tech.name)}" value="${value}" max="${tech.cost}"></progress><p class="estimate">${rate > 0 ? `About ${duration(Math.ceil(Math.max(0, tech.cost - value) / rate))} in universe time at current conditions.` : 'Research will resume when conditions improve.'}</p>`;
}

export function affordabilityEstimate(seconds: number | null): string {
  return seconds === 0 ? 'Ready to build' : seconds === null ? 'Needs a source of these resources' : `About ${duration(Math.ceil(seconds))} at 1\u00d7 production`;
}
