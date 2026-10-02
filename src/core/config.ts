import type { Cost, UpgradeId } from './types.ts';
export const BALANCE = {
  offlineCap: 86400, decisionInterval: 30, maxEvents: 160,
  production: { energy: 2, matter: 0.7, minerals: 1, biology: 0.15 },
  costGrowth: 1.7, maxUpgrade: 20, resourceLimit: 1e100, maxObjects: 256,
  exploration: { cost: { energy: 90, minerals: 30 }, duration: 45, unlockUpgrades: 2 }, asteroidYield: 2.5,
  life: { simpleAt: 60, complexAt: 240, intelligentAt: 540, growth: 0.006, eventChance: 0.008, minimumHabitability: 0.35 },
  civilization: { basePopulation: 1000, growth: 0.0008, capacity: 1e7, research: 1.5, collapseDelay: 180, maxHistory: 48 }
};
export const SAVE_VERSION = 9;
export const DISCOVERY_BALANCE = { anomalyChance: 0.3, maxAnomalies: 64, investigation: 60, resolution: 90, rewardKnowledge: 350, rewardExotic: 60 };
export const ADVANCED_BALANCE = { diplomacyInterval: 600, maxStructures: 64, maxRelations: 512, warLoss: 0.04, allianceAt: 60, tradeAt: 25, warAt: -45 };
export const GALAXY_BALANCE = { maxDetailedSystems: 48, maxGalaxies: 64, nearbyInterval: 120, backgroundInterval: 600, expansionInterval: 1800, cost: { energy: 8000, knowledge: 400 }, duration: 180, populationGrowth: 0.00001 };
export const STELLAR_BALANCE = { lifetime: 86400 * 45, giantAt: 0.8, giantLuminosity: 2.5, remnantLuminosity: 0.025, interstellarCost: { energy: 2000, knowledge: 150 }, interstellarDuration: 120 };
export const UPGRADES: Record<UpgradeId, { name: string; description: string; cost: Cost }> = {
  solar: { name: 'Solar collection', description: 'Harvest starlight. +2 energy / second.', cost: { minerals: 15, matter: 8 } },
  mining: { name: 'Deep mining', description: 'Reach rich seams. +1.5 minerals / second.', cost: { energy: 30, matter: 12 } },
  atmosphere: { name: 'Atmosphere stabilization', description: 'Shelter your world. Improves habitability.', cost: { energy: 60, minerals: 25 } },
  oceans: { name: 'Ocean expansion', description: 'Make room for life. More water and biological potential.', cost: { matter: 40, energy: 50 } },
  biodiversity: { name: 'Ecosystem sanctuary', description: 'Nurture a varied ecosystem. More biological potential.', cost: { biology: 18, minerals: 35 } }
};
