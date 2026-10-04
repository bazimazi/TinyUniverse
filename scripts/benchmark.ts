import { createUniverse, makeObject } from '../src/core/universe.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { discoverGalaxy } from '../src/gameplay/galaxies.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
const state = createUniverse(42, 0);
for (let index = 0; index < 47; index++) generateSystem(state, index);
for (let index = 1; index < 64; index++) discoverGalaxy(state, index);
const start = performance.now(); advance(state, 86400); const elapsed = performance.now() - start;
assertUniverse(state);
console.log(`24h simulation: ${elapsed.toFixed(2)}ms, ${Object.keys(state.objects).length} objects, ${JSON.stringify(state).length} save bytes`);
if (elapsed > 2000) throw new Error('Offline simulation exceeded the 2s budget.');

const automated = createUniverse(42, 0);
for (let index = 0; index < 47; index++) generateSystem(automated, index);
for (let index = 1; index < 64; index++) discoverGalaxy(automated, index);
for (let index = 0; index < 16; index++) {
  const system = Object.values(automated.systems)[index], asteroid = makeObject(automated.seed, `benchmark-asteroid-${index}`, 'asteroid', system.starId);
  asteroid.systemId = system.id; automated.objects[asteroid.id] = asteroid; automated.objects[system.starId].children.push(asteroid.id);
}
foundCivilization(automated, 'planet-0').technologies = ['ai', 'spaceflight', 'interstellar'];
automated.totalUpgrades = 2; automated.exploration.completed.orbital = 3;
automated.automation = { explore: true, develop: true, assist: true, research: true, mine: true };
for (const resource of Object.keys(automated.resources) as (keyof typeof automated.resources)[]) automated.resources[resource] = 100000;
const automatedStart = performance.now(); advance(automated, 86400); const automatedElapsed = performance.now() - automatedStart;
assertUniverse(automated);
const outposts = Object.values(automated.objects).filter(o => o.type === 'asteroid' && o.mined).length;
if (outposts !== 16) throw new Error('Automation did not establish every benchmark mining outpost.');
const habitats = Object.values(automated.megastructures).filter(s => s.type === 'habitat' && s.status === 'complete').length;
if (!habitats) throw new Error('The benchmark did not exercise completed habitat support.');
const impacts = Object.values(automated.objects).filter(o => o.asteroid?.status === 'spent').length;
if (!impacts) throw new Error('The benchmark did not resolve any asteroid debris showers.');
console.log(`24h with automation: ${automatedElapsed.toFixed(2)}ms, ${Object.keys(automated.objects).length} objects, ${outposts} mining outposts, ${habitats} completed habitats, ${impacts} debris showers resolved, ${automated.exploration.completed.interstellar} stellar surveys`);
if (automatedElapsed > 2000) throw new Error('Automated offline simulation exceeded the 2s budget.');
