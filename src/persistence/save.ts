import { SAVE_VERSION } from '../core/config.ts';
import { assertUniverse } from '../core/invariants.ts';
import { hash } from '../core/random.ts';
import type { StorageAdapter, Universe } from '../core/types.ts';
export const SAVE_KEY = 'tiny-universe.save';
export const BACKUP_KEY = `${SAVE_KEY}.backup`;
export function serialize(state: Universe): string {
  assertUniverse(state);
  const payload = JSON.stringify({ ...state, version: SAVE_VERSION });
  return JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload });
}
export function deserialize(text: string): Universe {
  if (text.length > 5_000_000) throw new Error('Save file is too large.');
  const envelope = JSON.parse(text) as { format?: string; checksum?: number; payload?: string };
  if (envelope.format !== 'TinyUniverse' || typeof envelope.payload !== 'string' || hash(envelope.payload) !== envelope.checksum) throw new Error('Save file is incomplete or corrupted.');
  const state = JSON.parse(envelope.payload) as Universe;
  if (!Number.isInteger(state.version) || state.version < 1 || state.version > SAVE_VERSION) throw new Error('Unsupported save version.');
  assertUniverse(state);
  state.version = SAVE_VERSION;
  return state;
}
export function save(storage: StorageAdapter, state: Universe): void {
  const text = serialize(state);
  const previous = storage.getItem(SAVE_KEY);
  if (previous) {
    try { deserialize(previous); storage.setItem(BACKUP_KEY, previous); } catch { /* Keep the last valid backup. */ }
  }
  storage.setItem(SAVE_KEY, text);
}
export function load(storage: StorageAdapter): { state: Universe | null; warning: string; corrupt: boolean } {
  let failed = false;
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try { return { state: deserialize(raw), warning: failed ? 'Recovered your universe from the backup save.' : '', corrupt: false }; }
    catch { failed = true; }
  }
  return { state: null, warning: failed ? 'Your save could not be read. Export or import a backup, or choose Start fresh in settings. The original is preserved.' : '', corrupt: failed };
}
