import type { Slot, Stack } from '../catalog';

export type EnergyDefinition =
  | { type: 'none' }
  | { type: 'manual'; workRate: number }
  | { type: 'hydraulic'; workPerVolume: number }
  | { type: 'thermal'; acceptedFuels: readonly string[]; maxTemperature: number; heatingRate: number; coolingRate: number };

export interface StationDefinition {
  id: string; name: string; block: string; mode: 'crafting' | 'processing';
  capabilities: readonly string[];
  storage?: { inputSlots: number; outputSlots: number; fuelSlots: number; stackLimit: number };
  processing?: { speed: number; automaticRepeat: boolean };
  energy: EnergyDefinition;
}
export interface ProcessingRecipe {
  id: string; requires: readonly string[]; inputs: readonly Stack[]; outputs: readonly Stack[];
  work: number; conditions?: { minTemperature?: number; maxTemperature?: number };
}
export interface FuelDefinition { item: string; burnDuration: number; targetTemperature: number }
export interface ProcessingJob {
  recipeId: string; elapsedWork: number; requiredWork: number; reservedInputs: Stack[];
  status: 'processing' | 'paused' | 'blocked';
}
export interface ThermalEnergyState {
  temperature: number; targetTemperature: number;
  burningFuel: { item: string; remainingSeconds: number; totalSeconds: number; targetTemperature: number } | null;
}
export interface StationSave {
  id: string; definitionId: string; x: number; y: number; revision: number;
  input: Slot[]; output: Slot[]; fuel: Slot[]; enabled: boolean; selectedRecipe?: string;
  process: ProcessingJob | null; energyState: ThermalEnergyState;
}
export interface StationInstance extends StationSave { manualWork: boolean }
export interface StationStoreSave { nextId: number; records: StationSave[] }
