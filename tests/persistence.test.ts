import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { hash } from '../src/core/random.ts';
import { SAVE_VERSION } from '../src/core/config.ts';
import { deserialize, serialize, save, SAVE_KEY, BACKUP_KEY } from '../src/persistence/save.ts';
import { advance } from '../src/simulation/engine.ts';
import { spend, buyUpgrade } from '../src/simulation/economy.ts';
function envelope(state: unknown): string { const payload = JSON.stringify(state); return JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload }); }
for (let version = 1; version < SAVE_VERSION; version++) test(`save version ${version} migrates to version ${SAVE_VERSION}`, () => {
  const state = JSON.parse(JSON.stringify(createUniverse(17, 0))); state.version = version;
  if (version < 11) delete state.automation.mine;
  if (version < 10) { delete state.meta; delete state.automation; delete state.settings.music; delete state.settings.haptics; }
  if (version < 9) for (const key of ['discoveries', 'anomalies', 'achievements', 'artifacts', 'records']) delete state[key];
  if (version < 8) { delete state.relations; delete state.megastructures; for (const key of ['exotic', 'stellar', 'quantum']) delete state.resources[key]; }
  if (version < 7) { delete state.galaxies; delete state.exploration.completed.galactic; }
  if (version < 6) { delete state.systems; delete state.exploration.completed.interstellar; }
  if (version < 5) { delete state.cooldowns; delete state.speed; }
  if (version < 4) { delete state.civilizations; delete state.resources.knowledge; }
  if (version < 2) delete state.exploration;
  for (const object of Object.values(state.objects) as Record<string, unknown>[]) {
    if (version < 13) delete object.asteroid;
    if (object.stellar && version < 12) for (const key of ['lastActivityAt', 'flareAt', 'suppressedUntil']) delete (object.stellar as Record<string, unknown>)[key];
    if (version < 7) delete object.lastLifeUpdate;
    if (version < 6) { delete object.systemId; delete object.stellar; }
    if (version < 5) delete object.shieldUntil;
    if (version < 3) delete object.life;
    if (version < 2) { delete object.mined; delete object.deposit; }
  }
  const migrated = deserialize(envelope(state)); assert.equal(migrated.version, SAVE_VERSION); assert.equal(migrated.resources.energy, 25); assert.equal(migrated.selectedId, 'planet-0'); assert.equal(migrated.automation.mine, false); advance(migrated, 3600); assert.doesNotThrow(() => serialize(migrated));
});
test('checksummed malformed fields and unsafe deadlines are rejected before simulation', () => {
  for (const corrupt of [(s: ReturnType<typeof createUniverse>) => { s.objects['planet-0'].color = 'broken'; }, (s: ReturnType<typeof createUniverse>) => { s.settings.music = undefined as unknown as boolean; }, (s: ReturnType<typeof createUniverse>) => { s.meta.laws.offline = -1; }]) {
    const state = createUniverse(17, 0); corrupt(state); assert.throws(() => deserialize(envelope(state)));
  }
  const state = createUniverse(17, 0); advance(state, 60); state.anomalies.bad = { id: 'bad', seed: 1, targetId: 'planet-0', kind: 'time-echo', stage: 0, status: 'investigating', choice: null, nextAt: 10 }; assert.throws(() => deserialize(envelope(state)));
});
test('backup quota failure still allows the primary save and invalid costs never mint currency', () => {
  const data = new Map<string, string>(); const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (key === BACKUP_KEY) throw new Error('Quota exceeded'); data.set(key, value); } };
  const state = createUniverse(17, 0); save(storage, state); advance(state, 30); save(storage, state); assert.equal(deserialize(data.get(SAVE_KEY)!).time, 30);
  const before = { ...state.resources }; assert.equal(spend(state, { energy: -2 }), false); assert.deepEqual(state.resources, before); assert.equal(buyUpgrade(state, 'planet-0', '__proto__' as 'solar').ok, false);
});

test('version 10 mining migration preserves existing preferences and current saves validate its toggle', () => {
  const state = JSON.parse(JSON.stringify(createUniverse(41, 0))); state.version = 10; delete state.automation.mine;
  state.automation.explore = state.automation.research = true; state.resources.energy = 321; state.objects['planet-0'].name = 'A saved home';
  const migrated = deserialize(envelope(state)); assert.equal(migrated.automation.mine, false); assert.equal(migrated.automation.explore, true); assert.equal(migrated.automation.research, true);
  assert.equal(migrated.resources.energy, 321); assert.equal(migrated.objects['planet-0'].name, 'A saved home');
  migrated.automation.mine = true; assert.equal(deserialize(serialize(migrated)).automation.mine, true);
  for (const value of [undefined, 'yes', 1]) {
    const broken = JSON.parse(JSON.stringify(migrated)); broken.automation.mine = value; assert.throws(() => deserialize(envelope(broken)), /automation/);
  }
});

test('legacy stellar activity starts at saved time and preserves existing worlds and automation', () => {
  const legacy = JSON.parse(JSON.stringify(createUniverse(7, 0))); legacy.version = 11; legacy.time = 10000; legacy.automation.mine = true;
  legacy.objects['planet-0'].shieldUntil = 11000; legacy.objects['planet-0'].planet.temperature = 302;
  for (const key of ['lastActivityAt', 'flareAt', 'suppressedUntil']) delete legacy.objects['star-0'].stellar[key];
  const migrated = deserialize(envelope(legacy)), star = migrated.objects['star-0'].stellar!;
  assert.equal(star.lastActivityAt, 10000); assert.equal(star.flareAt, null); assert.equal(star.suppressedUntil, 0); assert.equal(migrated.automation.mine, true);
  assert.equal(migrated.objects['planet-0'].shieldUntil, 11000); assert.equal(migrated.objects['planet-0'].planet!.temperature, 302);
  advance(migrated, 899); assert.equal(star.lastActivityAt, 10000); assert.equal(migrated.events.some(e => e.type === 'StellarFlareWarning'), false);
  assert.doesNotThrow(() => serialize(migrated));
});
test('current saves reject missing, stale, nonfinite and impossible stellar activity', () => {
  for (const corrupt of [
    (s: ReturnType<typeof createUniverse>) => { delete (s.objects['star-0'].stellar as Partial<NonNullable<typeof s.objects[string]['stellar']>>).lastActivityAt; },
    (s: ReturnType<typeof createUniverse>) => { s.objects['star-0'].stellar!.lastActivityAt = 1; },
    (s: ReturnType<typeof createUniverse>) => { s.objects['star-0'].stellar!.suppressedUntil = NaN; },
    (s: ReturnType<typeof createUniverse>) => { s.objects['star-0'].stellar!.flareAt = -1; },
    (s: ReturnType<typeof createUniverse>) => { s.objects['star-0'].stellar!.flareAt = 91; },
    (s: ReturnType<typeof createUniverse>) => { s.objects['star-0'].stellar!.stage = 'remnant'; s.objects['star-0'].stellar!.flareAt = 11; }
  ]) { const state = createUniverse(7, 0); corrupt(state); assert.throws(() => deserialize(envelope(state)), /stellar activity|star system/); }
});
