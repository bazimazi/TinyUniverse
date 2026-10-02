import type { Universe } from '../core/types.ts';
import { initialLife } from '../core/ecosystem.ts';
export function migrate(state: Universe): void {
  if (state.version < 2) {
    state.exploration = { job: null, completed: { orbital: 0 } };
    for (const object of Object.values(state.objects)) { object.mined = false; object.deposit = 0; }
  }
  if (state.version < 3) for (const object of Object.values(state.objects)) object.life = object.planet ? initialLife(object.id === 'planet-0') : null;
}
