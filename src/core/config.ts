import type { Cost, UpgradeId } from './types.ts';
export const BALANCE = {
  offlineCap: 86400, decisionInterval: 30, maxEvents: 160,
  production: { energy: 2, matter: 0.7, minerals: 1, biology: 0.15 },
  costGrowth: 1.7, maxUpgrade: 20, resourceLimit: 1e100, maxObjects: 256,
  exploration: { cost: { energy: 90, minerals: 30 }, duration: 45, unlockUpgrades: 2 }, asteroidYield: 2.5,
  life: { simpleAt: 60, complexAt: 240, intelligentAt: 540, growth: 0.006, eventChance: 0.008, minimumHabitability: 0.35 },
  civilization: { basePopulation: 1000, growth: 0.0008, capacity: 1e7, research: 1.5, collapseDelay: 180, maxHistory: 100 }
};
export const SAVE_VERSION = 4;
export const UPGRADES: Record<UpgradeId, { name: string; description: string; cost: Cost }> = {
  solar: { name: 'Solar collection', description: 'Harvest starlight. +2 energy / second.', cost: { minerals: 15, matter: 8 } },
  mining: { name: 'Deep mining', description: 'Reach rich seams. +1.5 minerals / second.', cost: { energy: 30, matter: 12 } },
  atmosphere: { name: 'Atmosphere stabilization', description: 'Shelter your world. Improves habitability.', cost: { energy: 60, minerals: 25 } },
  oceans: { name: 'Ocean expansion', description: 'Make room for life. More water and biological potential.', cost: { matter: 40, energy: 50 } },
  biodiversity: { name: 'Ecosystem sanctuary', description: 'Nurture a varied ecosystem. More biological potential.', cost: { biology: 18, minerals: 35 } }
};
