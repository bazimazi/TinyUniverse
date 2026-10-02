import { discover } from '../gameplay/discoveries.ts';
import { logEvent } from '../core/universe.ts';
import { TECHNOLOGIES } from '../core/technology.ts';
import type { Universe } from '../core/types.ts';
const TIERS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
export const ACHIEVEMENT_GROUPS = ['upgrades', 'worlds', 'systems', 'galaxies', 'species', 'civilizations', 'technologies', 'structures', 'discoveries', 'orbital-surveys', 'stellar-surveys', 'population'] as const;
export function achievementTitle(id: string): string { const [group, tier] = id.split(':'); return `${group.replaceAll('-', ' ')} · ${group === 'population' ? Number(tier) * 1000 : tier}`; }
export function simulateDiscoveries(state: Universe): void {
  const objects = Object.values(state.objects), civilizations = Object.values(state.civilizations), structures = Object.values(state.megastructures);
  for (const object of objects) discover(state, { id: `celestial:${object.type}`, title: `First ${object.type.replace('-', ' ')}`, category: 'celestial', sourceId: object.id, detail: `${object.name} opened a new page in your celestial atlas.`, rarity: object.type === 'black-hole' ? 4 : 1 });
  for (const object of objects) if (object.life?.stage !== 'chemistry' && object.life) discover(state, { id: `life:${object.life.stage}`, title: `First ${object.life.stage} life`, category: 'biological', sourceId: object.id, detail: `Life on ${object.name} found a new way to thrive.`, rarity: 1 });
  for (const civ of civilizations) {
    discover(state, { id: `civilization:${civ.archetype}`, title: `First ${civ.archetype} civilization`, category: 'civilization', sourceId: civ.planetId, detail: civ.name, rarity: 2 });
    if (civ.status === 'extinct') discover(state, { id: 'first-collapse', title: 'A silent world', category: 'historical', sourceId: civ.planetId, detail: `${civ.name} left ruins and memories.`, rarity: 2 });
    for (const tech of civ.technologies) discover(state, { id: `technology:${tech}`, title: TECHNOLOGIES[tech]?.name ?? tech, category: 'technology', sourceId: civ.planetId, detail: TECHNOLOGIES[tech]?.description ?? '', rarity: Math.min(5, 1 + Math.floor(civ.level / 3)) });
  }
  for (const structure of structures) if (structure.status === 'complete') discover(state, { id: `structure:${structure.type}`, title: `First ${structure.type} structure`, category: 'cosmic', sourceId: state.systems[structure.systemId].starId, detail: 'A civilization built beyond the scale of its home world.', rarity: 3 });
  const population = civilizations.reduce((n, c) => n + c.population, 0), species = objects.reduce((n, o) => n + (o.life?.species ?? 0), 0);
  state.records.peakPopulation = Math.max(state.records.peakPopulation, population);
  state.records.mostAdvanced = Math.max(state.records.mostAdvanced, ...civilizations.map(c => c.level));
  state.records.mostWorlds = Math.max(state.records.mostWorlds, objects.filter(o => o.planet).length);
  state.records.mostSpecies = Math.max(state.records.mostSpecies, species);
  state.records.longestCivilization = Math.max(state.records.longestCivilization, ...civilizations.map(c => state.time - c.foundedAt));
  const values = [state.totalUpgrades, state.records.mostWorlds, Object.keys(state.systems).length, Object.keys(state.galaxies).length, species, civilizations.length, new Set(civilizations.flatMap(c => c.technologies)).size, structures.filter(s => s.status === 'complete').length, Object.keys(state.discoveries).length, state.exploration.completed.orbital, state.exploration.completed.interstellar, population / 1000];
  const achieved = new Set(state.achievements);
  for (let i = 0; i < ACHIEVEMENT_GROUPS.length; i++) for (const tier of ACHIEVEMENT_GROUPS[i] === 'technologies' ? [1, 2, 3, 4, 5, 7, 9, 11, 14, 17] : ACHIEVEMENT_GROUPS[i] === 'structures' ? [1, 2, 3, 4, 6, 8, 12, 16, 32, 64] : TIERS) {
    const id = `${ACHIEVEMENT_GROUPS[i]}:${tier}`;
    if (values[i] >= tier && !achieved.has(id)) { state.achievements.push(id); logEvent(state, 'AchievementUnlocked', state.selectedId, `A small milestone: ${achievementTitle(id)}`, 'Remembered in your Discovery Codex.', 'wonder'); }
  }
}
