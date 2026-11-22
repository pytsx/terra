export const TILE = 24, WORLD_W = 700, WORLD_H = 256;
export const LEGACY_WORLD_H = 158;
export const CURRENT_GENERATION = 6;
export const CHUNK_WIDTH = 64, CHUNK_HEIGHT = 32, BELT_SIZE = 9;

export interface Texture {
  base?: string;
  grain?: { count: number; colors: readonly string[]; max: number };
  veins?: readonly string[];
  detail?: readonly { x: number; y: number; w: number; h: number; color: string }[];
}
export interface Light { radius: number; power: number; flicker?: number; offsetY?: number; glow?: string }
export interface FluidConfig { kind: 'water' | 'lava'; viscosity: number; spread: number; pressure: number }
export interface Block {
  tilledBlock?: string; fertile?: boolean; support?: string; toggle?: string; openChannel?: boolean;
  bonusDrop?: { item: string; amount: number }; spentSoil?: string; permeability?: number; waterCapacity?: number;
  fluid?: FluidConfig; id: number; name: string; color: string; solid: boolean; hardness: number | null;
  gravity?: boolean; mineTier?: number; drop: string | null; craftSize?: 3; texture?: Texture; light?: Light;
  biome?: string; foliage?: string; spawnDecoration?: { offsets: readonly number[] };
}
export type ToolIcon = string;
export const ARMOR_SLOTS = ['head', 'chest', 'legs', 'feet'] as const;
export type ArmorSlot = (typeof ARMOR_SLOTS)[number];
export interface Item {
  waterTransfer?: { direction: 'fill' | 'pour'; result: string; message: string };
  name: string; kind?: 'item' | 'material' | 'consumable' | 'tool' | 'armor' | 'block';
  hit?: { damage: number; reach: number; cooldown: number }; use?: { effect: 'heal'; amount: number };
  tool?: { role: string; mineTier?: number; miningMultiplier?: number; durability?: number; hit?: Item['hit'] };
  armor?: { slot: ArmorSlot; bonusLife: number; durability: number }; block?: string; icon?: ToolIcon;
  initial?: number; slot?: number; unique?: boolean; color?: string;
}
export type ItemId = string;
export interface Stack { item: ItemId; amount: number; durability?: number }
export type Slot = Stack | null;
export interface SlotRef { area: 'bag' | 'grid' | 'equipment'; index: number }
