import { STELLAR_BALANCE } from '../core/config.ts';
import { logEvent } from '../core/universe.ts';
import type { Universe } from '../core/types.ts';
export function simulateStars(state: Universe): void {
  for (const object of Object.values(state.objects)) {
    const star = object.stellar;
    if (!star || star.stage === 'remnant') continue;
    const age = state.time - object.createdAt; star.fuel = Math.max(0, 1 - age / star.lifespan);
    const previous = star.luminosity;
    if (age >= star.lifespan) {
      star.stage = 'remnant'; object.type = star.solarMass >= 8 ? 'black-hole' : star.solarMass >= 3 ? 'neutron-star' : 'white-dwarf';
      star.luminosity = STELLAR_BALANCE.remnantLuminosity; object.color = object.type === 'black-hole' ? '#af94e8' : '#cadfff';
      logEvent(state, 'StarDied', object.id, `${object.name} became a ${object.type.replace('-', ' ')}`, 'The worlds around it must adapt. Old civilizations may leave ruins.', 'danger');
    } else if (age >= star.lifespan * STELLAR_BALANCE.giantAt && star.stage !== 'giant') {
      star.stage = 'giant'; star.luminosity *= STELLAR_BALANCE.giantLuminosity; object.radius *= 1.5; object.color = '#ffad8c';
      logEvent(state, 'StarEvolved', object.id, `${object.name} has become a giant`, 'Brighter starlight is reshaping its planetary climates.', 'wonder');
    }
    if (star.luminosity !== previous) for (const id of object.children) {
      const planet = state.objects[id].planet;
      if (planet) planet.temperature = Math.min(1000, Math.max(30, planet.temperature * (star.luminosity / previous) ** 0.25));
    }
  }
}
