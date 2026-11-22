import type { Block, Item } from '../EngineTypes';
import type { Recipe } from '../craft/RecipeBook';
import type { FuelDefinition, ProcessingRecipe, StationDefinition } from '../stations/StationTypes';
import type { TransformationAsset } from '../../assets/transformations/types';
import type { Species, Activity } from '../ecosystem/Habitat';
import type { WorldFeatureAsset } from '../../assets/features/types';
import type { OreDepositFeature, TreeFeature } from '../worldgen/features/types';

export type Behavior =
  | { action: 'flee'; target: string; radius: number }
  | { action: 'graze' }
  | { action: 'activity'; when: 'night' | 'rain'; result: Activity };

export interface SpeciesAsset {
  config: Species['config'] & { spawn: { weight: number; biomes: string[] } };
  behaviors: Behavior[];
  sprite: { rows: string[]; palette: Record<string, string> };
}

export interface BiomeVariant {
  rain?: number;
  name: string;
  parent: string;
  minHumidity: number;
  sinceGeneration: number;
}

export interface SurfaceScatter {
  id: string;
  block: string;
  substrate: string;
  minHumidity: number;
  probability: number;
  sinceGeneration: number;
}

export interface ContentPack {
  id: string;
  schemaVersion: 1;
  dependencies?: string[];
  structures?: WorldFeatureAsset[];
  oreDeposits?: (OreDepositFeature & { sinceGeneration: number })[];
  trees?: (TreeFeature & { sinceGeneration: number })[];
  blocks?: Record<string, Omit<Block, 'texture'> & { texture?: Pick<NonNullable<Block['texture']>, 'base' | 'detail'> }>;
  items?: Record<string, Item>;
  scatter?: SurfaceScatter[];
  species?: SpeciesAsset[];
  biomes?: BiomeVariant[];
  transformations?: TransformationAsset[];
  recipes?: Recipe[];
  stations?: StationDefinition[];
  processes?: ProcessingRecipe[];
  fuels?: FuelDefinition[];
}
