import type { CelestialObject, Universe } from '../core/types.ts';

export function worldsForSelection(state: Universe, limit = 40): CelestialObject[] {
  const selected = state.objects[state.selectedId], objects = Object.values(state.objects);
  const candidates = [selected, ...objects.filter(object => object.systemId === selected.systemId), ...objects.filter(object => object.favorite)];
  const seen = new Set<string>();
  return candidates.filter(object => { if (seen.has(object.id)) return false; seen.add(object.id); return true; }).slice(0, Math.max(1, limit));
}
