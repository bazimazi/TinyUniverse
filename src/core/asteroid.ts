import type { AsteroidState } from './types.ts';
export function initialAsteroid(time = 0): AsteroidState {
  return { status: 'orbiting', lastActivityAt: time, targetId: null, impactAt: null };
}
