import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { discoverGalaxy } from '../src/gameplay/galaxies.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
import { advance } from '../src/simulation/engine.ts';
import { simulationTier } from '../src/core/tiers.ts';
import { assertUniverse } from '../src/core/invariants.ts';
test('galaxies are lazy and tiers distinguish selected, neighboring and distant worlds', () => {
  const state = createUniverse(7, 0); generateSystem(state, 0); discoverGalaxy(state, 1);
  assert.equal(Object.keys(state.systems).length, 3); assert.ok(state.galaxies['galaxy-1'].totalSystems > 1000);
  assert.equal(simulationTier(state, state.objects['planet-0']), 'active');
  assert.equal(simulationTier(state, state.objects['galaxy-0-system-0-star']), 'nearby');
  assert.equal(simulationTier(state, state.objects['galaxy-1-system-0-star']), 'background'); assertUniverse(state);
});
test('civilizations colonize habitable worlds instead of every entity being simulated individually', () => {
  const state = createUniverse(7, 0), civ = foundCivilization(state, 'planet-0'); civ.technologies = ['spaceflight', 'interstellar']; civ.traits = ['Expansionist'];
  const system = generateSystem(state, 0); advance(state, 1800);
  assert.ok(civ.colonies.some(id => state.objects[id].systemId === system.id)); assertUniverse(state);
});
