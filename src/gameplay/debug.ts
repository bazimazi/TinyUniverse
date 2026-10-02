import { makeObject, logEvent } from '../core/universe.ts';
import { RESOURCE_IDS } from '../core/types.ts';
import type { ActionResult, Universe } from '../core/types.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import { advance } from '../simulation/engine.ts';
import { collapse, foundCivilization } from '../simulation/civilizations.ts';
export function debugAction(state: Universe, action: string): ActionResult {
  if (action === 'resources') for (const id of RESOURCE_IDS) state.resources[id] += 100000;
  if (action === 'time') advance(state, 3600);
  if (action === 'civilization' && state.objects[state.selectedId].planet && !state.civilizations[`civ-${state.selectedId}`]) foundCivilization(state, state.selectedId);
  if (action === 'kill') { const civ = state.civilizations[`civ-${state.selectedId}`]; if (civ) collapse(state, civ, 'A developer-triggered collapse.'); }
  if (action === 'technology') for (const civ of Object.values(state.civilizations)) { civ.technologies = Object.keys(TECHNOLOGIES); civ.level = 11; civ.researching = null; }
  if (action === 'planet' && Object.keys(state.objects).length < 256) {
    const id = `debug-${Object.keys(state.objects).length}`, object = makeObject(state.seed, id, 'planet', 'star-0');
    object.createdAt = state.time; object.orbit!.radius += Object.keys(state.objects).length * 20;
    state.objects[id] = object; state.objects['star-0'].children.push(id);
  }
  if (action === 'event') logEvent(state, 'DebugEvent', state.selectedId, 'A signal in the dark', 'A developer-triggered event.', 'wonder');
  return { ok: true, message: 'Developer action applied.' };
}
