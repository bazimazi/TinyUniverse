import type { CelestialObject, Universe } from '../core/types.ts';
export function orbitPosition(object: CelestialObject, time: number): { x: number; y: number } {
  if (!object.orbit) return { x: 0, y: 0 };
  const { radius, period, eccentricity, phase } = object.orbit;
  const mean = (time % period) / period * Math.PI * 2 + phase;
  let eccentric = mean;
  for (let i = 0; i < 5; i++) eccentric -= (eccentric - eccentricity * Math.sin(eccentric) - mean) / (1 - eccentricity * Math.cos(eccentric));
  return { x: radius * (Math.cos(eccentric) - eccentricity), y: radius * Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentric) };
}
export function worldPosition(state: Universe, objectId: string, time = state.time, visited = new Set<string>()): { x: number; y: number } {
  const object = state.objects[objectId];
  if (!object || visited.has(objectId)) return { x: 0, y: 0 };
  visited.add(objectId);
  const position = orbitPosition(object, time);
  const parent = object.parentId ? worldPosition(state, object.parentId, time, visited) : { x: 0, y: 0 };
  return { x: position.x + parent.x, y: position.y + parent.y };
}
