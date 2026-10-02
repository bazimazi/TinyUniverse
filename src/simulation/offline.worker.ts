import { assertUniverse } from '../core/invariants.ts';
import { resumeOffline } from './engine.ts';
import type { Universe } from '../core/types.ts';
self.addEventListener('message', (event: MessageEvent<{ state: Universe; timestamp: number }>) => {
  try { const { state, timestamp } = event.data; assertUniverse(state); const result = resumeOffline(state, timestamp); assertUniverse(state); self.postMessage({ state, result }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Offline simulation failed.' }); }
});
