import { STELLAR_BALANCE } from '../core/config.ts';
import { logEvent } from '../core/universe.ts';
import { entitySeed, random } from '../core/random.ts';
import { habitability } from './life.ts';
import { civilizationAt, civilizationEvent } from './civilizations.ts';
import { discover } from '../gameplay/discoveries.ts';
import type { CelestialObject, Universe } from '../core/types.ts';
function scheduleActivity(state: Universe, object: CelestialObject): void {
  const star = object.stellar!;
  if (state.time - star.lastActivityAt < STELLAR_BALANCE.activityInterval) return;
  star.lastActivityAt = state.time;
  const chance = STELLAR_BALANCE.flareChance[star.class] * (star.stage === 'giant' ? STELLAR_BALANCE.giantActivityMultiplier : 1) * (state.meta.activeModifiers.includes('unstable-stars') ? 2 : 1);
  const rng = random(entitySeed(object.seed, `stellar-activity:${Math.floor((state.time - object.createdAt) / STELLAR_BALANCE.activityInterval)}`));
  if (star.flareAt !== null || rng() >= chance) return;
  star.flareAt = state.time + STELLAR_BALANCE.flareWarning;
  logEvent(state, 'StellarFlareWarning', object.id, `${object.name}: a flare is gathering`, 'A flare is expected in 90 seconds of universe time. Shelter individual worlds or suppress the star with fusion technology.', 'danger');
}
export function completeFlares(state: Universe): void {
  for (const object of Object.values(state.objects)) {
    const star = object.stellar;
    if (!star || star.flareAt === null || star.flareAt > state.time) continue;
    star.flareAt = null;
    if (star.stage === 'remnant' || state.time - object.createdAt >= star.lifespan) continue;
    if (star.suppressedUntil > state.time) {
      logEvent(state, 'StellarFlareSuppressed', object.id, `${object.name}: a flare subsided`, 'Stellar suppression kept every world in this system safe.', 'wonder');
      discover(state, { id: 'cosmic:flare-suppressed', title: 'A star calmed', category: 'cosmic', sourceId: object.id, detail: `Suppression prevented a flare from ${object.name} from reaching its worlds.`, rarity: 2 });
      continue;
    }
    logEvent(state, 'StellarFlare', object.id, `${object.name}: a stellar flare`, 'Radiation reached its worlds. Atmospheres, magnetic fields and planetary shelters soften its effects.', 'danger');
    discover(state, { id: 'cosmic:stellar-flare', title: 'First stellar flare', category: 'cosmic', sourceId: object.id, detail: `${object.name} revealed how stellar activity can reshape planetary environments.`, rarity: 2 });
    for (const world of Object.values(state.objects)) {
      const planet = world.planet;
      if (!planet || world.systemId !== object.systemId) continue;
      if (world.shieldUntil > state.time) {
        logEvent(state, 'StellarFlareSheltered', world.id, `${world.name}: shelter held`, 'Its planetary shelter prevented the stellar flare from changing its environment.', 'wonder');
        continue;
      }
      const exposure = (1 - planet.magneticField * STELLAR_BALANCE.magneticProtection) * (1 - planet.atmosphere * STELLAR_BALANCE.atmosphereProtection);
      planet.temperature = Math.min(10000, planet.temperature + STELLAR_BALANCE.flareHeat * exposure);
      planet.atmosphere = Math.max(0, planet.atmosphere - STELLAR_BALANCE.flareAtmosphereLoss * exposure);
      if (world.life) for (const key of Object.keys(world.life.populations) as (keyof typeof world.life.populations)[]) world.life.populations[key] *= 1 - STELLAR_BALANCE.flareEcosystemLoss * exposure;
      planet.habitability = habitability(world, state);
      const civ = civilizationAt(state, world.id, true);
      const detail = `${world.name} warmed and lost a little atmosphere. Its ecosystem must adapt; shelter can prevent future flare damage.`;
      if (civ) civilizationEvent(state, civ, 'StellarFlareImpact', `${world.name}: stellar radiation`, detail, 'danger');
      else logEvent(state, 'StellarFlareImpact', world.id, `${world.name}: stellar radiation`, detail, 'danger');
    }
  }
}
export function simulateStars(state: Universe): void {
  for (const object of Object.values(state.objects)) {
    const star = object.stellar;
    if (!star || star.stage === 'remnant') continue;
    const age = state.time - object.createdAt; star.fuel = Math.max(0, 1 - age / star.lifespan);
    const previous = star.luminosity;
    if (age >= star.lifespan) {
      star.stage = 'remnant'; object.type = star.solarMass >= 8 ? 'black-hole' : star.solarMass >= 3 ? 'neutron-star' : 'white-dwarf';
      star.flareAt = null;
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
    if (star.stage !== 'remnant') scheduleActivity(state, object);
  }
}
