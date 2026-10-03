import { resumeOffline } from './engine.ts';
import { assertUniverse } from '../core/invariants.ts';
import { offlineCap } from '../core/meta.ts';
import type { Universe } from '../core/types.ts';
import { captureProgress, summarizeProgress } from './offline-report.ts';
import type { OfflineReport, ProgressSnapshot } from './offline-report.ts';

type CatchUpResult = { state: Universe; result: OfflineReport };
export type CatchUpWorker = Pick<Worker, 'onmessage' | 'onerror' | 'onmessageerror' | 'postMessage' | 'terminate'>;
interface CatchUpOptions { createWorker?: () => CatchUpWorker; workerTimeoutMs?: number }

function simulateInline(state: Universe, timestamp: number, before: ProgressSnapshot): CatchUpResult {
  const timing = resumeOffline(state, timestamp);
  assertUniverse(state);
  return { state, result: summarizeProgress(before, state, timing) };
}

export async function catchUp(source: Universe, timestamp: number, options: CatchUpOptions = {}): Promise<CatchUpResult> {
  // A failed import or worker must leave the current universe intact.
  const state = structuredClone(source);
  assertUniverse(state);
  const before = captureProgress(state);
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error('Offline timestamp must be finite and nonnegative.');
  if (timestamp - state.lastTimestamp < 600000 || Object.keys(state.objects).length < 16 || (!options.createWorker && typeof Worker === 'undefined')) return simulateInline(state, timestamp, before);
  let worker: CatchUpWorker;
  try {
    worker = options.createWorker ? options.createWorker() : new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return simulateInline(state, timestamp, before);
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      settled = true; clearTimeout(timeout);
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
    };
    const recover = () => {
      if (settled) return;
      cleanup();
      // A worker owns a separate structured clone. Recover from the untouched input, never a partial result.
      try { resolve(simulateInline(state, timestamp, before)); } catch (error) { reject(error); }
    };
    const timeout = setTimeout(recover, options.workerTimeoutMs ?? 15000);
    worker.onmessage = (event: MessageEvent<{ state?: Universe; result?: { seconds: number; capped: boolean }; error?: string }>) => {
      if (settled) return;
      cleanup();
      try {
        const data = event.data;
        if (typeof data?.error === 'string') throw new Error(data.error);
        if (!data?.state || !data.result || !Number.isFinite(data.result.seconds) || data.result.seconds < 0 || typeof data.result.capped !== 'boolean') throw new Error('Offline simulation returned an incomplete result.');
        assertUniverse(data.state);
        // Verify the worker credited precisely the requested gap and cap.
        const elapsed = Math.max(0, (timestamp - state.lastTimestamp) / 1000);
        const expected = Math.min(elapsed, offlineCap(state));
        if (data.result.seconds !== expected || data.result.capped !== (elapsed > expected) || data.state.time !== state.time + expected || data.state.lastTimestamp !== Math.max(state.lastTimestamp, timestamp)) throw new Error('Offline simulation returned inconsistent time.');
        resolve({ state: data.state, result: summarizeProgress(before, data.state, data.result) });
      } catch (error) { reject(error); }
    };
    worker.onerror = event => { event.preventDefault(); recover(); };
    worker.onmessageerror = recover;
    try { worker.postMessage({ state, timestamp }); } catch { recover(); }
  });
}
