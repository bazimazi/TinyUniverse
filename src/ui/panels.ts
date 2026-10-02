import { BALANCE, UPGRADES } from '../core/config.ts';
import { selectedObject } from '../core/universe.ts';
import { canAfford, upgradeCost } from '../simulation/economy.ts';
import { costText, duration, escape } from './format.ts';
import type { Universe, UpgradeId } from '../core/types.ts';
import { civilizationPanel, researchPanel } from './civilizations.ts';
export type Panel = 'develop' | 'explore' | 'civilizations' | 'research' | 'events' | 'settings';
export const PANEL_LABELS: Record<Panel, string> = { develop: 'Develop', explore: 'Explore', civilizations: 'Life', research: 'Research', events: 'Journal', settings: 'Settings' };
export function button(label: string, action: string, value = '', disabled = false, secondary = false): string {
  return `<button class="${secondary ? 'secondary' : 'action'}" data-action="${action}" data-value="${escape(value)}" ${disabled ? 'disabled' : ''}>${escape(label)}</button>`;
}
export function metric(label: string, value: string): string { return `<div class="metric"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`; }
export function panelContent(state: Universe, panel: Panel): string {
  const object = selectedObject(state);
  if (panel === 'civilizations') return civilizationPanel(state);
  if (panel === 'research') return researchPanel(state);
  if (panel === 'explore') {
    const job = state.exploration.job;
    return `<div class="eyebrow">WHAT LIES JUST BEYOND?</div><h2>A little farther</h2><p>Survey nearby space. Discover moons, new worlds and asteroids. Each expedition continues while you are away.</p><article class="card"><h3>Orbital expedition</h3><p>${state.totalUpgrades < 2 ? 'Build two upgrades to launch your first probe.' : 'The next signal might be a companion world, a new planet, or a rich asteroid.'}</p>${job ? `<progress aria-label="Expedition progress" value="${state.time - job.startedAt}" max="${job.endsAt - job.startedAt}"></progress><p>Returning in ${duration(Math.max(0, job.endsAt - state.time))}</p>` : button(`Launch · ${costText(BALANCE.exploration.cost)}`, 'explore', '', state.totalUpgrades < 2 || !canAfford(state, BALANCE.exploration.cost))}</article><h3>Your discoveries</h3><div class="cards">${Object.values(state.objects).filter(o => o.id !== 'planet-0' && o.type !== 'star').map(o => `<article class="card"><div class="card-title"><strong>${escape(o.name)}</strong><span class="badge">${o.type}</span></div><p>${o.type === 'moon' ? 'Tides and a steadier climate for its parent world.' : o.type === 'asteroid' ? `${o.mined ? 'Mining outpost active' : 'An untouched deposit'} · ${Math.floor(o.deposit)} minerals` : 'A new world to develop.'}</p><div class="button-row">${button('Observe', 'select', o.id, false, true)}${o.type === 'asteroid' && !o.mined ? button('Mine · 60 energy / 25 matter', 'mine', o.id, !canAfford(state, { energy: 60, matter: 25 })) : ''}</div></article>`).join('') || '<p>Your probe has yet to discover another body.</p>'}</div>`;
  }
  if (panel === 'develop') {
    if (!object.planet) return `<h2>${escape(object.name)}</h2><p>A steady light for the worlds around it. Select a planet to begin developing.</p>`;
    return `<div class="eyebrow">YOUR FIRST WORLD</div><h2>${escape(object.name)}</h2><p class="muted">Small beginnings. Endless possibilities.</p>
      <div class="metrics">${metric('Habitability', `${Math.round(object.planet.habitability * 100)}%`)}${metric('Water coverage', `${Math.round(object.planet.water * 100)}%`)}${metric('Atmosphere', `${Math.round(object.planet.atmosphere * 100)}%`)}${metric('Age', duration(state.time - object.createdAt))}</div>
      <article class="card"><div class="card-title"><strong>${object.life?.stage === 'chemistry' ? 'The chemistry of possibility' : object.life?.stage === 'simple' ? 'A primitive ecosystem' : object.life?.stage === 'complex' ? 'An explosion of life' : 'Intelligent life'}</strong><span class="badge">${object.life?.species ?? 0} species</span></div><p>Biodiversity ${Math.round(object.planet.biodiversity * 100)}% · ${Math.round(object.planet.temperature - 273.15)}°C</p>${object.life ? `<div class="ecosystem">${Object.entries(object.life.populations).map(([key, value]) => `<div><span>${key}</span><meter aria-label="${key} abundance" min="0" max="1" value="${value}"></meter></div>`).join('')}</div>` : ''}</article>
      <h3>Give your world a little care</h3><div class="cards">${(Object.keys(UPGRADES) as UpgradeId[]).map(id => {
        const upgrade = UPGRADES[id], cost = upgradeCost(object, id), level = object.upgrades[id];
        return `<article class="card"><div class="card-title"><strong>${upgrade.name}</strong><span class="badge">${level}/${BALANCE.maxUpgrade}</span></div><p>${upgrade.description}</p>${button(level >= BALANCE.maxUpgrade ? 'Complete' : costText(cost), 'upgrade', id, level >= BALANCE.maxUpgrade || !canAfford(state, cost))}</article>`;
      }).join('')}</div>`;
  }
  if (panel === 'events') return `<div class="eyebrow">A HISTORY IN THE MAKING</div><h2>Universe journal</h2>${state.events.length ? `<ol class="timeline">${[...state.events].reverse().slice(0, 50).map(event => `<li class="${event.severity}"><small>${duration(event.time)}</small><strong>${escape(event.title)}</strong><p>${escape(event.detail)}</p></li>`).join('')}</ol>` : '<p>Your universe is young. Its story begins with your first upgrade.</p>'}`;
  return `<div class="eyebrow">MAKE SPACE YOUR OWN</div><h2>Settings & saves</h2><div class="cards">
    <article class="card"><h3>Accessibility</h3>${(['reducedMotion', 'highContrast', 'largeText', 'sound'] as const).map(id => `<label class="toggle"><input type="checkbox" data-setting="${id}" ${state.settings[id] ? 'checked' : ''}>${({ reducedMotion: 'Reduced motion', highContrast: 'High contrast', largeText: 'Large text', sound: 'Sound' })[id]}</label>`).join('')}</article>
    <article class="card"><h3>Your universe</h3><p>Seed ${state.seed} · ${duration(state.time)} old. Progress continues for up to 24 hours while you are away.</p><div class="button-row">${button('Save now', 'save')}${button('Export save', 'export', '', false, true)}</div><label class="file-label">Import a save<input id="import-file" type="file" accept=".json,application/json"></label><p class="muted">Import replaces the current universe after a valid save is checked.</p>${button('Start fresh', 'reset', '', false, true)}</article>
  </div>`;
}
export function nextGoal(state: Universe): { title: string; detail: string } {
  if (state.totalUpgrades === 0) return { title: 'Catch your first starlight', detail: 'Buy Solar collection below. Your planet will produce more energy.' };
  if (state.objects['planet-0'].planet!.habitability < 0.7) return { title: 'Make room for complex life', detail: 'Stabilize the atmosphere and expand the oceans to reach 70% habitability.' };
  if (state.exploration.completed.orbital === 0) return { title: 'Find your first companion', detail: 'Open Explore and send a probe beyond your world.' };
  return { title: 'A world of possibilities', detail: 'Build a thriving ecosystem. Your universe keeps growing while you are away.' };
}
