import { BALANCE } from '../core/config.ts';
import { produce } from './economy.ts';
import { completeExploration } from '../gameplay/exploration.ts';
import { simulateLife } from './life.ts';
import { simulateCivilizations } from './civilizations.ts';
import { simulateStars } from './stars.ts';
import { simulateGalaxies } from './galaxies.ts';
import { completeStructures, simulateAdvanced } from './advanced.ts';
import { advanceAnomalies } from '../gameplay/discoveries.ts';
import { simulateDiscoveries } from './discoveries.ts';
import { offlineCap } from '../core/meta.ts';
import { automate } from '../gameplay/automation.ts';
import type { Universe } from '../core/types.ts';
export function advance(state: Universe, seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Elapsed time must be finite and nonnegative.');
  if (seconds > 604800 || !Number.isFinite(state.time + seconds)) throw new Error('Advance at most seven days in one simulation call.');
  const end = state.time + seconds;
  while (state.time < end) {
    const decision = (Math.floor(state.time / BALANCE.decisionInterval) + 1) * BALANCE.decisionInterval;
    const anomalyDeadline = Math.min(end, ...Object.values(state.anomalies).map(a => a.nextAt ?? end));
    const constructionDeadline = Math.min(end, ...Object.values(state.megastructures).filter(s => s.status === 'building').map(s => Math.max(state.time, s.endsAt)));
    const boundary = Math.min(end, state.exploration.job?.endsAt ?? end, decision, anomalyDeadline, constructionDeadline);
    const step = Math.max(0, boundary - state.time);
    produce(state, step); state.time = boundary;
    completeExploration(state);
    advanceAnomalies(state);
    completeStructures(state);
    if (Math.abs(boundary - decision) < 1e-7) {
      simulateStars(state);
      simulateLife(state);
      simulateCivilizations(state);
      simulateGalaxies(state);
      simulateAdvanced(state);
      simulateDiscoveries(state);
      automate(state);
    }
  }
}
export function resumeOffline(state: Universe, timestamp: number): { seconds: number; capped: boolean } {
  const elapsed = Math.max(0, (timestamp - state.lastTimestamp) / 1000);
  const seconds = Math.min(elapsed, offlineCap(state));
  advance(state, seconds);
  // Keep a high-water mark: rolling the device clock back must not award duplicate time.
  state.lastTimestamp = Math.max(state.lastTimestamp, timestamp);
  return { seconds, capped: elapsed > seconds };
}
