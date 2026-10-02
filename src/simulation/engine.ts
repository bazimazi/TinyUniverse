import { BALANCE } from '../core/config.ts';
import { produce } from './economy.ts';
import { completeExploration } from '../gameplay/exploration.ts';
import { simulateLife } from './life.ts';
import { simulateCivilizations } from './civilizations.ts';
import { simulateStars } from './stars.ts';
import { simulateGalaxies } from './galaxies.ts';
import { simulateAdvanced } from './advanced.ts';
import type { Universe } from '../core/types.ts';
export function advance(state: Universe, seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Elapsed time must be finite and nonnegative.');
  const end = state.time + seconds;
  while (state.time < end) {
    const decision = (Math.floor((state.time + 1e-7) / BALANCE.decisionInterval) + 1) * BALANCE.decisionInterval;
    const boundary = Math.min(end, state.exploration.job?.endsAt ?? end, decision);
    const step = Math.max(0, boundary - state.time);
    produce(state, step); state.time = boundary;
    completeExploration(state);
    if (Math.abs(boundary - decision) < 1e-7) {
      simulateStars(state);
      simulateLife(state);
      simulateCivilizations(state);
      simulateGalaxies(state);
      simulateAdvanced(state);
    }
  }
}
export function resumeOffline(state: Universe, timestamp: number): { seconds: number; capped: boolean } {
  const elapsed = Math.max(0, (timestamp - state.lastTimestamp) / 1000);
  const seconds = Math.min(elapsed, BALANCE.offlineCap);
  advance(state, seconds);
  // Keep a high-water mark: rolling the device clock back must not award duplicate time.
  state.lastTimestamp = Math.max(state.lastTimestamp, timestamp);
  return { seconds, capped: elapsed > seconds };
}
