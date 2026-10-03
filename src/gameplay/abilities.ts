import type { ActionResult, CelestialObject, Cost, Universe } from '../core/types.ts';
import { INFLUENCE_BALANCE } from '../core/config.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import { logEvent } from '../core/universe.ts';
import { canAfford, spend } from '../simulation/economy.ts';
import { habitability } from '../simulation/life.ts';
import { hasTechnology, civilizationAt, civilizationEvent } from '../simulation/civilizations.ts';
export const ABILITIES: Record<string, { name: string; description: string; cost: Cost; cooldown: number; requires: string | null; target: 'planet' | 'civilization' | 'asteroid' }> = {
  terraform: { name: 'Gentle terraforming', description: 'Warm or cool toward 288K. Improve water and atmosphere.', cost: { energy: 250, matter: 100 }, cooldown: 90, requires: null, target: 'planet' },
  fertility: { name: 'Seed biodiversity', description: 'Introduce resilient organisms and accelerate evolution.', cost: { biology: 80, matter: 60 }, cooldown: 120, requires: null, target: 'planet' },
  protect: { name: 'Shelter a world', description: 'Prevent planetary hazards for ten minutes.', cost: { energy: 300, minerals: 100 }, cooldown: 300, requires: null, target: 'planet' },
  gift: { name: 'A quiet gift', description: 'Resource aid improves stability and research for ten minutes.', cost: { energy: 250, minerals: 150 }, cooldown: 180, requires: null, target: 'civilization' },
  inspire: { name: 'Inspire a question', description: 'Invest knowledge in their current research; the answer remains theirs.', cost: { knowledge: 35 }, cooldown: 120, requires: null, target: 'civilization' },
  push: { name: 'Orbital push', description: 'Move the orbit outward. Climate must adapt to less starlight.', cost: { energy: 500, matter: 150 }, cooldown: 90, requires: 'spaceflight', target: 'planet' },
  pull: { name: 'Orbital pull', description: 'Move the orbit inward. More starlight warms the climate. Shares recovery with orbital push.', cost: { energy: 500, matter: 150 }, cooldown: 90, requires: 'spaceflight', target: 'planet' },
  gravityUp: { name: 'Gravity boost', description: 'Increase gravity and shorten orbital periods.', cost: { energy: 1000, knowledge: 80 }, cooldown: 120, requires: 'gravity', target: 'planet' },
  gravityDown: { name: 'Gravity reduction', description: 'Reduce gravity; orbital periods become longer.', cost: { energy: 1000, knowledge: 80 }, cooldown: 120, requires: 'gravity', target: 'planet' },
  capture: { name: 'Orbital capture', description: 'Capture an asteroid as a companion to a planet in its system.', cost: { energy: 1200, matter: 400 }, cooldown: 180, requires: 'gravity', target: 'asteroid' }
};
export function orbitAfterInfluence(object: CelestialObject, id: 'push' | 'pull'): { radius: number; period: number; temperature: number } | null {
  if (!object.planet || !object.orbit) return null;
  const minimum = Math.max(INFLUENCE_BALANCE.orbitMin, object.orbit.radius / object.orbit.period ** (2 / 3));
  const radius = id === 'push' ? Math.max(object.orbit.radius, Math.min(INFLUENCE_BALANCE.orbitMax, object.orbit.radius * INFLUENCE_BALANCE.orbitFactor)) : Math.min(object.orbit.radius, Math.max(minimum, object.orbit.radius / INFLUENCE_BALANCE.orbitFactor));
  const ratio = radius / object.orbit.radius;
  return { radius, period: Math.max(1, object.orbit.period * ratio ** 1.5), temperature: Math.max(1, Math.min(10000, object.planet.temperature / Math.sqrt(ratio))) };
}
export function abilityCooldown(state: Universe, id: string, targetId: string): number {
  const keys = id === 'push' || id === 'pull' ? ['push', 'pull'] : [id];
  const civ = id === 'gift' || id === 'inspire' ? civilizationAt(state, targetId, true) : undefined;
  const targets = civ ? new Set([civ.planetId, ...civ.colonies]) : [targetId];
  return Math.max(0, ...[...targets].flatMap(target => keys.map(key => (state.cooldowns[`${key}:${target}`] ?? 0) - state.time)));
}
export interface AbilityReadiness extends ActionResult { reason: 'ready' | 'locked' | 'target' | 'opportunity' | 'cooldown' | 'resources'; cooldown: number }
export function abilityReadiness(state: Universe, id: string, targetId: string): AbilityReadiness {
  const fail = (reason: AbilityReadiness['reason'], message: string, cooldown = 0): AbilityReadiness => ({ ok: false, reason, message, cooldown });
  if (!Object.hasOwn(ABILITIES, id) || !Object.hasOwn(state.objects, targetId)) return fail('target', 'Choose a valid world and influence.');
  const ability = ABILITIES[id], object = state.objects[targetId];
  const civ = civilizationAt(state, targetId, true);
  if (ability.requires && !hasTechnology(state, ability.requires)) return fail('locked', `Requires ${TECHNOLOGIES[ability.requires].name} research.`);
  if (ability.target === 'planet' && !object.planet || ability.target === 'civilization' && !civ || ability.target === 'asteroid' && object.type !== 'asteroid') return fail('target', `This influence needs ${ability.target === 'asteroid' ? 'an' : 'a'} ${ability.target}.`);
  if (id === 'terraform' && object.planet!.water >= 1 && object.planet!.atmosphere >= 1 && Math.abs(object.planet!.temperature - 288) <= 0.01) return fail('opportunity', 'Water, atmosphere and temperature are already settled.');
  if (id === 'push' || id === 'pull') {
    const next = orbitAfterInfluence(object, id);
    if (!next || (id === 'push' ? next.radius <= object.orbit!.radius : next.radius >= object.orbit!.radius)) return fail('opportunity', `The orbit cannot move farther ${id === 'push' ? 'outward' : 'inward'}.`);
  }
  if (id === 'gravityUp' && object.planet!.gravity >= INFLUENCE_BALANCE.gravityMax || id === 'gravityDown' && object.planet!.gravity <= INFLUENCE_BALANCE.gravityMin) return fail('opportunity', 'Gravity has reached this influence limit.');
  if (id === 'protect' && object.shieldUntil >= state.time + 600) return fail('opportunity', 'This world already has at least ten minutes of shelter.');
  if (id === 'gift' && civ!.stability >= 1 && civ!.supportUntil >= state.time + 600) return fail('opportunity', 'This civilization already has stability and support.');
  if (id === 'inspire' && (!civ!.researching || civ!.researchPoints >= TECHNOLOGIES[civ!.researching].cost)) return fail('opportunity', 'Wait for a new research question.');
  if (id === 'capture') {
    if (object.parentId && !state.objects[object.parentId]) return fail('target', 'The asteroid needs a valid orbit parent.');
    if (object.parentId && state.objects[object.parentId].planet) return fail('opportunity', 'This asteroid is already a planetary companion.');
    if (!Object.values(state.objects).some(o => o.systemId === object.systemId && o.planet)) return fail('target', 'A planet in this system is needed for capture.');
  }
  const cooldown = abilityCooldown(state, id, targetId);
  if (cooldown > 0) return fail('cooldown', 'This influence is still recovering.', cooldown);
  if (!canAfford(state, ability.cost)) return fail('resources', 'Gather the resources for this influence.');
  return { ok: true, reason: 'ready', cooldown: 0, message: 'Ready to influence this world.' };
}
export function useAbility(state: Universe, id: string, targetId: string): ActionResult {
  const readiness = abilityReadiness(state, id, targetId);
  if (!readiness.ok) return readiness;
  const ability = ABILITIES[id], object = state.objects[targetId], civ = civilizationAt(state, targetId, true);
  spend(state, ability.cost);
  state.cooldowns[`${id}:${ability.target === 'civilization' ? civ!.planetId : targetId}`] = state.time + ability.cooldown;
  if (id === 'push' || id === 'pull') for (const key of ['push', 'pull']) state.cooldowns[`${key}:${targetId}`] = state.time + ability.cooldown;
  if (id === 'terraform') { const p = object.planet!; p.temperature += (288 - p.temperature) * 0.5; p.water = Math.min(1, p.water + 0.06); p.atmosphere = Math.min(1, p.atmosphere + 0.06); }
  if (id === 'fertility') { object.life!.progress += 90; object.upgrades.biodiversity = Math.min(20, object.upgrades.biodiversity + 1); }
  if (id === 'protect') object.shieldUntil = Math.max(object.shieldUntil, state.time + 600);
  if (id === 'gift') { civ!.stability = Math.min(1, civ!.stability + 0.12); civ!.supportUntil = Math.max(civ!.supportUntil, state.time + 600); }
  if (id === 'inspire') civ!.researchPoints += 120;
  if (id === 'push' || id === 'pull') { const next = orbitAfterInfluence(object, id)!; object.orbit!.radius = next.radius; object.orbit!.period = next.period; object.planet!.temperature = next.temperature; }
  if (id === 'gravityUp' || id === 'gravityDown') {
    const old = object.planet!.gravity; object.planet!.gravity = Math.max(INFLUENCE_BALANCE.gravityMin, Math.min(INFLUENCE_BALANCE.gravityMax, old * (id === 'gravityUp' ? 1.2 : 0.8)));
    for (const child of object.children) if (state.objects[child].orbit) state.objects[child].orbit!.period = Math.max(1, state.objects[child].orbit!.period * Math.sqrt(old / object.planet!.gravity));
  }
  if (id === 'capture') {
    const captureHome = Object.values(state.objects).find(o => o.systemId === object.systemId && o.planet)!.id;
    const parent = object.parentId ? state.objects[object.parentId] : null; if (parent) parent.children = parent.children.filter(child => child !== targetId);
    object.parentId = captureHome; state.objects[captureHome].children.push(targetId); object.systemId = state.objects[captureHome].systemId;
    object.orbit = { radius: 42, period: 32, eccentricity: 0.02, phase: 0 };
  }
  if (object.planet) object.planet.habitability = habitability(object, state);
  if (civ) civilizationEvent(state, civ, 'Intervention', `${civ.name}: ${ability.name}`, `${object.name}: ${ability.description}`);
  else logEvent(state, 'Intervention', targetId, `${object.name}: ${ability.name}`, ability.description);
  return { ok: true, message: 'A small intervention. A different future.' };
}
export function maximumSpeed(state: Universe): number { return state.meta.runs > 0 ? 100 : hasTechnology(state, 'interstellar') ? 25 : hasTechnology(state, 'fusion') ? 10 : hasTechnology(state, 'spaceflight') ? 5 : Object.keys(state.civilizations).length ? 2 : 1; }
