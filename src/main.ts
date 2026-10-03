import './style.css';
import { assertUniverse } from './core/invariants.ts';
import { createUniverse } from './core/universe.ts';
import { RESOURCE_IDS } from './core/types.ts';
import type { ExploreKind, LawId, Settings, StructureType, UpgradeId } from './core/types.ts';
import { buyUpgrade, rates } from './simulation/economy.ts';
import { advance } from './simulation/engine.ts';
import { deserialize, load, save, serialize, SAVE_KEY } from './persistence/save.ts';
import { Scene } from './rendering/scene.ts';
import { duration, escape, number } from './ui/format.ts';
import { panelContent, PANEL_LABELS } from './ui/panels.ts';
import { nextGoal } from './ui/goals.ts';
import { worldsForSelection } from './ui/worlds.ts';
import { mineAsteroid, startExploration } from './gameplay/exploration.ts';
import { maximumSpeed, useAbility } from './gameplay/abilities.ts';
import { buildStructure } from './gameplay/megastructures.ts';
import { mediate } from './simulation/advanced.ts';
import { investigate } from './gameplay/discoveries.ts';
import { buyLaw, canRebirth, MODIFIERS, rebirth, rebirthReward } from './gameplay/prestige.ts';
import { automationStatus } from './gameplay/automation.ts';
import { hasTechnology } from './simulation/civilizations.ts';
import { AmbientAudio } from './audio/ambient.ts';
import { catchUp } from './simulation/offline-client.ts';
import { SessionClock } from './simulation/session-clock.ts';
import type { OfflineReport } from './simulation/offline-report.ts';
import { offlineReportContent } from './ui/offline.ts';
import type { Panel } from './ui/panels.ts';

