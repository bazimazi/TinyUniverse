import { BALANCE, DISCOVERY_BALANCE, SAVE_VERSION, STELLAR_BALANCE } from './config.ts';
import { TECHNOLOGIES } from './technology.ts';
import type { GameEvent, Universe } from './types.ts';
import { ANOMALY_KINDS } from './types.ts';
const finite = (value: unknown, min = 0, max = 1e100): boolean => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const text = (value: unknown, max = 160): boolean => typeof value === 'string' && value.length > 0 && value.length <= max;
const record = (value: unknown): boolean => value !== null && typeof value === 'object' && !Array.isArray(value);
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Invalid save: ${message}.`); }
function history(events: GameEvent[], max: number): void {
  check(Array.isArray(events) && events.length <= max, 'history length');
  for (const event of events) check(record(event) && text(event.id, 300) && text(event.type) && text(event.targetId) && finite(event.time) && text(event.title, 250) && typeof event.detail === 'string' && event.detail.length <= 2000 && ['info', 'wonder', 'danger'].includes(event.severity), 'event record');
}
export function validateDetails(state: Universe): void {
  check(Number.isInteger(state.version) && state.version >= 1 && state.version <= SAVE_VERSION, 'version');
  check(Number.isInteger(state.seed) && finite(state.seed, 0, 4294967295) && finite(state.time, 0, 1e13), 'seed or simulation time');
  check(Number.isInteger(state.totalUpgrades) && finite(state.totalUpgrades), 'upgrade count');
  check(record(state.settings) && ['reducedMotion', 'highContrast', 'largeText', 'sound', 'music', 'haptics'].every(key => typeof state.settings[key as keyof typeof state.settings] === 'boolean'), 'settings');
  check(record(state.objects) && Object.keys(state.objects).length <= BALANCE.maxObjects && Object.hasOwn(state.objects, state.selectedId), 'selection or entity count');
  check(record(state.systems) && record(state.galaxies), 'universe hierarchy');
  for (const [id, system] of Object.entries(state.systems)) check(record(system) && id === system.id && text(system.name, 80) && Object.hasOwn(state.objects, system.starId) && Object.hasOwn(state.galaxies, system.galaxyId) && finite(system.seed) && finite(system.position?.x, -1e6, 1e6) && finite(system.position?.y, -1e6, 1e6), 'system');
  for (const [id, galaxy] of Object.entries(state.galaxies)) check(record(galaxy) && id === galaxy.id && text(galaxy.name, 80) && Number.isInteger(galaxy.totalSystems) && finite(galaxy.totalSystems, 1) && finite(galaxy.surveyed, 0, galaxy.totalSystems) && finite(galaxy.lastUpdate, 0, state.time), 'galaxy');
  history(state.events, BALANCE.maxEvents);
  for (const object of Object.values(state.objects)) {
    check(text(object.id) && /^[a-zA-Z0-9_.:-]+$/.test(object.id) && finite(object.seed, 0, 4294967295) && finite(object.createdAt, 0, state.time) && finite(object.lastLifeUpdate, 0, state.time) && finite(object.shieldUntil) && typeof object.favorite === 'boolean' && typeof object.mined === 'boolean' && finite(object.deposit) && /^#[0-9a-f]{6}$/i.test(object.color), 'celestial metadata');
    check(Object.values(object.upgrades).every(value => Number.isInteger(value) && finite(value, 0, BALANCE.maxUpgrade)), 'upgrade level');
    check(object.children.length === new Set(object.children).size && object.children.every(id => Object.hasOwn(state.objects, id) && state.objects[id].parentId === object.id), 'child links');
    if (object.parentId) check(Object.hasOwn(state.objects, object.parentId) && state.objects[object.parentId].children.includes(object.id) && state.objects[object.parentId].systemId === object.systemId, 'parent links');
    if (object.planet) {
      check(object.type === 'planet' && finite(object.planet.temperature, 1, 10000) && ['atmosphere', 'water', 'magneticField', 'habitability', 'biodiversity'].every(key => finite(object.planet![key as keyof typeof object.planet], 0, 1)) && finite(object.planet.gravity, 0.01, 100), 'planet environment');
      const life = object.life;
      check(life && record(life.populations) && ['microorganisms', 'plants', 'herbivores', 'predators', 'aquatic', 'flying'].every(key => finite(life.populations[key as keyof typeof life.populations], 0, 1)), 'food web');
    } else check(object.type !== 'planet', 'missing planet environment');
    if (object.stellar) check(['red-dwarf', 'yellow', 'blue'].includes(object.stellar.class) && ['main-sequence', 'giant', 'remnant'].includes(object.stellar.stage) && finite(object.stellar.fuel, 0, 1) && finite(object.stellar.lifespan, 1) && finite(object.stellar.solarMass, 0.01) && finite(object.stellar.luminosity, 0.001) && finite(object.stellar.spin, 0, 1), 'stellar evolution');
    if (object.stellar) check(finite(object.stellar.lastActivityAt, object.createdAt, state.time) && finite(object.stellar.suppressedUntil) && (object.stellar.flareAt === null || object.stellar.stage !== 'remnant' && finite(object.stellar.flareAt, state.time, state.time + STELLAR_BALANCE.flareWarning)), 'stellar activity');
  }
  check(record(state.exploration.completed) && ['orbital', 'interstellar', 'galactic'].every(key => Number.isInteger(state.exploration.completed[key as keyof typeof state.exploration.completed]) && finite(state.exploration.completed[key as keyof typeof state.exploration.completed])), 'exploration totals');
  for (const [id, civ] of Object.entries(state.civilizations)) {
    check(civ.id === id && text(civ.name, 80) && text(civ.culture, 80) && text(civ.government, 80) && Array.isArray(civ.traits) && civ.traits.every(t => text(t, 40)) && record(civ.domains) && ['biology', 'physics', 'energy', 'computing', 'materials', 'space', 'social', 'gravity', 'quantum'].every(key => finite(civ.domains[key as keyof typeof civ.domains], 0.01, 100)), 'civilization identity');
    check(finite(civ.industry) && finite(civ.knowledge) && finite(civ.distress) && finite(civ.supportUntil) && finite(civ.lastUpdate, 0, state.time) && finite(civ.foundedAt, 0, state.time) && ['seekers', 'stewards', 'builders', 'conquerors'].includes(civ.archetype) && typeof civ.followed === 'boolean', 'civilization progression');
    check(civ.technologies.every(id => Object.hasOwn(TECHNOLOGIES, id)) && new Set(civ.technologies).size === civ.technologies.length && (civ.researching === null || Object.hasOwn(TECHNOLOGIES, civ.researching)) && Array.isArray(civ.colonies) && civ.colonies.every(id => !!state.objects[id]?.planet), 'research or colonies');
    history(civ.timeline, 100);
  }
  for (const relation of Object.values(state.relations)) check(Object.hasOwn(state.civilizations, relation.a) && Object.hasOwn(state.civilizations, relation.b) && finite(relation.score, -100, 100) && ['neutral', 'trade', 'alliance', 'war'].includes(relation.status) && finite(relation.lastUpdate, 0, state.time), 'diplomacy');
  for (const [id, s] of Object.entries(state.megastructures)) check(id === s.id && ['habitat', 'dyson', 'wormhole', 'black-hole-generator'].includes(s.type) && Object.hasOwn(state.civilizations, s.civilizationId) && Object.hasOwn(state.systems, s.systemId) && ['building', 'complete'].includes(s.status) && finite(s.startedAt, 0, state.time) && finite(s.endsAt, s.startedAt), 'construction');
  check(record(state.anomalies) && Object.keys(state.anomalies).length <= DISCOVERY_BALANCE.maxAnomalies, 'signal archive size');
  for (const [id, a] of Object.entries(state.anomalies)) {
    check(id === a.id && Object.hasOwn(state.objects, a.targetId) && finite(a.seed, 0, 4294967295) && [0, 1, 3].includes(a.stage) && ANOMALY_KINDS.includes(a.kind) && ['found', 'choice', 'resolved', 'investigating'].includes(a.status) && [null, 'preserve', 'decode'].includes(a.choice) && (a.status === 'investigating' ? finite(a.nextAt, state.time) : a.nextAt === null), 'anomaly deadline');
    check(a.status === 'found' ? a.stage === 0 && a.choice === null : a.status === 'choice' ? a.stage === 1 && a.choice === null : a.status === 'resolved' ? a.stage === 3 && a.choice !== null : a.stage === 0 && a.choice === null || a.stage === 1 && a.choice !== null, 'investigation stage');
  }
  for (const [id, d] of Object.entries(state.discoveries)) check(id === d.id && text(d.title, 200) && text(d.sourceId) && typeof d.detail === 'string' && d.detail.length <= 2000 && finite(d.time) && finite(d.rarity, 1, 20) && ['celestial', 'biological', 'civilization', 'technology', 'anomaly', 'cosmic', 'historical'].includes(d.category), 'codex');
  check(state.achievements.every(a => text(a)) && state.artifacts.every(a => text(a)) && state.achievements.length === new Set(state.achievements).size, 'collections');
  check(record(state.meta) && Number.isInteger(state.meta.runs) && finite(state.meta.runs) && finite(state.meta.cosmicKnowledge) && finite(state.meta.earnedKnowledge) && record(state.meta.laws) && ['production', 'evolution', 'research', 'offline'].every(key => Number.isInteger(state.meta.laws[key as keyof typeof state.meta.laws]) && finite(state.meta.laws[key as keyof typeof state.meta.laws], 0, 20)), 'universal laws');
  for (const modifiers of [state.meta.activeModifiers, state.meta.nextModifiers]) check(Array.isArray(modifiers) && modifiers.length <= 2 && modifiers.every(id => ['abundant-minerals', 'fast-evolution', 'high-gravity', 'ancient-universe', 'unstable-stars'].includes(id)), 'universe modifiers');
  check(record(state.automation) && ['explore', 'develop', 'assist', 'research', 'mine'].every(key => typeof state.automation[key as keyof typeof state.automation] === 'boolean'), 'automation');
}
