export const RESOURCE_IDS = ['energy', 'matter', 'minerals', 'biology', 'knowledge', 'exotic', 'stellar', 'quantum'] as const;
export type ResourceId = typeof RESOURCE_IDS[number];
export type Resources = Record<ResourceId, number>;
export type Cost = Partial<Resources>;
export type ObjectType = 'planet' | 'star' | 'moon' | 'asteroid' | 'gas-giant' | 'nebula' | 'black-hole' | 'neutron-star' | 'white-dwarf';
export type UpgradeId = 'solar' | 'mining' | 'atmosphere' | 'oceans' | 'biodiversity';
export interface Orbit { radius: number; period: number; eccentricity: number; phase: number }
export interface PlanetProperties {
  temperature: number; atmosphere: number; water: number; magneticField: number;
  habitability: number; biodiversity: number; gravity: number;
}
export type LifeStage = 'chemistry' | 'simple' | 'complex' | 'intelligent';
export interface Ecosystem {
  stage: LifeStage; progress: number; species: number;
  populations: { microorganisms: number; plants: number; herbivores: number; predators: number; aquatic: number; flying: number };
}
export interface CelestialObject {
  id: string; seed: number; type: ObjectType; name: string; mass: number; radius: number;
  createdAt: number; parentId: string | null; children: string[]; orbit: Orbit | null;
  color: string; upgrades: Record<UpgradeId, number>; planet: PlanetProperties | null;
  favorite: boolean; mined: boolean; deposit: number; life: Ecosystem | null; shieldUntil: number;
  systemId: string; stellar: StellarState | null; lastLifeUpdate: number;
}
export interface StellarState { class: 'red-dwarf' | 'yellow' | 'blue'; stage: 'main-sequence' | 'giant' | 'remnant'; solarMass: number; luminosity: number; temperature: number; lifespan: number; fuel: number; spin: number }
export interface StarSystem { id: string; seed: number; name: string; starId: string; position: { x: number; y: number }; galaxyId: string }
export interface Galaxy { id: string; seed: number; name: string; totalSystems: number; surveyed: number; backgroundCivilizations: number; backgroundPopulation: number; lastUpdate: number }
export type ExploreKind = 'orbital' | 'interstellar' | 'galactic';
export interface ExplorationJob { kind: ExploreKind; targetId: string; startedAt: number; endsAt: number; index: number }
export interface ExplorationState { job: ExplorationJob | null; completed: Record<ExploreKind, number> }
export interface GameEvent {
  id: string; type: string; time: number; targetId: string; title: string; detail: string;
  severity: 'info' | 'wonder' | 'danger';
}
export interface Settings { reducedMotion: boolean; highContrast: boolean; largeText: boolean; sound: boolean }
export type Domain = 'biology' | 'physics' | 'energy' | 'computing' | 'materials' | 'space' | 'social' | 'gravity' | 'quantum';
export interface Civilization {
  id: string; seed: number; name: string; planetId: string; foundedAt: number; population: number;
  status: 'active' | 'extinct'; traits: string[]; culture: string; government: string;
  stability: number; science: number; energy: number; economy: number; infrastructure: number;
  military: number; knowledge: number; level: number; distress: number;
  domains: Record<Domain, number>; technologies: string[]; researching: string | null; researchPoints: number;
  timeline: GameEvent[]; followed: boolean; colonies: string[]; supportUntil: number; lastUpdate: number;
  archetype: 'seekers' | 'stewards' | 'builders' | 'conquerors'; industry: number;
}
export interface Relation { id: string; a: string; b: string; score: number; status: 'neutral' | 'trade' | 'alliance' | 'war'; lastUpdate: number }
export type StructureType = 'habitat' | 'dyson' | 'wormhole' | 'black-hole-generator';
export interface Megastructure { id: string; type: StructureType; civilizationId: string; systemId: string; startedAt: number; endsAt: number; status: 'building' | 'complete' }
export interface Universe {
  version: number; seed: number; time: number; lastTimestamp: number; selectedId: string;
  resources: Resources; objects: Record<string, CelestialObject>; events: GameEvent[];
  settings: Settings; totalUpgrades: number; exploration: ExplorationState; civilizations: Record<string, Civilization>;
  cooldowns: Record<string, number>; speed: number;
  systems: Record<string, StarSystem>;
  galaxies: Record<string, Galaxy>;
  relations: Record<string, Relation>; megastructures: Record<string, Megastructure>;
}
export interface ActionResult { ok: boolean; message: string }
export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void }
