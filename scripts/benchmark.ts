import { createUniverse } from '../src/core/universe.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
const state = createUniverse(42, 0);
const start = performance.now(); advance(state, 86400); const elapsed = performance.now() - start;
assertUniverse(state);
console.log(`24h simulation: ${elapsed.toFixed(2)}ms, ${Object.keys(state.objects).length} objects, ${JSON.stringify(state).length} save bytes`);
if (elapsed > 2000) throw new Error('Offline simulation exceeded the 2s budget.');
