import type { Slot, Stack } from './catalog';
export type TileEdit = [index: number, block: number] | [x: number, y: number, block: number];
export type BlockDamage = [index: number, fraction: number] | [x: number, y: number, fraction: number];
export type ExploredSection = [chunkX: number, chunkY: number, rle: number[]];
export interface PlayerSave {
  x: number;
  y: number;
  life: number;
  depthMax: number;
  placed: number;
}
export interface DroppedSave extends Stack {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  pickupDelay?: number;
}
export interface ExpeditionSave {
  version: 4;
  generationVersion?: number;
  seed: string;
  edits: TileEdit[];
  ecologicalSoil?: [number, number][];
  water?: import('./world/Hydrology').WaterCell[];
  weather?: import('./world/RegionalWeather').WeatherRecord;
  weatherMode?: import('./commands').WeatherMode;
  weatherUntil?: number;
  raining?: boolean;
  damage?: BlockDamage[];
  exploration?: ExploredSection[];
  player: PlayerSave;
  slots: Slot[];
  equipment?: Slot[];
  elapsed: number;
  selected: number;
  zoom: number;
  placementMode?: import('./commands').PlacementMode;
  drops?: DroppedSave[];
}
// O domínio define o contrato. Adaptadores são escolhidos na composição do jogo.
export interface SaveRepository {
  load(): Promise<ExpeditionSave | null>;
  write(save: ExpeditionSave): Promise<void>;
}
