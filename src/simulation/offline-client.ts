import { resumeOffline } from './engine.ts';
import type { Universe } from '../core/types.ts';
import { captureProgress, summarizeProgress } from './offline-report.ts';
import type { OfflineReport } from './offline-report.ts';
export async function catchUp(source: Universe, timestamp: number): Promise<{ state: Universe; result: OfflineReport }> {
  // A failed import or worker must leave the current universe intact.
  const state = structuredClone(source), before = captureProgress(state);
  if (timestamp - state.lastTimestamp < 600000 || Object.keys(state.objects).length < 16 || typeof Worker === 'undefined') {
    const timing = resumeOffline(state, timestamp);
    return { state, result: summarizeProgress(before, state, timing) };
  }
  const worker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ state: Universe; result: { seconds: number; capped: boolean }; error?: string }>) => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve({ state: event.data.state, result: summarizeProgress(before, event.data.state, event.data.result) });
    };
    worker.onerror = () => { worker.terminate(); reject(new Error('Unable to complete offline simulation. Export your save to preserve it.')); };
    worker.postMessage({ state, timestamp });
  });
}