let loaded: ReturnType<typeof load>;
try { loaded = load(localStorage); } catch { loaded = { state: null, warning: 'Browser storage is unavailable. Export your save to keep your progress.', corrupt: true }; }
let state = loaded.state ?? createUniverse();
let savingBlocked = loaded.corrupt;
let panel: Panel = 'develop';
let lastPanel = '';
let lastPanelRender = 0;
let lastInteraction = 0;
let lastRenderedPanel: Panel = 'develop';
document.querySelector('#app')!.innerHTML = '<div class="loading" role="status">Your universe is waking up…</div>';
let offline: OfflineReport | null = null;
if (loaded.state) {
  try { const caught = await catchUp(state, Date.now()); state = caught.state; offline = caught.result; }
  catch (error) { savingBlocked = true; loaded.warning = (error as Error).message; }
} else state.settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let resuming = false;
const sessionClock = new SessionClock(Date.now(), performance.now());
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#panel">Skip to game controls</a>
  <header><a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Tiny Universe home"><span class="brand-icon">✦</span> TINY UNIVERSE</a><button class="icon-button" data-action="tab" data-value="settings" aria-label="Settings">⚙</button></header>
  <div id="resources" class="resources" aria-label="Resource balances">${RESOURCE_IDS.map(id => `<div class="resource ${id}"><span>${id === 'biology' ? 'Biological potential' : id[0].toUpperCase() + id.slice(1)}</span><strong id="amount-${id}">0</strong><small id="rate-${id}">+0 /s</small></div>`).join('')}</div>
  <section id="offline-report" class="return-summary" aria-labelledby="return-title" hidden></section>
  <main><section class="observatory" aria-label="Celestial observatory"><div class="scene-head"><span class="eyebrow">THE UNIVERSE IS WAKING UP</span><span id="age" class="muted"></span></div>
  <canvas id="universe" aria-label="Interactive celestial scene. Use the world list to select objects with a keyboard." role="img"></canvas>
  <div class="scene-controls"><button class="secondary" data-action="view" data-value="planet">Planet</button><button class="secondary" data-action="view" data-value="system">System</button><button class="icon-button" data-action="zoom" data-value="1.2" aria-label="Zoom in">+</button><button class="icon-button" data-action="zoom" data-value="0.8" aria-label="Zoom out">−</button></div><div class="scene-controls"><button class="secondary" data-action="view" data-value="galaxy">Galaxy</button><button class="secondary" data-action="view" data-value="universe">Universe</button></div><div id="time-controls" class="scene-controls" aria-label="Simulation speed"></div>
  <div id="goal" class="goal"></div><div id="worlds" class="worlds" aria-label="Select a celestial object"></div></section>
  <section class="dashboard"><nav aria-label="Game panels">${Object.entries(PANEL_LABELS).map(([id, label]) => `<button data-action="tab" data-value="${id}">${label}</button>`).join('')}</nav><div id="panel"></div></section></main>
  <footer>A little world. A living universe. <span id="save-status">Autosave enabled</span></footer><div id="toast" role="status" aria-live="polite"></div>`;
const scene = new Scene(document.querySelector<HTMLCanvasElement>('#universe')!, id => { if (resuming || !settleLive() || !Object.hasOwn(state.objects, id)) return; state.selectedId = id; lastPanel = ''; render(); persist(); });
const content = document.querySelector<HTMLDivElement>('#panel')!;
content.tabIndex = -1;
const returnSummary = document.querySelector<HTMLElement>('#offline-report')!;
const ambient = new AmbientAudio();
let lastSoundEvent = state.events.at(-1)?.id;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string): void {
  document.querySelector('#toast')!.textContent = message;
  document.querySelector('#toast')!.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => document.querySelector('#toast')!.classList.remove('visible'), 6000);
}
function persist(notify = false): void {
  if (resuming) return;
  if (savingBlocked) { if (notify) toast('Save is protected. Import a backup or choose Start fresh in settings.'); return; }
  try {
    save(localStorage, state);
    document.querySelector('#save-status')!.textContent = 'Universe saved';
    if (notify) toast('Your universe is safely saved.');
  } catch { savingBlocked = true; toast('Unable to save to browser storage. Export your universe to keep it.'); }
}
function showReturn(report: OfflineReport | null): void {
  if (!report || report.seconds <= 5) return;
  returnSummary.innerHTML = offlineReportContent(report);
  returnSummary.hidden = false;
}
async function restoreRuntime(): Promise<void> {
  if (resuming) return;
  resuming = true;
  document.querySelector('#save-status')!.textContent = 'Your universe is catching up…';
  try {
    const caught = await catchUp(state, Date.now());
    state = caught.state;
    sessionClock.reset(state.lastTimestamp, performance.now());
    showReturn(caught.result);
    if (!document.hidden) ambient.configure(state.settings, scene.view);
  } catch (error) { savingBlocked = true; toast((error as Error).message); }
  finally { resuming = false; persist(); lastPanel = ''; render(); }
}
function settleLive(now = performance.now()): boolean {
  if (resuming) return false;
  const timestamp = Date.now(), step = sessionClock.sample(timestamp, now);
  if (step.needsCatchUp) { void restoreRuntime(); return false; }
  advance(state, step.seconds * Math.min(state.speed, maximumSpeed(state)));
  // The timestamp tracks credited time, independently of when an autosave occurs.
  state.lastTimestamp = Math.max(state.lastTimestamp, timestamp);
  return true;
}
function render(): void {
  const production = rates(state);
  document.querySelector<HTMLElement>('.resource.knowledge')!.hidden = Object.keys(state.civilizations).length === 0;
  for (const id of ['exotic', 'stellar', 'quantum'] as const) document.querySelector<HTMLElement>(`.resource.${id}`)!.hidden = state.resources[id] === 0 && production[id] === 0;
  for (const id of RESOURCE_IDS) {
    document.querySelector(`#amount-${id}`)!.textContent = number(state.resources[id]);
    document.querySelector(`#rate-${id}`)!.textContent = `+${number(production[id])} /s`;
  }
  document.querySelector('#age')!.textContent = duration(state.time);
  const speeds = [1, 2, 5, 10, 25, 100].filter(speed => speed <= maximumSpeed(state));
  const controls = document.querySelector('#time-controls')!, speedKey = `${speeds.join(',')}:${state.speed}`;
  if (controls.getAttribute('data-key') !== speedKey) {
    controls.innerHTML = speeds.length > 1 ? speeds.map(speed => `<button class="secondary" data-action="speed" data-value="${speed}" aria-pressed="${state.speed === speed}">${speed}×</button>`).join('') : '';
    controls.setAttribute('data-key', speedKey);
  }
  const goal = nextGoal(state);
  const goalElement = document.querySelector('#goal')!, goalHtml = `<span class="eyebrow">YOUR NEXT SMALL STEP</span><strong>${escape(goal.title)}</strong><p>${escape(goal.detail)}</p><button class="secondary" data-action="goal" data-value="${goal.panel}|${escape(goal.targetId)}">${escape(goal.label)}</button>`;
  if (goalElement.innerHTML !== goalHtml) goalElement.innerHTML = goalHtml;
  const worldList = document.querySelector('#worlds')!;
  const visibleObjects = worldsForSelection(state);
  const worldKey = JSON.stringify(visibleObjects.map(object => [object.id, object.name, object.id === state.selectedId]));
  if (worldList.getAttribute('data-key') !== worldKey) {
    worldList.replaceChildren(...visibleObjects.map(object => {
      const button = document.createElement('button'); button.className = 'world-chip'; button.dataset.action = 'select'; button.dataset.value = object.id;
      button.textContent = `${object.type === 'star' ? '☀' : '◉'} ${object.name}`; button.setAttribute('aria-pressed', String(object.id === state.selectedId)); return button;
    }));
    worldList.setAttribute('data-key', worldKey);
  }
  const refreshPanel = !lastPanel || (performance.now() - lastPanelRender > 1000 && performance.now() - lastInteraction > 500);
  const html = refreshPanel ? panelContent(state, panel) : lastPanel;
  if (html !== lastPanel && !content.contains(document.activeElement?.closest('input, textarea') ?? null)) {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const action = focused?.dataset.action, value = focused?.dataset.value;
    const seedText = document.querySelector<HTMLInputElement>('#rebirth-seed')?.value;
    const openDetails = new Set(lastRenderedPanel === panel ? [...content.querySelectorAll('details')].flatMap((details, index) => details.open ? [details.dataset.detailsKey ?? String(index)] : []) : []);
    content.innerHTML = html; lastPanel = html;
    content.querySelectorAll('details').forEach((details, index) => { details.open = openDetails.has(details.dataset.detailsKey ?? String(index)); });
    const seedInput = document.querySelector<HTMLInputElement>('#rebirth-seed');
    if (seedInput && seedText !== undefined) seedInput.value = seedText;
    lastRenderedPanel = panel;
    lastPanelRender = performance.now();
    if (action) [...content.querySelectorAll<HTMLElement>('[data-action]')].find(el => el.dataset.action === action && el.dataset.value === value)?.focus({ preventScroll: true });
  }
  if (panel === 'prestige') content.querySelectorAll<HTMLElement>('[data-automation-status]').forEach(element => {
    element.textContent = automationStatus(state, element.dataset.automationStatus as keyof typeof state.automation);
  });
  document.querySelectorAll<HTMLButtonElement>('nav button').forEach(button => button.setAttribute('aria-current', button.dataset.value === panel ? 'page' : 'false'));
  const unlocked: Record<Panel, boolean> = { develop: true, explore: state.totalUpgrades >= 2, civilizations: Object.keys(state.civilizations).length > 0, research: Object.keys(state.civilizations).length > 0, influence: state.totalUpgrades >= 3 || Object.keys(state.civilizations).length > 0, atlas: Object.keys(state.systems).length > 1, discoveries: Object.keys(state.discoveries).length > 0, prestige: hasTechnology(state, 'spaceflight') || hasTechnology(state, 'ai') || state.meta.runs > 0, events: true, settings: true };
  document.querySelectorAll<HTMLButtonElement>('nav button').forEach(button => { button.hidden = !unlocked[button.dataset.value as Panel]; });
  document.querySelector<HTMLButtonElement>('[data-action="view"][data-value="galaxy"]')!.hidden = Object.keys(state.systems).length < 2;
  document.querySelector<HTMLButtonElement>('[data-action="view"][data-value="universe"]')!.hidden = Object.keys(state.galaxies).length < 2;
  document.body.classList.toggle('high-contrast', state.settings.highContrast);
  document.body.classList.toggle('large-text', state.settings.largeText);
  document.body.classList.toggle('reduced-motion', state.settings.reducedMotion);
  const newest = state.events.at(-1);
  if (newest && newest.id !== lastSoundEvent) { if (newest.severity === 'wonder') ambient.discovery(state.settings.sound); lastSoundEvent = newest.id; }
}
document.addEventListener('click', async event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  const { action, value = '' } = button.dataset;
  if (resuming || !settleLive()) return;
  if (action === 'tab') panel = value as Panel;
  if (action === 'goal') {
    const [destination, targetId] = value.split('|');
    if (Object.hasOwn(PANEL_LABELS, destination) && Object.hasOwn(state.objects, targetId)) { panel = destination as Panel; state.selectedId = targetId; scene.view = 'planet'; }
  }
  if (action === 'dismiss-return' || action === 'return-journal') returnSummary.hidden = true;
  if (action === 'return-journal') panel = 'events';
  if (action === 'select') state.selectedId = value;
  if (action === 'favorite') state.objects[state.selectedId].favorite = !state.objects[state.selectedId].favorite;
  if (action === 'rename') { const name = window.prompt('Name this world', state.objects[state.selectedId].name)?.trim().slice(0, 40); if (name) state.objects[state.selectedId].name = name; }
  if (action === 'view') scene.view = value as Scene['view'];
  if (action === 'view') ambient.configure(state.settings, scene.view);
  if (action === 'zoom') scene.zoom(Number(value));
  if (action === 'upgrade') toast(buyUpgrade(state, state.selectedId, value as UpgradeId).message);
  if (action === 'explore') toast(startExploration(state, (value || 'orbital') as ExploreKind).message);
  if (action === 'mine') toast(mineAsteroid(state, value).message);
  if (action === 'build') { const [civId, type] = value.split('|'); toast(buildStructure(state, civId, type as StructureType).message); }
  if (action === 'mediate') toast(mediate(state, value).message);
  if (action === 'investigate') { const [id, choice] = value.split('|'); toast(investigate(state, id, (choice || null) as 'preserve' | 'decode' | null).message); }
  if (action === 'law') toast(buyLaw(state, value as LawId).message);
  if (action === 'rebirth' && canRebirth(state) && window.confirm(`Rebirth this universe for ${rebirthReward(state)} Cosmic Knowledge? Worlds, civilizations and local resources reset. Discoveries, artifacts, achievements, records and laws remain.`)) {
    try { const seed = document.querySelector<HTMLInputElement>('#rebirth-seed')?.value; state = rebirth(state, seed ? Number(seed) : undefined); sessionClock.reset(state.lastTimestamp, performance.now()); returnSummary.hidden = true; scene.view = 'planet'; panel = 'develop'; persist(); toast('A new universe is waking up.'); } catch (error) { toast((error as Error).message); }
  }
  if (action === 'ability') toast(useAbility(state, value, state.selectedId).message);
  if (action === 'speed') state.speed = Math.min(maximumSpeed(state), Number(value));
  if (action === 'debug' && import.meta.env.DEV) { const { debugAction } = await import('./gameplay/debug.ts'); toast(debugAction(state, value).message); }
  if (action === 'follow' && state.civilizations[value]) state.civilizations[value].followed = !state.civilizations[value].followed;
  if (action === 'save') persist(true);
  if (action === 'export') {
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([serialize(state)], { type: 'application/json' }));
    link.download = `tiny-universe-${state.seed}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast('Save exported. Keep it somewhere safe.');
  }
  if (action === 'reset' && window.confirm('Start a new universe? Current progress will be replaced. Export a save first to keep it.')) {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) localStorage.setItem(`${SAVE_KEY}.archive`, raw); } catch { /* Exports remain available. */ }
    state = createUniverse(); sessionClock.reset(state.lastTimestamp, performance.now()); returnSummary.hidden = true; scene.view = 'planet'; savingBlocked = false; persist(true);
  }
  if (['goal', 'select', 'favorite', 'rename', 'upgrade', 'explore', 'mine', 'build', 'mediate', 'investigate', 'law', 'ability', 'speed', 'debug', 'follow'].includes(action!)) persist();
  lastPanel = ''; render();
  if (action === 'tab' || action === 'goal' || action === 'return-journal') {
    document.querySelector('nav button[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    if (action !== 'tab' || window.matchMedia('(max-width: 800px)').matches) content.scrollIntoView({ behavior: state.settings.reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }
  if (state.settings.haptics) navigator.vibrate?.(10);
});
document.addEventListener('change', async event => {
  if (resuming || !settleLive()) return;
  const input = event.target as HTMLInputElement;
  if (input.id === 'rebirth-seed') return;
  if (input.dataset.setting) { state.settings[input.dataset.setting as keyof Settings] = input.checked; ambient.configure(state.settings, scene.view); persist(); }
  if (input.dataset.automation && hasTechnology(state, 'ai')) { state.automation[input.dataset.automation as keyof typeof state.automation] = input.checked; persist(); }
  if (input.dataset.modifier && MODIFIERS[input.dataset.modifier] && MODIFIERS[input.dataset.modifier].runs <= state.meta.runs + 1) {
    const id = input.dataset.modifier;
    if (input.checked && state.meta.nextModifiers.length < 2) state.meta.nextModifiers.push(id);
    else { state.meta.nextModifiers = state.meta.nextModifiers.filter(value => value !== id); input.checked = false; }
    persist();
  }
  if (input.id === 'import-file' && input.files?.[0]) {
    resuming = true;
    try {
      const imported = deserialize(await input.files[0].text());
      if (!window.confirm('Replace your current universe with this save?')) return;
      const caught = await catchUp(imported, Date.now());
      state = caught.state; sessionClock.reset(state.lastTimestamp, performance.now()); returnSummary.hidden = true; showReturn(caught.result);
      scene.view = 'planet'; savingBlocked = false; resuming = false; persist(); toast('Your universe has been restored.');
    } catch (error) { toast(error instanceof Error ? error.message : 'Unable to read save.'); }
    finally { resuming = false; }
  }
  lastPanel = ''; render();
});
let lastRender = 0;
document.addEventListener('pointerdown', () => { lastInteraction = performance.now(); ambient.configure(state.settings, scene.view); }, { passive: true });
document.addEventListener('keydown', () => { lastInteraction = performance.now(); });
function frame(now: number): void {
  if (!document.hidden) {
    settleLive(now);
    if (now - lastRender > 250) { render(); lastRender = now; }
    scene.draw(state);
  }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { settleLive(); persist(); ambient.suspend(); }
  else void restoreRuntime();
});
window.addEventListener('pagehide', () => { settleLive(); persist(); });
setInterval(() => persist(), 15000);
if (import.meta.env.DEV) setInterval(() => assertUniverse(state), 5000);
render(); showReturn(offline); persist(); requestAnimationFrame(frame);
if (loaded.warning) toast(loaded.warning);
if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* Idle saves still work without an installed offline cache. */ });
