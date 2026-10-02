export const RESOURCE_IDS = ['energy', 'matter', 'minerals', 'biology'] as const;
export type ResourceId = typeof RESOURCE_IDS[number];
export type Resources = Record<ResourceId, number>;
export type Cost = Partial<Resources>;
export type ObjectType = 'planet' | 'star' | 'moon' | 'asteroid';
export type UpgradeId = 'solar' | 'mining' | 'atmosphere' | 'oceans' | 'biodiversity';
export interface Orbit { radius: number; period: number; eccentricity: number; phase: number }
export interface PlanetProperties {
  temperature: number; atmosphere: number; water: number; magneticField: number;
  habitability: number; biodiversity: number; gravity: number;
}
export interface CelestialObject {
  id: string; seed: number; type: ObjectType; name: string; mass: number; radius: number;
  createdAt: number; parentId: string | null; children: string[]; orbit: Orbit | null;
  color: string; upgrades: Record<UpgradeId, number>; planet: PlanetProperties | null;
  favorite: boolean; mined: boolean; deposit: number;
}
export type ExploreKind = 'orbital';
export interface ExplorationJob { kind: ExploreKind; targetId: string; startedAt: number; endsAt: number; index: number }
export interface ExplorationState { job: ExplorationJob | null; completed: Record<ExploreKind, number> }
export interface GameEvent {
  id: string; type: string; time: number; targetId: string; title: string; detail: string;
  severity: 'info' | 'wonder' | 'danger';
}
export interface Settings { reducedMotion: boolean; highContrast: boolean; largeText: boolean; sound: boolean }
export interface Universe {
  version: number; seed: number; time: number; lastTimestamp: number; selectedId: string;
  resources: Resources; objects: Record<string, CelestialObject>; events: GameEvent[];
  settings: Settings; totalUpgrades: number; exploration: ExplorationState;
}
export interface ActionResult { ok: boolean; message: string }
export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void }
