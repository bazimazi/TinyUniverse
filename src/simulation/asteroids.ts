import { ASTEROID_BALANCE } from '../core/config.ts';
import { entitySeed, random } from '../core/random.ts';
import { logEvent } from '../core/universe.ts';
import type { CelestialObject, Universe } from '../core/types.ts';
import { discover } from '../gameplay/discoveries.ts';
import { civilizationAt, civilizationEnvironment, civilizationEvent, collapse, settlementCapacity } from './civilizations.ts';
import { habitability } from './life.ts';

export function avertAsteroid(state: Universe, object: CelestialObject, detail: string): void {
  const asteroid = object.asteroid!;
  const target = asteroid.targetId ? state.objects[asteroid.targetId] : undefined, incoming = asteroid.status === 'incoming';
  asteroid.status = 'deflected'; asteroid.targetId = null; asteroid.impactAt = null;
  if (!incoming || !target) return;
  const civ = civilizationAt(state, target.id, true);
  if (civ) civilizationEvent(state, civ, 'AsteroidAverted', `${target.name}: debris diverted`, detail, 'wonder');
  else logEvent(state, 'AsteroidAverted', target.id, `${target.name}: debris diverted`, detail, 'wonder');
  discover(state, { id: 'cosmic:asteroid-averted', title: 'A world spared', category: 'cosmic', sourceId: target.id, detail: `A debris threat from ${object.name} was diverted before reaching ${target.name}.`, rarity: 2 });
}

export function simulateAsteroids(state: Universe): void {
  const objects = Object.values(state.objects);
  let worlds: CelestialObject[] | undefined;
  for (const object of objects) {
    const asteroid = object.asteroid;
    if (!asteroid || asteroid.status !== 'orbiting' || state.time - asteroid.lastActivityAt < ASTEROID_BALANCE.activityInterval) continue;
    asteroid.lastActivityAt = state.time;
    if (object.parentId && state.objects[object.parentId].planet) continue;
    const rng = random(entitySeed(object.seed, `asteroid-debris:${state.time}`));
    if (rng() >= ASTEROID_BALANCE.impactChance) continue;
    worlds ??= objects.filter(o => o.planet);
    const targets = worlds.filter(o => o.systemId === object.systemId);
    if (!targets.length) continue;
    const target = targets[Math.floor(rng() * targets.length)];
    asteroid.status = 'incoming'; asteroid.targetId = target.id; asteroid.impactAt = state.time + ASTEROID_BALANCE.impactWarning;
    const detail = `Debris from ${object.name} will reach ${target.name} in two minutes of universe time. Deflect it with Spaceflight, capture the asteroid with Gravity engineering, or shelter the threatened world.`;
    const civ = civilizationAt(state, target.id, true);
    if (civ) civilizationEvent(state, civ, 'AsteroidWarning', `${target.name}: incoming debris`, detail, 'danger');
    else logEvent(state, 'AsteroidWarning', target.id, `${target.name}: incoming debris`, detail, 'danger');
  }
}

export function completeImpacts(state: Universe): void {
  for (const object of Object.values(state.objects)) {
    const asteroid = object.asteroid;
    if (!asteroid || asteroid.status !== 'incoming' || asteroid.impactAt! > state.time) continue;
    const target = state.objects[asteroid.targetId!];
    if (target.shieldUntil > state.time) {
      avertAsteroid(state, object, `Planetary shelter intercepted the debris from ${object.name}. Its environment and population were protected.`);
      continue;
    }
    const civ = civilizationAt(state, target.id, true), environment = civ ? civilizationEnvironment(state, civ) : undefined;
    const share = civ && environment!.capacity > 0 ? Math.min(1, settlementCapacity(target, civ) / environment!.capacity) : 0;
    asteroid.status = 'spent'; asteroid.targetId = null; asteroid.impactAt = null;
    const p = target.planet!;
    p.temperature = Math.min(10000, p.temperature + ASTEROID_BALANCE.heat);
    p.atmosphere = Math.max(0, p.atmosphere - ASTEROID_BALANCE.atmosphereLoss); p.water = Math.max(0, p.water - ASTEROID_BALANCE.waterLoss);
    if (target.life) {
      for (const key of Object.keys(target.life.populations) as (keyof typeof target.life.populations)[]) target.life.populations[key] *= 1 - ASTEROID_BALANCE.ecosystemLoss;
      p.biodiversity = Math.min(1, Object.values(target.life.populations).reduce((sum, population) => sum + population, 0) / 6 + target.upgrades.biodiversity * 0.025);
    }
    p.habitability = habitability(target, state);
    const detail = `Debris from ${object.name} warmed the world, reduced its atmosphere and water, and disrupted its ecosystem. Colonies and habitats limit the share of a civilization exposed. The debris shower is spent; the asteroid and its mining outpost remain.`;
    if (civ) {
      civ.population *= 1 - ASTEROID_BALANCE.populationLoss * share;
      civ.stability = Math.max(0, civ.stability - ASTEROID_BALANCE.stabilityLoss * share);
      civilizationEvent(state, civ, 'AsteroidImpact', `${target.name}: debris impact`, detail, 'danger');
      if (civ.population < 5) collapse(state, civ, 'Debris impacts exhausted their population.');
    } else logEvent(state, 'AsteroidImpact', target.id, `${target.name}: debris impact`, detail, 'danger');
    discover(state, { id: 'cosmic:asteroid-impact', title: 'First debris impact', category: 'cosmic', sourceId: target.id, detail: `Debris from ${object.name} left lasting environmental changes on ${target.name}.`, rarity: 2 });
  }
}
