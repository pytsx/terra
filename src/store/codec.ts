import { ARMOR_SLOTS, BLOCKS, ITEMS, BELT_SIZE, TILE, WORLD_H, WORLD_W, type Slot } from '../business/catalog';
import { startingSlots } from '../business/inventory/Inventory';
import type { BlockDamage, DroppedSave, ExpeditionSave, ExploredSection, TileEdit, TransformationStateRecord } from '../business/save';
import { clamp } from '../shared/math';
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Formato de save inválido.');
  return value as Record<string, unknown>;
}
function numeric(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}
function decodeSlot(value: unknown): Slot {
  if (value === null) return null;
  const stack = object(value);
  if (typeof stack.item !== 'string' || !Object.hasOwn(ITEMS, stack.item) ||
    typeof stack.amount !== 'number' || !Number.isSafeInteger(stack.amount) || stack.amount <= 0)
    throw new Error('Pilha inválida.');
  const max = ITEMS[stack.item].armor?.durability ?? ITEMS[stack.item].tool?.durability;
  return max === undefined
    ? { item: stack.item, amount: stack.amount }
    : { item: stack.item, amount: stack.amount, durability: Math.floor(numeric(stack.durability, max, 1, max)) };
}
export function decodeSave(raw: string, legacyZoom: number): ExpeditionSave {
  const data = object(JSON.parse(raw));
  const legacy = data.v === 2 && data.version === undefined;
  if (!legacy && data.version !== 3 && data.version !== 4)
    throw new Error('Versão de save desconhecida.');
  if (typeof data.seed !== 'string' || !data.seed.trim() || !Array.isArray(data.edits))
    throw new Error('Mundo inválido.');
  const generationVersion = Math.floor(numeric(data.generationVersion, 1, 1, 5));
  const infinite = generationVersion >= 3;
  const player = object(data.player);
  if (
    typeof player.x !== 'number' ||
    typeof player.y !== 'number' ||
    !Number.isFinite(player.x) ||
    !Number.isFinite(player.y)
  )
    throw new Error('Posição inválida.');
  let slots: Slot[];
  if (data.version === 4) {
    if (
      !Array.isArray(data.slots) ||
      (data.slots.length !== 32 && (data.slots.length < BELT_SIZE * 4 || data.slots.length % BELT_SIZE))
    )
      throw new Error('Inventário inválido.');
    slots = data.slots.map(decodeSlot);
    if (slots.length === 32) slots = [...slots.slice(0, 8), null, ...slots.slice(8)];
    while (slots.length < BELT_SIZE * 4) slots.push(null);
  } else {
    const stock = object((legacy ? player.inv : data.stock) ?? {}),
      legacyStock: Record<string, number> = {};
    for (const [id, value] of Object.entries(stock)) {
      if (Object.hasOwn(ITEMS, id))
        legacyStock[id] = Math.floor(
          numeric(value, ITEMS[id].initial ?? 0, 0, Number.MAX_SAFE_INTEGER),
        );
    }
    const upgrades = Array.isArray(data.upgrades)
      ? data.upgrades.filter(
          (id): id is string =>
            typeof id === 'string' && Object.hasOwn(ITEMS, id) && !!ITEMS[id].unique,
        )
      : [];
    slots = startingSlots(legacyStock, upgrades);
  }
  const edits: TileEdit[] = [];
  for (const pair of data.edits) {
    if (
      infinite && Array.isArray(pair) && pair.length === 3 &&
      Number.isSafeInteger(pair[0]) && Number.isInteger(pair[1]) &&
      pair[1] >= 0 && pair[1] < WORLD_H && Number.isInteger(pair[2]) &&
      Object.hasOwn(BLOCKS, pair[2])
    ) {
      edits.push([pair[0], pair[1], pair[2]]);
      continue;
    }
    if (
      Array.isArray(pair) &&
      pair.length === 2 &&
      Number.isInteger(pair[0]) &&
      Number.isInteger(pair[1]) &&
      pair[0] >= 0 &&
      pair[0] < WORLD_W * WORLD_H &&
      Object.hasOwn(BLOCKS, pair[1])
    )
      edits.push([pair[0], pair[1]]);
  }
  const damage: BlockDamage[] = [];
  if (Array.isArray(data.damage))
    for (const pair of data.damage) {
      if (
        infinite && Array.isArray(pair) && pair.length === 3 &&
        Number.isSafeInteger(pair[0]) && Number.isInteger(pair[1]) &&
        pair[1] >= 0 && pair[1] < WORLD_H && typeof pair[2] === 'number' &&
        pair[2] > 0 && pair[2] < 1
      ) {
        damage.push([pair[0], pair[1], pair[2]]);
        continue;
      }
      if (
        Array.isArray(pair) &&
        pair.length === 2 &&
        Number.isInteger(pair[0]) &&
        pair[0] >= 0 &&
        pair[0] < WORLD_W * WORLD_H &&
        typeof pair[1] === 'number' &&
        pair[1] > 0 &&
        pair[1] < 1
      )
        damage.push([pair[0], pair[1]]);
    }
  const drops: DroppedSave[] = [];
  if (Array.isArray(data.drops)) {
    for (const value of data.drops) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const drop = object(value);
      if (
        typeof drop.item === 'string' &&
        Object.hasOwn(ITEMS, drop.item) &&
        typeof drop.amount === 'number' &&
        Number.isSafeInteger(drop.amount) &&
        drop.amount > 0 &&
        typeof drop.x === 'number' &&
        Number.isFinite(drop.x) &&
        typeof drop.y === 'number' &&
        Number.isFinite(drop.y)
      )
        drops.push({
          ...decodeSlot(drop)!,
          x: infinite ? drop.x : clamp(drop.x, 0, (WORLD_W - 1) * TILE),
          y: clamp(drop.y, 0, (WORLD_H - 2) * TILE),
          vx: numeric(drop.vx, 0, -530, 530),
          vy: numeric(drop.vy, 0, -530, 530),
          pickupDelay: numeric(drop.pickupDelay, 0, 0, 0.35),
        });
    }
  }
  const exploration: ExploredSection[] = [];
  if (Array.isArray(data.exploration)) for (const entry of data.exploration) {
    if (!Array.isArray(entry) || entry.length !== 3 || !Number.isSafeInteger(entry[0]) ||
      !Number.isInteger(entry[1]) || entry[1] < 0 || entry[1] >= Math.ceil(WORLD_H / 32) ||
      !Array.isArray(entry[2]) || entry[2].length % 2) continue;
    let total = 0, valid = true;
    const rle: number[] = [];
    for (let i = 0; i < entry[2].length; i += 2) {
      const value = entry[2][i], count = entry[2][i + 1];
      if (!Number.isInteger(value) || (value !== 65535 && !Object.hasOwn(BLOCKS, value)) ||
        !Number.isInteger(count) || count <= 0) { valid = false; break; }
      total += count;
      rle.push(value, count);
    }
    if (valid && total === 64 * 32) exploration.push([entry[0], entry[1], rle]);
  }
  const equipment = Array.isArray(data.equipment) && data.equipment.length === ARMOR_SLOTS.length
    ? data.equipment.map(decodeSlot).map((slot, index) =>
      slot && ITEMS[slot.item].armor?.slot === ARMOR_SLOTS[index] ? slot : null)
    : ARMOR_SLOTS.map(() => null);
  const weather = data.weather && typeof data.weather === 'object' && !Array.isArray(data.weather)
    ? object(data.weather) : undefined;
  const ticks = weather?.ticks;
  const validWeather = typeof ticks === 'number' && Number.isSafeInteger(ticks) && ticks >= 0 &&
    Array.isArray(weather?.doses) && weather.doses.length <= Math.min(240, ticks) &&
    weather.doses.every(d => Number.isInteger(d) && d >= -8 && d <= 5) && Array.isArray(weather.visits);
  const transformations: TransformationStateRecord[] = [];
  if (Array.isArray(data.transformations)) for (const entry of data.transformations) {
    if (Array.isArray(entry) && entry.length === 6 && Number.isSafeInteger(entry[0]) &&
      Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] < WORLD_H &&
      typeof entry[2] === 'string' && entry[2].length > 0 && entry[2].length <= 80 &&
      typeof entry[3] === 'number' && Number.isFinite(entry[3]) && entry[3] >= 0 &&
      (entry[4] === 0 || entry[4] === 1) && Number.isSafeInteger(entry[5]) && entry[5] >= 0)
      transformations.push(entry as TransformationStateRecord);
  }
  const rawNaturalCells: unknown[] = Array.isArray(data.naturalCells) ? data.naturalCells :
    Array.isArray(data.ecologicalSoil) ? data.ecologicalSoil : [];
  return {
    version: 4,
    weather: validWeather ? { ticks, carry: numeric(weather.carry, 0, -1, 1), doses: weather.doses as number[],
      visits: (weather.visits as unknown[]).filter((v): v is [number, number] => Array.isArray(v) && v.length === 2 &&
        Number.isSafeInteger(v[0]) && Number.isSafeInteger(v[1]) && v[1] >= 0 && v[1] <= ticks) } : undefined,
    weatherMode: data.weatherMode === 'rain' || data.weatherMode === 'sun'
      ? data.weatherMode : 'natural',
    generationVersion,
    weatherUntil: typeof data.weatherUntil === 'number' ? numeric(data.weatherUntil, 0, 0, Number.MAX_SAFE_INTEGER) : undefined,
    raining: typeof data.raining === 'boolean' ? data.raining : undefined,
    seed: data.seed.slice(0, 40),
    edits,
    water: Array.isArray(data.water)
      ? data.water.filter((p): p is [number, number, number] => Array.isArray(p) && p.length === 3 &&
        Number.isSafeInteger(p[0]) && (infinite || (p[0] >= 0 && p[0] < WORLD_W)) &&
        Number.isInteger(p[1]) && p[1] >= 0 && p[1] < WORLD_H &&
        Number.isInteger(p[2]) && p[2] >= 0 && p[2] <= 2000)
      : [],
    naturalCells: rawNaturalCells.filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 &&
      Number.isSafeInteger(p[0]) && Number.isInteger(p[1]) && p[1] >= 0 && p[1] < WORLD_H),
    transformations,
    damage,
    exploration,
    slots,
    equipment,
    player: {
      x: infinite ? player.x : clamp(player.x, 0, (WORLD_W - 1) * TILE),
      y: clamp(player.y, 0, (WORLD_H - 2) * TILE),
      life: Math.floor(numeric(player.life, 5, 1, 30)),
      depthMax: Math.floor(numeric(player.depthMax, 0, 0, WORLD_H)),
      placed: Math.floor(numeric(player.placed, 0, 0, Number.MAX_SAFE_INTEGER)),
    },
    elapsed: numeric(data.elapsed, 0, 0, Number.MAX_SAFE_INTEGER),
    selected: Math.floor(numeric(data.selected, 0, 0, BELT_SIZE - 1)),
    zoom: numeric(legacy ? legacyZoom : data.zoom, 1, 0.7, 1.65),
    placementMode: data.placementMode === 'free' ? 'free' : 'approach',
    drops,
  };
}
