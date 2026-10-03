import { BALANCE, UPGRADES } from '../core/config.ts';
import { selectedObject } from '../core/universe.ts';
import { canAfford, rates, timeToAfford, upgradeCost } from '../simulation/economy.ts';
import { costText, duration, escape } from './format.ts';
import type { Universe, UpgradeId } from '../core/types.ts';
import { civilizationPanel, researchPanel } from './civilizations.ts';
import { influencePanel } from './influence.ts';
import { explorationPanel } from './exploration.ts';
import { atlasPanel } from './atlas.ts';
import { advancedPanel } from './advanced.ts';
import { discoveriesPanel } from './discoveries.ts';
import { offlineCap } from '../core/meta.ts';
import { affordabilityEstimate, lifeProgress } from './progress.ts';
import { journalPanel } from './journal.ts';
import { prestigePanel } from './prestige.ts';
import { stellarActivityPanel } from './stellar.ts';
export type Panel = 'develop' | 'explore' | 'civilizations' | 'research' | 'influence' | 'atlas' | 'discoveries' | 'prestige' | 'events' | 'settings';
export const PANEL_LABELS: Record<Panel, string> = { develop: 'Develop', explore: 'Explore', civilizations: 'Life', research: 'Research', influence: 'Influence', atlas: 'Atlas', discoveries: 'Discoveries', prestige: 'Rebirth', events: 'Journal', settings: 'Settings' };
export function button(label: string, action: string, value = '', disabled = false, secondary = false): string {
  return `<button class="${secondary ? 'secondary' : 'action'}" data-action="${action}" data-value="${escape(value)}" ${disabled ? 'disabled' : ''}>${escape(label)}</button>`;
}
export function metric(label: string, value: string): string { return `<div class="metric"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`; }
export function panelContent(state: Universe, panel: Panel): string {
  const object = selectedObject(state);
  if (panel === 'prestige') return prestigePanel(state);
  if (panel === 'discoveries') return discoveriesPanel(state);
  if (panel === 'atlas') return atlasPanel(state);
  if (panel === 'influence') return influencePanel(state);
  if (panel === 'civilizations') return civilizationPanel(state) + advancedPanel(state);
  if (panel === 'research') return researchPanel(state);
  if (panel === 'explore') return explorationPanel(state);
  if (panel === 'develop') {
    const production = rates(state);
    if (!object.planet) return `<h2>${escape(object.name)}</h2><p>${object.type.replace('-', ' ')} · ${object.stellar ? `${object.stellar.class}, ${object.stellar.stage}. Fuel remaining ${Math.round(object.stellar.fuel * 100)}%. Luminosity ${object.stellar.luminosity.toFixed(2)} solar units.` : 'A small piece of your universe.'}</p>${stellarActivityPanel(state)}<p>Select a planet to develop its environment.</p>`;
    return `<div class="eyebrow">YOUR FIRST WORLD</div><h2>${escape(object.name)}</h2><p class="muted">Small beginnings. Endless possibilities.</p>
      ${stellarActivityPanel(state)}<div class="metrics">${metric('Habitability', `${Math.round(object.planet.habitability * 100)}%`)}${metric('Water coverage', `${Math.round(object.planet.water * 100)}%`)}${metric('Atmosphere', `${Math.round(object.planet.atmosphere * 100)}%`)}${metric('Age', duration(state.time - object.createdAt))}</div>
      <article class="card"><div class="card-title"><strong>${object.life?.stage === 'chemistry' ? 'The chemistry of possibility' : object.life?.stage === 'simple' ? 'A primitive ecosystem' : object.life?.stage === 'complex' ? 'An explosion of life' : 'Intelligent life'}</strong><span class="badge">${object.life?.species ?? 0} species</span></div><p>Biodiversity ${Math.round(object.planet.biodiversity * 100)}% · ${Math.round(object.planet.temperature - 273.15)}°C</p>${lifeProgress(state, object)}${object.life ? `<div class="ecosystem">${Object.entries(object.life.populations).map(([key, value]) => `<div><span>${key}</span><meter aria-label="${key} abundance" min="0" max="1" value="${value}"></meter></div>`).join('')}</div>` : ''}</article>
      <h3>Give your world a little care</h3><div class="cards">${(Object.keys(UPGRADES) as UpgradeId[]).map(id => {
        const upgrade = UPGRADES[id], cost = upgradeCost(object, id), level = object.upgrades[id];
        return `<article class="card"><div class="card-title"><strong>${upgrade.name}</strong><span class="badge">${level}/${BALANCE.maxUpgrade}</span></div><p>${upgrade.description}</p>${button(level >= BALANCE.maxUpgrade ? 'Complete' : costText(cost), 'upgrade', id, level >= BALANCE.maxUpgrade || !canAfford(state, cost))}${level < BALANCE.maxUpgrade ? `<p class="estimate">${affordabilityEstimate(timeToAfford(state, cost, production))}</p>` : ''}</article>`;
      }).join('')}</div>`;
  }
  if (panel === 'events') return journalPanel(state);
  return `<div class="eyebrow">MAKE SPACE YOUR OWN</div><h2>Settings & saves</h2><div class="cards">
    <article class="card"><h3>${escape(object.name)}</h3><div class="button-row">${button('Rename', 'rename', '', false, true)}${button(object.favorite ? 'Favorited' : 'Favorite', 'favorite', '', false, true)}</div></article><article class="card"><h3>Accessibility</h3>${(['reducedMotion', 'highContrast', 'largeText', 'sound', 'music', 'haptics'] as const).map(id => `<label class="toggle"><input type="checkbox" data-setting="${id}" ${state.settings[id] ? 'checked' : ''}>${({ reducedMotion: 'Reduced motion', highContrast: 'High contrast', largeText: 'Large text', sound: 'Discovery sounds', music: 'Ambient music', haptics: 'Haptics' })[id]}</label>`).join('')}</article>
    <article class="card"><h3>Your universe</h3><p>Seed ${state.seed} · ${duration(state.time)} old. Progress continues for up to ${duration(offlineCap(state))} while you are away. Live time controls accelerate active play.</p><div class="button-row">${button('Save now', 'save')}${button('Export save', 'export', '', false, true)}</div><label class="file-label">Import a save<input id="import-file" type="file" accept=".json,application/json"></label><p class="muted">Import replaces the current universe after a valid save is checked.</p>${button('Start fresh', 'reset', '', false, true)}</article>
  ${import.meta.env?.DEV ? `<article class="card"><details><summary>Developer tools</summary><p>Selected: ${escape(object.id)} · ${object.type} · mass ${object.mass.toFixed(2)} · time ${duration(state.time)}</p><div class="button-row">${[['resources', 'Add resources'], ['time', 'Advance 1h'], ['planet', 'Spawn planet'], ['civilization', 'Spawn civilization'], ['technology', 'Unlock technology'], ['kill', 'Collapse civilization'], ['event', 'Trigger event']].map(([value, label]) => button(label, 'debug', value, false, true)).join('')}</div><pre>${escape(JSON.stringify({ id: object.id, parent: object.parentId, orbit: object.orbit, environment: object.planet }, null, 2))}</pre></details></article>` : ''}</div>`;
}
