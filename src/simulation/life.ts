import { BALANCE } from '../core/config.ts';
import { random, entitySeed } from '../core/random.ts';
import { logEvent } from '../core/universe.ts';
import { updateInterval } from '../core/tiers.ts';
import { evolutionMultiplier } from '../core/meta.ts';
import type { CelestialObject, Ecosystem, Universe } from '../core/types.ts';
export function habitability(object: CelestialObject, state: Universe): number {
  const p = object.planet!;
  const temperature = Math.max(0, 1 - Math.abs(p.temperature - 288) / 80);
  const tides = object.children.filter(id => state.objects[id]?.type === 'moon').length * 0.025;
  return Math.min(1, Math.max(0, (0.2 + p.atmosphere * 0.3 + p.water * 0.3 + p.magneticField * 0.2 + tides) * temperature));
}
export function evolutionRate(state: Universe, object: CelestialObject): number {
  const p = object.planet;
  return !p || p.habitability < BALANCE.life.minimumHabitability ? 0 : p.habitability * Math.min(1, p.water * 2) * (1 + object.upgrades.biodiversity * 0.15) * evolutionMultiplier(state);
}
export function simulateLife(state: Universe): void {
  for (const object of Object.values(state.objects)) {
    const p = object.planet, life = object.life;
    if (!p || !life) continue;
    const seconds = state.time - object.lastLifeUpdate;
    if (seconds + 1e-7 < updateInterval(state, object)) continue;
    object.lastLifeUpdate = state.time;
    p.habitability = habitability(object, state);
    const suitability = p.habitability * Math.min(1, p.water * 2);
    life.progress += seconds * evolutionRate(state, object);
    const next = life.progress >= BALANCE.life.intelligentAt ? 'intelligent' : life.progress >= BALANCE.life.complexAt ? 'complex' : life.progress >= BALANCE.life.simpleAt ? 'simple' : 'chemistry';
    if (next !== life.stage) {
      life.stage = next;
      logEvent(state, 'LifeEmerged', object.id, `${object.name}: ${next === 'simple' ? 'the first organisms' : next === 'complex' ? 'a world teeming with life' : 'the first curious minds'}`, 'Conditions on this world opened a new chapter in evolution.', 'wonder');
    }
    const complex = life.stage === 'complex' || life.stage === 'intelligent';
    for (const key of Object.keys(life.populations) as (keyof Ecosystem['populations'])[]) {
      const enabled = key === 'microorganisms' ? life.stage !== 'chemistry' : complex;
      const food = key === 'herbivores' ? life.populations.plants : key === 'predators' ? life.populations.herbivores : key === 'aquatic' ? p.water : 1;
      const capacity = enabled ? suitability * Math.max(0.05, food) : 0;
      life.populations[key] += (capacity - life.populations[key]) * (1 - Math.exp(-BALANCE.life.growth * seconds));
    }
    life.species = life.stage === 'chemistry' ? 0 : Math.max(1, Math.floor(life.progress * suitability / 8));
    p.biodiversity = Math.min(1, Object.values(life.populations).reduce((a, b) => a + b, 0) / 6 + object.upgrades.biodiversity * 0.025);
    const rng = random(entitySeed(object.seed, `planet-event:${Math.round(state.time / BALANCE.decisionInterval)}`));
    if (rng() < 1 - (1 - BALANCE.life.eventChance) ** (seconds / BALANCE.decisionInterval) && object.shieldUntil <= state.time) {
      const volcanic = rng() < 0.5;
      p.temperature = Math.max(180, Math.min(380, p.temperature + (volcanic ? 3 : -4)));
      p.atmosphere = Math.max(0, Math.min(1, p.atmosphere + (volcanic ? 0.015 : -0.01)));
      logEvent(state, 'PlanetaryEvent', object.id, `${object.name}: ${volcanic ? 'a volcanic awakening' : 'a cooler season'}`, 'The environment changed. Life will adapt to its new conditions.');
    }
  }
}
