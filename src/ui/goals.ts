import type { Universe } from '../core/types.ts';
import type { Panel } from './panels.ts';
import { hasTechnology } from '../simulation/civilizations.ts';
import { canRebirth } from '../gameplay/prestige.ts';

export interface Goal { title: string; detail: string; panel: Panel; targetId: string; label: string }
export function nextGoal(state: Universe): Goal {
  const home = state.objects['planet-0'];
  const goal = (title: string, detail: string, panel: Panel, targetId: string, label: string): Goal => ({ title, detail, panel, targetId, label });
  if (state.totalUpgrades === 0) return goal('Catch your first starlight', 'Solar collection gives your world more energy for its next steps.', 'develop', home.id, `Develop ${home.name}`);
  if (state.totalUpgrades < 2) return goal('Build your first little probe', 'Deep mining supplies minerals. A second upgrade unlocks orbital exploration.', 'develop', home.id, 'Develop your world');
  if (state.exploration.completed.orbital === 0) return goal('Find your first companion', state.exploration.job ? 'Your probe is on its way. Its journey continues while you care for your world.' : 'Send a probe beyond your world to discover its first moon.', 'explore', home.id, 'View expedition');
  const civilizations = Object.values(state.civilizations);
  if (!civilizations.length) {
    const world = state.objects[state.selectedId].planet ? state.objects[state.selectedId] : home;
    return world.planet!.habitability < 0.7 ? goal('Make room for complex life', 'Stabilize the atmosphere, expand the oceans and nurture biodiversity. The evolution bar shows what comes next.', 'develop', world.id, `Care for ${world.name}`) : goal('Wait for the first curious minds', 'Healthy ecosystems evolve naturally. A sanctuary can help life flourish.', 'develop', world.id, 'Watch life evolve');
  }
  const active = civilizations.find(c => c.status === 'active');
  if (canRebirth(state)) return goal('Carry your discoveries into a new universe', 'Your Dyson swarm opens another Big Bang. Discoveries and universal laws travel with you.', 'prestige', active?.planetId ?? home.id, 'Review rebirth');
  if (!active && !hasTechnology(state, 'spaceflight')) {
    const recorded = new Set(civilizations.map(c => c.planetId));
    const world = Object.values(state.objects).find(o => o.planet && !recorded.has(o.id));
    return world ? goal('Give life another chance', 'The old histories remain. Care for this world and give a new culture room to emerge.', 'develop', world.id, `Care for ${world.name}`) : goal('Find another home for life', 'Your first culture fell silent. An orbital expedition can reveal a fresh world.', 'explore', home.id, 'Explore new worlds');
  }
  if (!hasTechnology(state, 'spaceflight')) return goal('A civilization is finding its way', 'Its research follows its own strengths. Watch its progress and support it with gentle influence.', 'civilizations', active!.planetId, 'Follow its story');
  if (Object.keys(state.systems).length === 1) return goal('Reach another star', 'Spaceflight opens an interstellar expedition. Gather energy and knowledge for the journey.', 'explore', active?.planetId ?? home.id, 'Explore the stars');
  if (!hasTechnology(state, 'interstellar')) return goal('Build a bridge between worlds', 'Fusion, AI and gravity engineering open interstellar civilization. Research takes its own path.', 'research', active?.planetId ?? home.id, 'View research');
  if (Object.keys(state.galaxies).length === 1) return goal('Beyond the galactic horizon', 'Launch a galactic expedition and chart a new reach.', 'explore', active?.planetId ?? home.id, 'Explore a galaxy');
  return goal('Harvest the light of a star', 'A civilization can build a Dyson swarm when its technology and industry are ready. You can also fund construction.', 'civilizations', civilizations.find(c => c.status === 'active' && c.technologies.includes('dyson'))?.planetId ?? active?.planetId ?? home.id, 'View civilizations');
}
