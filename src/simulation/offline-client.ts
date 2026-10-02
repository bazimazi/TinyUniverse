import { resumeOffline } from './engine.ts';
import type { Universe } from '../core/types.ts';
export async function catchUp(state: Universe, timestamp: number): Promise<{ state: Universe; result: { seconds: number; capped: boolean } }> {
  if (timestamp - state.lastTimestamp < 600000 || Object.keys(state.objects).length < 16 || typeof Worker === 'undefined') return { state, result: resumeOffline(state, timestamp) };
  const worker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = event => { worker.terminate(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data); };
    worker.onerror = () => { worker.terminate(); reject(new Error('Unable to complete offline simulation. Export your save to preserve it.')); };
    worker.postMessage({ state, timestamp });
  });
}
