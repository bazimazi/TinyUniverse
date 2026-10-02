import { BALANCE } from '../core/config.ts';
import { produce } from './economy.ts';
import type { Universe } from '../core/types.ts';
export function advance(state: Universe, seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Elapsed time must be finite and nonnegative.');
  produce(state, seconds);
  state.time += seconds;
}
export function resumeOffline(state: Universe, timestamp: number): { seconds: number; capped: boolean } {
  const elapsed = Math.max(0, (timestamp - state.lastTimestamp) / 1000);
  const seconds = Math.min(elapsed, BALANCE.offlineCap);
  advance(state, seconds);
  // Keep a high-water mark: rolling the device clock back must not award duplicate time.
  state.lastTimestamp = Math.max(state.lastTimestamp, timestamp);
  return { seconds, capped: elapsed > seconds };
}
