import type { ActionResult, Cost, Universe } from '../core/types.ts';
import { logEvent } from '../core/universe.ts';
import { spend } from '../simulation/economy.ts';
import { habitability } from '../simulation/life.ts';
import { hasTechnology, civilizationEvent } from '../simulation/civilizations.ts';
export const ABILITIES: Record<string, { name: string; description: string; cost: Cost; cooldown: number; requires: string | null; target: 'planet' | 'civilization' | 'asteroid' }> = {
  terraform: { name: 'Gentle terraforming', description: 'Warm or cool toward 288K. Improve water and atmosphere.', cost: { energy: 250, matter: 100 }, cooldown: 90, requires: null, target: 'planet' },
  fertility: { name: 'Seed biodiversity', description: 'Introduce resilient organisms and accelerate evolution.', cost: { biology: 80, matter: 60 }, cooldown: 120, requires: null, target: 'planet' },
  protect: { name: 'Shelter a world', description: 'Prevent planetary hazards for ten minutes.', cost: { energy: 300, minerals: 100 }, cooldown: 300, requires: null, target: 'planet' },
  gift: { name: 'A quiet gift', description: 'Resource aid improves stability and research for ten minutes.', cost: { energy: 250, minerals: 150 }, cooldown: 180, requires: null, target: 'civilization' },
  inspire: { name: 'Inspire a question', description: 'Invest knowledge in their current research; the answer remains theirs.', cost: { knowledge: 35 }, cooldown: 120, requires: null, target: 'civilization' },
  push: { name: 'Orbital push', description: 'Move the orbit outward. Climate must adapt to less starlight.', cost: { energy: 500, matter: 150 }, cooldown: 90, requires: 'spaceflight', target: 'planet' },
  gravityUp: { name: 'Gravity boost', description: 'Increase gravity and shorten orbital periods.', cost: { energy: 1000, knowledge: 80 }, cooldown: 120, requires: 'gravity', target: 'planet' },
  gravityDown: { name: 'Gravity reduction', description: 'Reduce gravity; orbital periods become longer.', cost: { energy: 1000, knowledge: 80 }, cooldown: 120, requires: 'gravity', target: 'planet' },
  capture: { name: 'Orbital capture', description: 'Capture an asteroid as a companion to your first world.', cost: { energy: 1200, matter: 400 }, cooldown: 180, requires: 'gravity', target: 'asteroid' }
};
export function useAbility(state: Universe, id: string, targetId: string): ActionResult {
  const ability = ABILITIES[id], object = state.objects[targetId], civ = Object.values(state.civilizations).find(c => c.planetId === targetId && c.status === 'active');
  if (!ability || !object) return { ok: false, message: 'Choose a world to influence.' };
  if (ability.requires && !hasTechnology(state, ability.requires)) return { ok: false, message: `Requires ${ability.requires} research.` };
  if (ability.target === 'planet' && !object.planet || ability.target === 'civilization' && !civ || ability.target === 'asteroid' && object.type !== 'asteroid') return { ok: false, message: `This ability needs a ${ability.target}.` };
  if ((id === 'capture' && object.parentId === 'planet-0') || (id === 'inspire' && !civ!.researching)) return { ok: false, message: 'There is no opportunity for this intervention yet.' };
  const key = `${id}:${targetId}`;
  if ((state.cooldowns[key] ?? 0) > state.time) return { ok: false, message: 'This influence is still recovering.' };
  if (!spend(state, ability.cost)) return { ok: false, message: 'Gather the resources for this influence.' };
  state.cooldowns[key] = state.time + ability.cooldown;
  if (id === 'terraform') { const p = object.planet!; p.temperature += (288 - p.temperature) * 0.5; p.water = Math.min(1, p.water + 0.06); p.atmosphere = Math.min(1, p.atmosphere + 0.06); }
  if (id === 'fertility') { object.life!.progress += 90; object.upgrades.biodiversity = Math.min(20, object.upgrades.biodiversity + 1); }
  if (id === 'protect') object.shieldUntil = state.time + 600;
  if (id === 'gift') { civ!.stability = Math.min(1, civ!.stability + 0.12); civ!.supportUntil = state.time + 600; }
  if (id === 'inspire') civ!.researchPoints += 120;
  if (id === 'push' && object.orbit) { object.orbit.radius = Math.min(800, object.orbit.radius * 1.12); object.orbit.period *= 1.12 ** 1.5; object.planet!.temperature *= Math.sqrt(1 / 1.12); }
  if (id === 'gravityUp' || id === 'gravityDown') {
    const old = object.planet!.gravity; object.planet!.gravity = Math.max(0.25, Math.min(4, old * (id === 'gravityUp' ? 1.2 : 0.8)));
    for (const child of object.children) if (state.objects[child].orbit) state.objects[child].orbit!.period *= Math.sqrt(old / object.planet!.gravity);
  }
  if (id === 'capture') {
    const parent = state.objects[object.parentId!]; parent.children = parent.children.filter(child => child !== targetId);
    object.parentId = 'planet-0'; state.objects['planet-0'].children.push(targetId);
    object.orbit = { radius: 42, period: 32, eccentricity: 0.02, phase: 0 };
  }
  if (object.planet) object.planet.habitability = habitability(object, state);
  if (civ) civilizationEvent(state, civ, 'Intervention', `${civ.name}: ${ability.name}`, ability.description);
  else logEvent(state, 'Intervention', targetId, `${object.name}: ${ability.name}`, ability.description);
  return { ok: true, message: 'A small intervention. A different future.' };
}
export function maximumSpeed(state: Universe): number { return hasTechnology(state, 'interstellar') ? 25 : hasTechnology(state, 'fusion') ? 10 : hasTechnology(state, 'spaceflight') ? 5 : Object.keys(state.civilizations).length ? 2 : 1; }
