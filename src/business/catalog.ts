import { modularBlocks, modularItems, type BlockAssetScript } from '../assets';
import type { Immutable } from '../assets/immutable';
export { permeabilityFor } from '../assets/blocks/permeability';
export const TILE = 24,
  WORLD_W = 700,
  WORLD_H = 256;
export const LEGACY_WORLD_H = 158;
export const CURRENT_GENERATION = 5;
export const CHUNK_WIDTH = 64;
export const CHUNK_HEIGHT = 32;
export const BELT_SIZE = 9;
export interface Texture {
  base?: string;
  grain?: { count: number; colors: string[]; max: number };
  veins?: string[];
  detail?: { x: number; y: number; w: number; h: number; color: string }[];
}
export interface Light {
  radius: number;
  power: number;
  flicker?: number;
  offsetY?: number;
  glow?: string;
}
export interface FluidConfig {
  kind: 'water' | 'lava';
  viscosity: number;
  spread: number;
  pressure: number;
}
export interface Block {
  fertile?: boolean;
  support?: string;
  toggle?: string;
  openChannel?: boolean;
  bonusDrop?: { item: string; amount: number };
  spentSoil?: string;
  permeability?: number;
  waterCapacity?: number;
  fluid?: FluidConfig;
  id: number;
  name: string;
  color: string;
  solid: boolean;
  hardness: number | null;
  gravity?: boolean;
  mineTier?: number;
  drop: string | null;
  craftSize?: 3;
  texture?: Texture;
  light?: Light;
  biome?: string;
  foliage?: string;
  spawnDecoration?: { offsets: number[] };
}
export type ToolIcon = string;
export const ARMOR_SLOTS = ['head', 'chest', 'legs', 'feet'] as const;
export type ArmorSlot = (typeof ARMOR_SLOTS)[number];
export interface Item {
  name: string;
  kind?: 'item' | 'material' | 'consumable' | 'tool' | 'armor' | 'block';
  hit?: { damage: number; reach: number; cooldown: number };
  use?: { effect: 'heal'; amount: number };
  tool?: { role: string; mineTier?: number; miningMultiplier?: number; durability?: number; hit?: Item['hit'] };
  armor?: { slot: ArmorSlot; bonusLife: number; durability: number };
  block?: string;
  icon?: ToolIcon;
  initial?: number;
  slot?: number;
  unique?: boolean;
  color?: string;
}
export type ItemId = string;
export const ITEMS: Immutable<Record<string, Item>> = Object.freeze(Object.fromEntries(
  Object.entries(modularItems).map(([key, asset]) => [key, asset.config]),
) as Immutable<Record<string, Item>>);
export const BLOCK_ASSETS = modularBlocks;
export const ITEM_ASSETS = modularItems;
const definitions = Object.fromEntries(
  Object.entries(modularBlocks).map(([key, asset]) => [key, asset.config]),
) as Immutable<Record<string, Block>>;
export const BLOCKS: Immutable<Record<number, Block>> = Object.freeze(Object.fromEntries(
  Object.values(definitions).map((b) => [b.id, b]),
));
export const B: Readonly<Record<string, number>> = Object.freeze(Object.fromEntries(
  Object.entries(definitions).map(([key, b]) => [key, b.id]),
));
export const BLOCK_SCRIPTS: Immutable<Record<number, BlockAssetScript>> = Object.freeze(
  Object.fromEntries(Object.values(modularBlocks).map(({ config, script }) => [config.id, script])),
);
export const NON_SOLID: ReadonlySet<number> = new Set(
  Object.values(definitions)
    .filter((b) => !b.solid)
    .map((b) => b.id),
);
const usedIds = new Set<number>();
for (const [key, block] of Object.entries(definitions)) {
  if (
    !Number.isInteger(block.id) ||
    block.id < 0 ||
    block.id > 65535 ||
    usedIds.has(block.id) ||
    (block.drop !== null && !Object.hasOwn(ITEMS, block.drop)) ||
    (block.hardness !== null && !(block.hardness > 0))
  )
    throw new Error('Definição de bloco inválida: ' + key);
  usedIds.add(block.id);
}
const initialBeltSlots = new Set<number>();
for (const [id, item] of Object.entries(ITEMS)) {
  if (item.initial !== undefined && (!Number.isSafeInteger(item.initial) || item.initial < 0))
    throw new Error('Quantidade inicial inválida: ' + id);
  if (item.slot !== undefined) {
    if (
      !Number.isInteger(item.slot) ||
      item.slot < 0 ||
      item.slot >= BELT_SIZE ||
      initialBeltSlots.has(item.slot)
    )
      throw new Error('Atalho inicial inválido: ' + id);
    initialBeltSlots.add(item.slot);
  }
  if (item.block && !Object.hasOwn(B, item.block)) throw new Error('Bloco desconhecido para ' + id);
  if (item.tool?.durability !== undefined && (!Number.isSafeInteger(item.tool.durability) || item.tool.durability <= 0))
    throw new Error('Durabilidade de ferramenta inválida: ' + id);
  if (item.armor && (
    !ARMOR_SLOTS.includes(item.armor.slot) || !Number.isSafeInteger(item.armor.durability) ||
    item.armor.durability <= 0 || !Number.isInteger(item.armor.bonusLife) || item.armor.bonusLife <= 0
  )) throw new Error('Armadura inválida: ' + id);
}
export function placedTile(item: string) {
  const key = ITEMS[item]?.block;
  return key ? B[key] : undefined;
}
export interface Stack {
  item: ItemId;
  amount: number;
  durability?: number;
}
export type Slot = Stack | null;
export interface SlotRef {
  area: 'bag' | 'grid' | 'equipment';
  index: number;
}
