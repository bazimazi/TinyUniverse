import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { worldsForSelection } from '../src/ui/worlds.ts';

test('a full favorite list always includes the selected world and its local system first', () => {
  const state = createUniverse(41, 0); for (let i = 0; i < 17; i++) generateSystem(state, i);
  for (const object of Object.values(state.objects)) object.favorite = true;
  const selected = Object.values(state.objects).filter(o => o.planet).at(-1)!; selected.favorite = false; state.selectedId = selected.id;
  const worlds = worldsForSelection(state);
  assert.equal(worlds.length, 40); assert.equal(worlds[0].id, selected.id);
  for (const local of Object.values(state.objects).filter(o => o.systemId === selected.systemId)) assert.ok(worlds.some(o => o.id === local.id));
  assert.equal(new Set(worlds.map(o => o.id)).size, worlds.length);
});

test('world lists retain selection at small limits and include remote favorites after local worlds', () => {
  const state = createUniverse(41, 0), system = generateSystem(state, 0); state.objects[system.starId].favorite = true;
  assert.deepEqual(worldsForSelection(state, 1).map(o => o.id), ['planet-0']);
  assert.deepEqual(worldsForSelection(state).map(o => o.id), ['planet-0', 'star-0', system.starId]);
});
