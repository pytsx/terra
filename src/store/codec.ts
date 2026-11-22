import { ARMOR_SLOTS, BELT_SIZE, TILE, WORLD_H, WORLD_W, CURRENT_GENERATION, type Slot } from '../business/catalog';
import { startingSlots } from '../business/inventory/Inventory';
import type { BlockDamage, DroppedSave, EntityRegionSave, EntitySave, ExpeditionSave, ExploredSection, TileEdit, TransformationStateRecord } from '../business/save';
import { defaultContent } from '../assets/runtime';
import type { RuntimeContent } from '../business/content/RuntimeContent';
import { clamp } from '../shared/math';
import type { StationSave, StationStoreSave } from '../business/stations/StationTypes';
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Formato de save inválido.');
  return value as Record<string, unknown>;
}
function numeric(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}
function decodeSlot(value: unknown, content: RuntimeContent): Slot {
  if (value === null) return null;
  const stack = object(value);
  if (typeof stack.item !== 'string' || !Object.hasOwn(content.materials.items, stack.item) ||
    typeof stack.amount !== 'number' || !Number.isSafeInteger(stack.amount) || stack.amount <= 0)
    throw new Error('Pilha inválida.');
  const max = content.materials.items[stack.item].armor?.durability ?? content.materials.items[stack.item].tool?.durability;
  return max === undefined
    ? { item: stack.item, amount: stack.amount }
    : { item: stack.item, amount: stack.amount, durability: Math.floor(numeric(stack.durability, max, 1, max)) };
}
function decodeEntity(value: unknown, infinite: boolean, content: RuntimeContent): EntitySave | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const raw = object(value), actor = raw.actor && typeof raw.actor === 'object' && !Array.isArray(raw.actor)
    ? object(raw.actor) : undefined;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 120 || typeof raw.kind !== 'string' ||
    !content.entities.asset(raw.kind) || !actor || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return;
  const asset = content.entities.asset(raw.kind)!;
  const entity: EntitySave = {
    id: raw.id,
    kind: raw.kind,
    actor: {
      x: infinite ? actor.x as number : clamp(actor.x as number, 0, (WORLD_W - 1) * TILE),
      y: clamp(actor.y as number, 0, (WORLD_H - 1) * TILE),
      vx: numeric(actor.vx, 0, -1000, 1000),
      vy: numeric(actor.vy, 0, -1000, 1000),
      ground: actor.ground === true,
      face: numeric(actor.face, 1, -1, 1) < 0 ? -1 : 1,
      swimming: actor.swimming === true,
    },
    health: numeric(raw.health, asset.config.health, 0, asset.config.health),
  };
  if (raw.animal && typeof raw.animal === 'object' && !Array.isArray(raw.animal)) {
    const animal = object(raw.animal);
    entity.animal = { hydration: numeric(animal.hydration, 1, 0, 1),
      nutrition: numeric(animal.nutrition, 1, 0, 1), deprivation: numeric(animal.deprivation, 0, 0, 25) };
  }
  if ('breeding' in asset.config && raw.breeding && typeof raw.breeding === 'object' && !Array.isArray(raw.breeding)) {
    const breeding = object(raw.breeding), stages = ['calf', 'adult', 'courting', 'recovering'] as const;
    if (stages.includes(breeding.stage as typeof stages[number])) entity.breeding = {
      stage: breeding.stage as typeof stages[number],
      remaining: numeric(breeding.remaining, 0, 0, Math.max(asset.config.breeding.cooldown, asset.config.breeding.growthTime)),
    };
  }
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    entity.data = {};
    for (const [key, item] of Object.entries(object(raw.data)).slice(0, 16))
      if (key.length <= 40 && (typeof item === 'string' || typeof item === 'boolean' || item === null ||
        (typeof item === 'number' && Number.isFinite(item)))) entity.data[key] = item;
  }
  return entity;
}
function decodeStations(value: unknown, infinite: boolean, content: RuntimeContent): StationStoreSave | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const raw = object(value); if (!Array.isArray(raw.records)) return;
  const occupied = new Set<string>(), ids = new Set<string>(), records: StationSave[] = [];
  for (const value of raw.records) try {
    const station = object(value), definitionId = station.definitionId;
    if (typeof station.id !== 'string' || !station.id || ids.has(station.id) || typeof definitionId !== 'string') continue;
    const definition = content.stations.get(definitionId); if (!definition || definition.mode !== 'processing') continue;
    const x = station.x, y = station.y;
    if (typeof x !== 'number' || !Number.isSafeInteger(x) || (!infinite && (x < 0 || x >= WORLD_W)) ||
        typeof y !== 'number' || !Number.isInteger(y) || y < 0 || y >= WORLD_H) continue;
    const position = `${x},${y}`; if (occupied.has(position)) continue;
    const decodeSlots = (source: unknown, count: number) => Array.isArray(source) && source.length === count ? source.map(slot => decodeSlot(slot, content)) : undefined;
    const input = decodeSlots(station.input, definition.storage!.inputSlots), output = decodeSlots(station.output, definition.storage!.outputSlots),
      fuel = decodeSlots(station.fuel, definition.storage!.fuelSlots); if (!input || !output || !fuel) continue;
    const energy = station.energyState && typeof station.energyState === 'object' && !Array.isArray(station.energyState) ? object(station.energyState) : {};
    const burningRaw = energy.burningFuel && typeof energy.burningFuel === 'object' && !Array.isArray(energy.burningFuel) ? object(energy.burningFuel) : undefined;
    const burningFuel = burningRaw && typeof burningRaw.item === 'string' && content.materials.items[burningRaw.item] &&
      Number.isFinite(burningRaw.remainingSeconds) && Number.isFinite(burningRaw.totalSeconds) && Number.isFinite(burningRaw.targetTemperature)
      ? { item: burningRaw.item, remainingSeconds: Math.max(0, burningRaw.remainingSeconds as number), totalSeconds: Math.max(0, burningRaw.totalSeconds as number), targetTemperature: Math.max(20, burningRaw.targetTemperature as number) } : null;
    let process: StationSave['process'] = null;
    if (station.process && typeof station.process === 'object' && !Array.isArray(station.process)) {
      const job = object(station.process), recipe = typeof job.recipeId === 'string' ? content.processes.get(job.recipeId) : undefined;
      if (recipe && content.processes.compatible(definition).includes(recipe) && Array.isArray(job.reservedInputs)) process = {
        recipeId: recipe.id, elapsedWork: numeric(job.elapsedWork, 0, 0, recipe.work), requiredWork: recipe.work,
        reservedInputs: job.reservedInputs.map(slot => decodeSlot(slot, content)).filter((s): s is NonNullable<Slot> => !!s),
        status: job.status === 'processing' || job.status === 'blocked' ? job.status : 'paused',
      };
    }
    records.push({ id: station.id, definitionId, x: x as number, y: y as number,
      revision: Math.floor(numeric(station.revision, 0, 0, Number.MAX_SAFE_INTEGER)), input, output, fuel,
      enabled: station.enabled !== false, selectedRecipe: typeof station.selectedRecipe === 'string' ? station.selectedRecipe : undefined,
      process, energyState: { temperature: numeric(energy.temperature, 20, 0, 1000), targetTemperature: numeric(energy.targetTemperature, 200, 20, 1000), burningFuel } });
    ids.add(station.id); occupied.add(position);
  } catch { continue; }
  return { nextId: Math.max(1, Math.floor(numeric(raw.nextId, records.length + 1, 1, Number.MAX_SAFE_INTEGER))), records };
}
export function decodeSave(raw: string, legacyZoom: number, content: RuntimeContent = defaultContent): ExpeditionSave {
  const data = object(JSON.parse(raw));
  const legacy = data.v === 2 && data.version === undefined;
  if (!legacy && data.version !== 3 && data.version !== 4)
    throw new Error('Versão de save desconhecida.');
  if (typeof data.contentSignature === 'string' && data.contentSignature !== content.signature)
    throw new Error('Save content catalog is incompatible.');
  if (data.contentSignature === undefined && !content.acceptsLegacySaves)
    throw new Error('This catalog does not accept unidentified legacy saves.');
  if (typeof data.seed !== 'string' || !data.seed.trim() || !Array.isArray(data.edits))
    throw new Error('Mundo inválido.');
  const generationVersion = Math.floor(numeric(data.generationVersion, 1, 1, CURRENT_GENERATION));
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
    slots = data.slots.map(slot => decodeSlot(slot, content));
    if (slots.length === 32) slots = [...slots.slice(0, 8), null, ...slots.slice(8)];
    while (slots.length < BELT_SIZE * 4) slots.push(null);
  } else {
    const stock = object((legacy ? player.inv : data.stock) ?? {}),
      legacyStock: Record<string, number> = {};
    for (const [id, value] of Object.entries(stock)) {
      if (Object.hasOwn(content.materials.items, id))
        legacyStock[id] = Math.floor(
          numeric(value, content.materials.items[id].initial ?? 0, 0, Number.MAX_SAFE_INTEGER),
        );
    }
    const upgrades = Array.isArray(data.upgrades)
      ? data.upgrades.filter(
          (id): id is string =>
            typeof id === 'string' && Object.hasOwn(content.materials.items, id) &&
            (!!content.materials.items[id].unique || !!content.materials.items[id].tool || !!content.materials.items[id].armor),
        )
      : [];
    slots = startingSlots(legacyStock, upgrades, content.materials);
  }
  const edits: TileEdit[] = [];
  for (const pair of data.edits) {
    if (
      infinite && Array.isArray(pair) && pair.length === 3 &&
      Number.isSafeInteger(pair[0]) && Number.isInteger(pair[1]) &&
      pair[1] >= 0 && pair[1] < WORLD_H && Number.isInteger(pair[2]) &&
      Object.hasOwn(content.materials.blocks, pair[2])
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
      Object.hasOwn(content.materials.blocks, pair[1])
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
        Object.hasOwn(content.materials.items, drop.item) &&
        typeof drop.amount === 'number' &&
        Number.isSafeInteger(drop.amount) &&
        drop.amount > 0 &&
        typeof drop.x === 'number' &&
        Number.isFinite(drop.x) &&
        typeof drop.y === 'number' &&
        Number.isFinite(drop.y)
      )
        drops.push({
          ...decodeSlot(drop, content)!,
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
      if (!Number.isInteger(value) || (value !== 65535 && !Object.hasOwn(content.materials.blocks, value)) ||
        !Number.isInteger(count) || count <= 0) { valid = false; break; }
      total += count;
      rle.push(value, count);
    }
    if (valid && total === 64 * 32) exploration.push([entry[0], entry[1], rle]);
  }
  const equipment = Array.isArray(data.equipment) && data.equipment.length === ARMOR_SLOTS.length
    ? data.equipment.map(slot => decodeSlot(slot, content)).map((slot, index) =>
      slot && content.materials.items[slot.item].armor?.slot === ARMOR_SLOTS[index] ? slot : null)
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
  const entityRegions: EntityRegionSave[] | undefined = Array.isArray(data.entityRegions)
    ? data.entityRegions.flatMap((entry): EntityRegionSave[] => {
      if (!Array.isArray(entry) || entry.length !== 3 || !Number.isSafeInteger(entry[0]) ||
        !Number.isSafeInteger(entry[1]) || entry[1] < 0 || entry[1] >= Math.ceil(WORLD_H / 32) ||
        !Array.isArray(entry[2])) return [];
      const decoded = entry[2].map(value => decodeEntity(value, infinite, content))
        .filter((value): value is EntitySave => !!value);
      return decoded.length ? [[entry[0], entry[1], decoded]] : [];
    }) : undefined;
  const entities = entityRegions === undefined && Array.isArray(data.entities)
    ? data.entities.map(value => decodeEntity(value, infinite, content)).filter((value): value is EntitySave => !!value)
    : undefined;
  return {
    version: 4,
    contentSignature: typeof data.contentSignature === 'string' ? data.contentSignature : content.signature,
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
        Number.isFinite(p[2]) && p[2] >= 0 && p[2] <= 2000)
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
    entities,
    entityRegions,
    stations: decodeStations(data.stations, infinite, content),
  };
}
