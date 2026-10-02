import type { Universe } from '../core/types.ts';
export function migrate(state: Universe): void {
  if (state.version < 2) {
    state.exploration = { job: null, completed: { orbital: 0 } };
    for (const object of Object.values(state.objects)) { object.mined = false; object.deposit = 0; }
  }
}
