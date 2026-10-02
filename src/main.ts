import './style.css';
import { assertUniverse } from './core/invariants.ts';
import { createUniverse } from './core/universe.ts';
import { RESOURCE_IDS } from './core/types.ts';
import type { ExploreKind, Settings, StructureType, UpgradeId } from './core/types.ts';
import { buyUpgrade, rates } from './simulation/economy.ts';
import { advance, resumeOffline } from './simulation/engine.ts';
import { deserialize, load, save, serialize, SAVE_KEY } from './persistence/save.ts';
import { Scene } from './rendering/scene.ts';
import { duration, number } from './ui/format.ts';
import { nextGoal, panelContent, PANEL_LABELS } from './ui/panels.ts';
import { mineAsteroid, startExploration } from './gameplay/exploration.ts';
import { maximumSpeed, useAbility } from './gameplay/abilities.ts';
import { buildStructure } from './gameplay/megastructures.ts';
import { mediate } from './simulation/advanced.ts';
import type { Panel } from './ui/panels.ts';

let loaded: ReturnType<typeof load>;
try { loaded = load(localStorage); } catch { loaded = { state: null, warning: 'Browser storage is unavailable. Export your save to keep your progress.', corrupt: true }; }
let state = loaded.state ?? createUniverse();
let savingBlocked = loaded.corrupt;
let panel: Panel = 'develop';
let lastPanel = '';
const offline = loaded.state ? resumeOffline(state, Date.now()) : { seconds: 0, capped: false };
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><a class="brand" href="/" aria-label="Tiny Universe home"><span class="brand-icon">✦</span> TINY UNIVERSE</a><button class="icon-button" data-action="tab" data-value="settings" aria-label="Settings">⚙</button></header>
  <div id="resources" class="resources" aria-label="Resource balances">${RESOURCE_IDS.map(id => `<div class="resource ${id}"><span>${id === 'biology' ? 'Biological potential' : id[0].toUpperCase() + id.slice(1)}</span><strong id="amount-${id}">0</strong><small id="rate-${id}">+0 /s</small></div>`).join('')}</div>
  <main><section class="observatory" aria-label="Celestial observatory"><div class="scene-head"><span class="eyebrow">THE UNIVERSE IS WAKING UP</span><span id="age" class="muted"></span></div>
  <canvas id="universe" aria-label="Interactive celestial scene. Use the world list to select objects with a keyboard." role="img"></canvas>
  <div class="scene-controls"><button class="secondary" data-action="view" data-value="planet">Planet</button><button class="secondary" data-action="view" data-value="system">System</button><button class="icon-button" data-action="zoom" data-value="1.2" aria-label="Zoom in">+</button><button class="icon-button" data-action="zoom" data-value="0.8" aria-label="Zoom out">−</button></div><div class="scene-controls"><button class="secondary" data-action="view" data-value="galaxy">Galaxy</button><button class="secondary" data-action="view" data-value="universe">Universe</button></div><div id="time-controls" class="scene-controls" aria-label="Simulation speed"></div>
  <div id="goal" class="goal"></div><div id="worlds" class="worlds" aria-label="Select a celestial object"></div></section>
  <section class="dashboard"><nav aria-label="Game panels">${Object.entries(PANEL_LABELS).map(([id, label]) => `<button data-action="tab" data-value="${id}">${label}</button>`).join('')}</nav><div id="panel"></div></section></main>
  <footer>A little world. A living universe. <span id="save-status">Autosave enabled</span></footer><div id="toast" role="status" aria-live="polite"></div>`;
const scene = new Scene(document.querySelector<HTMLCanvasElement>('#universe')!, id => { state.selectedId = id; lastPanel = ''; render(); });
const content = document.querySelector<HTMLDivElement>('#panel')!;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string): void {
  document.querySelector('#toast')!.textContent = message;
  document.querySelector('#toast')!.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => document.querySelector('#toast')!.classList.remove('visible'), 6000);
}
function persist(notify = false): void {
  if (savingBlocked) { if (notify) toast('Save is protected. Import a backup or choose Start fresh in settings.'); return; }
  try {
    state.lastTimestamp = Math.max(state.lastTimestamp, Date.now());
    save(localStorage, state);
    document.querySelector('#save-status')!.textContent = 'Universe saved';
    if (notify) toast('Your universe is safely saved.');
  } catch { savingBlocked = true; toast('Unable to save to browser storage. Export your universe to keep it.'); }
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
  const speeds = [1, 2, 5, 10, 25].filter(speed => speed <= maximumSpeed(state));
  const controls = document.querySelector('#time-controls')!, speedKey = `${speeds.join(',')}:${state.speed}`;
  if (controls.getAttribute('data-key') !== speedKey) {
    controls.innerHTML = speeds.length > 1 ? speeds.map(speed => `<button class="secondary" data-action="speed" data-value="${speed}" aria-pressed="${state.speed === speed}">${speed}×</button>`).join('') : '';
    controls.setAttribute('data-key', speedKey);
  }
  const goal = nextGoal(state);
  document.querySelector('#goal')!.innerHTML = `<span class="eyebrow">YOUR NEXT SMALL STEP</span><strong>${goal.title}</strong><p>${goal.detail}</p>`;
  const worldList = document.querySelector('#worlds')!;
  const visibleObjects = Object.values(state.objects).filter(object => object.systemId === state.objects[state.selectedId].systemId || object.favorite).slice(0, 40);
  const worldKey = visibleObjects.map(object => `${object.id}:${object.name}:${object.id === state.selectedId}`).join('|');
  if (worldList.getAttribute('data-key') !== worldKey) {
    worldList.replaceChildren(...visibleObjects.map(object => {
      const button = document.createElement('button'); button.className = 'world-chip'; button.dataset.action = 'select'; button.dataset.value = object.id;
      button.textContent = `${object.type === 'star' ? '☀' : '◉'} ${object.name}`; button.setAttribute('aria-pressed', String(object.id === state.selectedId)); return button;
    }));
    worldList.setAttribute('data-key', worldKey);
  }
  const html = panelContent(state, panel);
  if (html !== lastPanel && !content.contains(document.activeElement?.closest('input, textarea') ?? null)) {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const action = focused?.dataset.action, value = focused?.dataset.value;
    content.innerHTML = html; lastPanel = html;
    if (action) [...content.querySelectorAll<HTMLElement>('[data-action]')].find(el => el.dataset.action === action && el.dataset.value === value)?.focus({ preventScroll: true });
  }
  document.querySelectorAll<HTMLButtonElement>('nav button').forEach(button => button.setAttribute('aria-current', button.dataset.value === panel ? 'page' : 'false'));
  document.body.classList.toggle('high-contrast', state.settings.highContrast);
  document.body.classList.toggle('large-text', state.settings.largeText);
  document.body.classList.toggle('reduced-motion', state.settings.reducedMotion);
}
document.addEventListener('click', async event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  const { action, value = '' } = button.dataset;
  if (action === 'tab') panel = value as Panel;
  if (action === 'select') state.selectedId = value;
  if (action === 'view') scene.view = value as Scene['view'];
  if (action === 'zoom') scene.zoom(Number(value));
  if (action === 'upgrade') toast(buyUpgrade(state, state.selectedId, value as UpgradeId).message);
  if (action === 'explore') toast(startExploration(state, (value || 'orbital') as ExploreKind).message);
  if (action === 'mine') toast(mineAsteroid(state, value).message);
  if (action === 'build') { const [civId, type] = value.split('|'); toast(buildStructure(state, civId, type as StructureType).message); }
  if (action === 'mediate') toast(mediate(state, value).message);
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
    state = createUniverse(); savingBlocked = false; persist(true);
  }
  lastPanel = ''; render();
});
document.addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  if (input.dataset.setting) { state.settings[input.dataset.setting as keyof Settings] = input.checked; persist(); }
  if (input.id === 'import-file' && input.files?.[0]) {
    try {
      const imported = deserialize(await input.files[0].text());
      if (!window.confirm('Replace your current universe with this save?')) return;
      state = imported; resumeOffline(state, Date.now()); savingBlocked = false; persist(); toast('Your universe has been restored.');
    } catch (error) { toast(error instanceof Error ? error.message : 'Unable to read save.'); }
  }
  lastPanel = ''; render();
});
let previous = performance.now(), lastRender = 0;
function frame(now: number): void {
  if (!document.hidden) {
    advance(state, Math.max(0, (now - previous) / 1000) * state.speed);
    if (now - lastRender > 250) { render(); lastRender = now; }
    scene.draw(state);
  }
  previous = now; requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) persist();
  else { const result = resumeOffline(state, Date.now()); previous = performance.now(); if (result.seconds > 5) toast(`Welcome back. Your universe evolved for ${duration(result.seconds)}.`); render(); }
});
window.addEventListener('pagehide', () => persist());
setInterval(() => persist(), 15000);
if (import.meta.env.DEV) setInterval(() => assertUniverse(state), 5000);
render(); requestAnimationFrame(frame);
if (loaded.warning) toast(loaded.warning);
else if (offline.seconds > 5) toast(`Welcome back. ${duration(offline.seconds)} of progress${offline.capped ? ' (offline cap reached)' : ''}.`);
