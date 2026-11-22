import type { Materials } from '../content/Materials';
import { CHUNK_WIDTH } from '../EngineTypes';
import { mixHash } from '../../shared/math';
import { RegionalWeather } from './RegionalWeather';
import type { World } from './World';
import { BLOCK_PARTITION_COUNT, blockPartitionAt } from '../simulation/BlockPartitionScheduler';
import type { SimulationRegion } from '../simulation/SimulationRegion';

export type WaterCell = [x: number, y: number, amount: number];
const full = 1000;
const interval = 0.5;
export const HYDROLOGY_RADIUS_CHUNKS = 4;
export const MAX_FLOW_CELLS_PER_TICK = 2048;
export const MAX_PRIORITY_FLUID_CELLS = 4096;
const MAX_PERCOLATION_CELLS = 32;
const MOVING_WATER_ABSORPTION = 0.2;
const RAIN_ABSORPTION = 0.35;
const GRAVEL_PULL_RATE = 0.9;
const MAX_AQUIFER_LINK_DEPTH = 160;
export interface WaterState { volume: number; capacity: number; saturation: number }

export class Hydrology {
  constructor(private readonly materials: Materials) {}
  private readonly liquid = (id: number) => id === this.materials.keys.AIR || id === this.materials.keys.WATER || id === this.materials.keys.LAVA || id === this.materials.keys.TORCH || !!this.materials.blocks[id]?.openChannel;
private readonly capacity = (id: number) => this.liquid(id) ? full : Math.round((this.materials.blocks[id].waterCapacity ?? 0) * full);

  private readonly waterFlowListeners = new Set<(x: number, y: number, volume: number) => void>();
  onWaterFlow(listener: (x: number, y: number, volume: number) => void) {
    this.waterFlowListeners.add(listener);
    return () => this.waterFlowListeners.delete(listener);
  }
  private readonly listeners = new Set<(x: number, y: number) => void>();
  readonly weather = new RegionalWeather();
  private readonly columns = new Map<number, Map<number, number>>();
  private clock = 0;
  private sweepRight = false;
  private flowCursor = 0;
  private processed = 0;
  private readonly drips = new Set<string>();
  private readonly directions = new Map<string, { dx: number; dy: number }>();
  private readonly aquiferLinks = new Map<number, number | null>();
  /** Moving liquids bypass the normal block-partition lottery until stable. */
  private readonly activeFluids = new Set<string>();
  private recharged = 0;
  private activeRegion?: SimulationRegion;

  private activeColumnContains(x: number) {
    return !this.activeRegion || this.activeRegion.containsColumn(x);
  }

  /** Maximum amount a solid neighbour may absorb during one hydraulic pass. */
  private porousBudget(block: number, supply: number, quantum = interval) {
    if (this.liquid(block)) return supply;
    const permeability = this.materials.blocks[block].permeability ?? 0;
    // Ordinary soil/sand still receives a saturated-strata transfer in one
    // pass. Only compact rock uses the slow pore-scale path here.
    if (permeability >= 0.03) return supply;
    return Math.min(supply, Math.max(0, permeability * full * quantum));
  }

  get processedLastTick() { return this.processed; }
  get aquiferRechargeLastTick() { return this.recharged; }
  get activeFluidCount() { return this.activeFluids.size; }

  amount(x: number, y: number, block: number) {
    return this.columns.get(x)?.get(y) ?? (block === this.materials.keys.WATER ? full : 0);
  }

  state(x: number, y: number, block: number): WaterState {
    const stored = this.amount(x, y, block), cap = this.capacity(block);
    return { volume: stored / full, capacity: cap / full, saturation: cap > 0 ? stored / cap : 0 };
  }

  onChanged(listener: (x: number, y: number) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  visible(x: number, y: number, block: number) {
    return Math.min(this.capacity(block), this.amount(x, y, block)) / full;
  }

  flowing(world: World, x: number, y: number, block: number) {
    if (!this.liquid(block) || !this.amount(x, y, block) || y + 1 >= world.height) return false;
    const below = world.get(x, y + 1);
    return this.liquid(below) && this.amount(x, y + 1, below) < this.capacity(below);
  }

  direction(x: number, y: number) {
    return this.directions.get(`${x},${y}`) ?? { dx: 0, dy: 0 };
  }

  fluidKind(block: number) {
    if (block === this.materials.keys.LAVA) return 'lava' as const;
    if (block === this.materials.keys.WATER) return 'water' as const;
    return undefined;
  }

  dripping(world: World, x: number, y: number, block: number) {
    if (!this.liquid(block) || !this.drips.has(`${x},${y}`) || this.amount(x, y, block) > 150) return false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) {
      const neighbor = world.get(x + dx, y + dy);
      if (this.liquid(neighbor) && this.amount(x + dx, y + dy, neighbor) > 0) return false;
    }
    return true;
  }

  private write(x: number, y: number, block: number, amount: number) {
    const previous = this.amount(x, y, block);
    let column = this.columns.get(x);
    if (amount === (block === this.materials.keys.WATER ? full : 0)) {
      column?.delete(y);
      if (!column?.size) this.columns.delete(x);
      this.directions.delete(`${x},${y}`);
      if (previous !== amount) for (const listener of this.listeners) listener(x, y);
      return;
    }
    if (!column) this.columns.set(x, column = new Map());
    column.set(y, amount);
    if (previous !== amount) for (const listener of this.listeners) listener(x, y);
  }

  clear(x: number, y: number, block: number) { this.write(x, y, block, 0); }

  drink(x: number, y: number, block: number, demand: number) {
    const available = this.amount(x, y, block);
    const taken = Math.min(available, this.capacity(block), demand);
    this.write(x, y, block, available - taken);
    return taken;
  }

  displace(world: World, x: number, y: number, before: number, after: number) {
    if (after === this.materials.keys.WATER) {
      this.write(x, y, after, full);
      this.wakeNearbyFluids(world, x, y);
      return;
    }
    const volume = this.amount(x, y, before);
    this.write(x, y, after, volume);
    this.releaseExcess(world, x, y, after, volume);
    this.wakeNearbyFluids(world, x, y);
  }

  private wakeNearbyFluids(world: World, x: number, y: number) {
    for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const tx = x + dx, ty = y + dy;
      const block = world.inside(tx, ty) ? world.get(tx, ty) : this.materials.keys.BEDROCK;
      if (this.liquid(block) && this.amount(tx, ty, block) > 0)
        this.activeFluids.add(`${tx},${ty}`);
    }
  }

  /**
   * Processes only fluid cells that moved or were disturbed. This is called
   * once per rendered frame; a fluid removes itself from this set as soon as
   * it cannot transfer volume, becoming an ordinary low-priority block.
   */
  stepActiveFluids(dt: number, world: World, region: SimulationRegion) {
    if (!this.activeFluids.size || dt <= 0) return;
    const pending = [...this.activeFluids]
      .sort((a, b) => this.coords(a)[1] - this.coords(b)[1])
      .slice(0, MAX_PRIORITY_FLUID_CELLS);
    for (const key of pending) this.activeFluids.delete(key);
    this.activeRegion = region;
    for (const key of pending) {
      const [x, y] = this.coords(key);
      if (!region.containsColumn(x)) {
        this.activeFluids.add(key);
        continue;
      }
      const block = world.get(x, y);
      if (!this.liquid(block) || !this.amount(x, y, block)) continue;
      if (!this.flow(world, x, y, this.amount(x, y, block), dt)) {
        this.directions.delete(key);
        continue;
      }
      this.wakeNearbyFluids(world, x, y);
    }
    this.levelConnectedWater(world, {
      containsTile: (x, y) => region.containsColumn(x) && world.inside(x, y),
    }, [...pending, ...this.activeFluids]);
    this.activeRegion = undefined;
  }

  private coords(key: string): [number, number] {
    const [x, y] = key.split(',').map(Number);
    return [x, y];
  }

  /**
   * A connected free-water component is one body, not a collection of tiles.
   * Redistribution is atomic: lower rows fill first and the surface row shares
   * the remaining volume equally. This removes traversal-order waves and keeps
   * the water line horizontal without creating or destroying volume.
   */
  private levelConnectedWater(world: World, region: Pick<SimulationRegion, 'containsTile'>,
    seeds: readonly string[]) {
    const visited = new Set<string>();
    const isWater = (x: number, y: number) => {
      if (!region.containsTile(x, y)) return false;
      const block = world.peek(x, y);
      return block !== undefined && block !== this.materials.keys.LAVA && this.liquid(block) &&
        this.amount(x, y, block) > 0;
    };
    for (const seed of seeds) {
      if (visited.has(seed)) continue;
      const [sx, sy] = this.coords(seed);
      if (!isWater(sx, sy)) continue;
      const component: [number, number][] = [];
      const queue: [number, number][] = [[sx, sy]];
      visited.add(seed);
      for (let cursor = 0; cursor < queue.length && component.length < MAX_PRIORITY_FLUID_CELLS; cursor++) {
        const [x, y] = queue[cursor];
        component.push([x, y]);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const tx = x + dx, ty = y + dy, key = `${tx},${ty}`;
          if (visited.has(key) || !isWater(tx, ty)) continue;
          visited.add(key);
          queue.push([tx, ty]);
        }
      }
      if (component.length < 2) continue;
      let volume = component.reduce((sum, [x, y]) =>
        sum + this.amount(x, y, world.get(x, y)), 0);
      const rows = new Map<number, [number, number][] >();
      for (const cell of component) {
        const row = rows.get(cell[1]);
        if (row) row.push(cell);
        else rows.set(cell[1], [cell]);
      }
      const assigned = new Map<string, number>();
      for (const y of [...rows.keys()].sort((a, b) => b - a)) {
        const cells = rows.get(y)!.sort((a, b) => a[0] - b[0]);
        const rowVolume = Math.min(volume, cells.length * full);
        const level = Math.floor(rowVolume / cells.length);
        let remainder = rowVolume - level * cells.length;
        for (const [x, cy] of cells)
          assigned.set(`${x},${cy}`, level + (remainder-- > 0 ? 1 : 0));
        volume -= rowVolume;
      }
      for (const [x, y] of component) {
        const key = `${x},${y}`;
        this.write(x, y, world.get(x, y), assigned.get(key) ?? 0);
        this.directions.delete(key);
      }
    }
  }

  private releaseExcess(world: World, x: number, y: number, block: number, volume: number) {
    const retained = Math.min(volume, this.capacity(block));
    let excess = volume - retained;
    if (!excess) return;
    this.write(x, y, block, retained);
    const visited = new Set([`${x},${y}`]);
    excess = this.propagateFromSaturated(world, x, y, excess, visited, true);
    // Enclosed water stays under pressure until an adjacent cell has room.
    this.write(x, y, block, retained + excess);
  }

  transferBucket(x: number, y: number, block: number, pour: boolean) {
    const dose = 200;
    const current = this.amount(x, y, block);
    if (block === this.materials.keys.LAVA || (pour ? this.capacity(block) - current < dose : !this.liquid(block) || current < dose)) return false;
    this.write(x, y, block, current + (pour ? dose : -dose));
    return true;
  }

  private fill(world: World, x: number, y: number, supply: number) {
    if (!world.inside(x, y) || !this.activeColumnContains(x)) return 0;
    const block = world.get(x, y), current = this.amount(x, y, block);
    const accepted = Math.min(supply, Math.max(0, this.capacity(block) - current));
    if (accepted) this.write(x, y, block, current + accepted);
    return accepted;
  }

  /** Returns unused water. Each porous cell keeps its full capacity before it
   * becomes a conduit. Gravity gets the first chance to receive the excess. */
  private percolate(world: World, x: number, y: number, supply: number,
    visited = new Set<string>()): number {
    if (!supply || !world.inside(x, y) ||
      !this.activeColumnContains(x) ||
      visited.size >= MAX_PERCOLATION_CELLS) return supply;
    const key = `${x},${y}`;
    if (visited.has(key)) return supply;
    visited.add(key);
    const block = world.get(x, y);
    if (block === this.materials.keys.LAVA) return supply;
    if (this.liquid(block)) return supply - this.fill(world, x, y, supply);
    const cap = this.capacity(block);
    if (!cap) return supply;
    const current = this.amount(x, y, block);
    const absorbed = this.fill(world, x, y, Math.min(supply, Math.max(0, cap - current)));
    let excess = supply - absorbed;
    if (!excess || current + absorbed < cap) return excess;

    return this.propagateFromSaturated(world, x, y, excess, visited);
  }

  private propagateFromSaturated(world: World, x: number, y: number, supply: number,
    visited: Set<string>, allowUp = false) {
    let excess = supply;
    const right = this.sweepRight ? 1 : -1;
    const routes = [[0, 1], [right, 0], [-right, 0]] as const;

    // First saturate the immediate neighbours. Only after this pass may any of
    // them conduct water farther through the soil.
    for (const [dx, dy] of routes) {
      if (!excess) break;
      const tx = x + dx, ty = y + dy;
      if (!this.activeColumnContains(tx)) continue;
      const target = world.get(tx, ty);
      if (target === this.materials.keys.LAVA) continue;
      // Saturated strata may conduct excess water, but the receiving solid
      // still obeys its own permeability. In particular, stone must not
      // receive a full transfer merely because it touches another stone.
      const accepted = this.fill(world, tx, ty, this.porousBudget(target, excess));
      excess -= accepted;
      if (dy === 1 && accepted && this.liquid(target)) this.drips.add(`${tx},${ty}`);
    }
    if (!excess) return 0;

    for (const [dx, dy] of routes) {
      if (!excess || visited.size >= MAX_PERCOLATION_CELLS) break;
      const tx = x + dx, ty = y + dy;
      if (!this.activeColumnContains(tx)) continue;
      const target = world.get(tx, ty);
      if (this.liquid(target) || !this.capacity(target) ||
        this.amount(tx, ty, target) < this.capacity(target)) continue;
      excess = this.percolate(world, tx, ty, excess, visited);
    }
    if (excess && allowUp) {
      if (!this.activeColumnContains(x)) return excess;
      const target = world.get(x, y - 1);
      if (target !== this.materials.keys.LAVA) {
        const accepted = this.fill(world, x, y - 1, excess);
        excess -= accepted;
        if (excess && !this.liquid(target) && this.capacity(target) &&
          this.amount(x, y - 1, target) >= this.capacity(target))
          excess = this.percolate(world, x, y - 1, excess, visited);
      }
    }
    return excess;
  }

  step(dt: number, world: World, cx: number, cy: number, rain: number, sunlight: number,
    partition?: number, region?: SimulationRegion) {
    this.clock += dt;
    this.activeRegion = region;
    while (this.clock >= interval) {
      this.clock -= interval;
      this.tick(world, cx, cy, rain, sunlight, partition, region);
    }
    this.activeRegion = undefined;
  }

  private sky = new Map<number, number>();

  terrainChanged(x: number) {
    this.sky.delete(x);
    this.aquiferLinks.delete(x);
  }

  private rechargeAquifer(world: World, x: number, surface: number, supply: number) {
    if (!supply) return 0;
    let target = this.aquiferLinks.get(x);
    if (target === undefined) {
      target = null;
      for (let y = surface + 1; y <= Math.min(world.height - 1, surface + MAX_AQUIFER_LINK_DEPTH); y++) {
        if (world.peek(x, y) === this.materials.keys.WATER) { target = y; break; }
      }
      this.aquiferLinks.set(x, target);
    }
    if (target === null || world.peek(x, target) !== this.materials.keys.WATER) return 0;
    const accepted = this.fill(world, x, target, supply);
    this.recharged += accepted;
    return accepted;
  }

  private applyWeather(world: World, x: number, dose: number, partition?: number,
    region?: SimulationRegion) {
    if (!dose) return;
    let roof = this.sky.get(x);
    if (roof === undefined || (world.peek(x, roof) === this.materials.keys.WATER && !world.waterAt(x, roof))) {
      roof = 0;
      while (roof < world.height - 1) {
        const block = world.get(x, roof);
        if (!this.liquid(block) || (block === this.materials.keys.WATER && this.amount(x, roof, block))) break;
        roof++;
      }
      this.sky.set(x, roof);
    }
    let exposed = roof;
    const column = this.columns.get(x);
    if (column) for (const [y, amount] of column) {
      if (amount && y < exposed) exposed = y;
    }
    const block = world.get(x, exposed);
    if ((partition !== undefined && blockPartitionAt(x, exposed) !== partition) ||
      (region && !region.containsColumn(x))) return;
    if (block === this.materials.keys.LAVA) return;
    if (dose < 0) {
      this.drink(x, exposed, block, this.liquid(block) ? -dose : Math.round(-dose * 0.375));
      return;
    }
    // Infiltrate precipitation at the impact surface before forming a puddle.
    if (!this.liquid(block)) {
      const offered = Math.min(dose, Math.ceil((this.materials.blocks[block].permeability ?? 0) *
        full * interval * RAIN_ABSORPTION));
      let unused = this.percolate(world, x, exposed, offered);
      // Saturated connected strata act as a coarse fracture network. This link
      // only targets already-generated aquifers and never generates distant terrain.
      if (unused && this.amount(x, exposed, block) >= this.capacity(block))
        unused -= this.rechargeAquifer(world, x, exposed, unused);
      dose -= offered - unused;
    }
    // What the ground cannot receive becomes surface storage.
    let y = this.liquid(block) ? exposed : exposed - 1;
    while (dose > 0 && y >= 0 && this.liquid(world.get(x, y))) {
      dose -= this.fill(world, x, y, dose);
      y--;
    }
  }

  private tick(world: World, cx: number, cy: number, rain: number, sunlight: number,
    partition?: number, region?: SimulationRegion) {
    this.drips.clear();
    this.recharged = 0;
    this.sweepRight = !this.sweepRight;
    this.weather.advance(rain, sunlight);
    const weatherChunks = world.weatherChunks().filter(chunk => !region ||
      (chunk + 1) * CHUNK_WIDTH - 1 >= region.left && chunk * CHUNK_WIDTH <= region.right);
    for (const chunk of weatherChunks) {
      for (const dose of this.weather.dosesFor(chunk)) for (let x = chunk * CHUNK_WIDTH; x < (chunk + 1) * CHUNK_WIDTH; x++) {
        if (world.inside(x, 0)) this.applyWeather(world, x,
          partition === undefined ? dose : dose * BLOCK_PARTITION_COUNT, partition, region);
      }
    }

    // Snapshot mobile volumes. Water received in this pass cannot cascade across
    // an arbitrary number of cells merely because of traversal order.
    const centerChunk = Math.floor(cx / CHUNK_WIDTH);
    const activeChunks = weatherChunks.filter(chunk => Math.abs(chunk - centerChunk) <= HYDROLOGY_RADIUS_CHUNKS);
    const pending: WaterCell[] = [];
    for (const chunk of activeChunks) for (let x = chunk * CHUNK_WIDTH; x < (chunk + 1) * CHUNK_WIDTH; x++) {
      const column = this.columns.get(x);
      if (column) for (const [y, amount] of column) {
        if (amount && world.peek(x, y) !== undefined &&
          (partition === undefined || blockPartitionAt(x, y) === partition) &&
          (!region || region.containsColumn(x))) pending.push([x, y, amount]);
      }
    }
    const left = region?.left ?? cx - 36, right = region?.right ?? cx + 36;
    const top = region ? 0 : Math.max(0, cy - 38);
    const bottom = region ? world.height - 1 : Math.min(world.height - 1, cy + 38);
    for (let x = left; x <= right; x++) {
      for (let y = top; y <= bottom; y++) {
        if (world.peek(x, y) === this.materials.keys.WATER && !this.columns.get(x)?.has(y) &&
          (partition === undefined || blockPartitionAt(x, y) === partition))
          pending.push([x, y, full]);
      }
    }
    if (this.sweepRight) pending.reverse();
    this.processed = Math.min(pending.length, MAX_FLOW_CELLS_PER_TICK);
    if (!pending.length) return;
    const startIndex = this.flowCursor % pending.length;
    for (let index = 0; index < this.processed; index++) {
      const [x, y, start] = pending[(startIndex + index) % pending.length];
      this.flow(world, x, y, start);
    }
    this.levelConnectedWater(world, region ? {
      containsTile: (x, y) => region.containsColumn(x) && world.inside(x, y),
    } : {
      containsTile: (x, y) => x >= left && x <= right && y >= top && y <= bottom,
    }, pending.map(([x, y]) => `${x},${y}`));
    this.flowCursor = (startIndex + this.processed) % pending.length;
  }

  private flow(world: World, x: number, y: number, start: number, quantum = interval) {
    const block = world.get(x, y), cap = this.capacity(block);
    const stored = this.amount(x, y, block);
    if (stored > cap) {
      this.releaseExcess(world, x, y, block, stored);
      return true;
    }
    let budget = Math.min(start, stored);
    if (!budget) return false;
    const free = this.liquid(block), below = world.get(x, y + 1);
    let transferred = false;
    if (block !== this.materials.keys.GRAVEL && block !== this.materials.keys.LAVA) {
      let requested = Math.ceil(budget * Math.min(1, GRAVEL_PULL_RATE * quantum / interval));
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        if (!requested || !budget || world.peek(x + dx, y + dy) !== this.materials.keys.GRAVEL) continue;
        const sent = this.fill(world, x + dx, y + dy, Math.min(requested, budget));
        if (!sent) continue;
        budget -= sent;
        requested -= sent;
        this.write(x, y, block, this.amount(x, y, block) - sent);
        transferred = true;
      }
      if (!budget) return transferred;
    }
    if (!free && block === this.materials.keys.DIRT && stored >= cap &&
      y >= world.heightAt(x) + 2 && (this.materials.blocks[below].permeability ?? 0) < 0.03 && !this.liquid(below)) {
      // Hydraulic piping concentrates along perched water tables. A connected
      // cavity is more likely to expand than an isolated pore is to collapse.
      const poolNearby = [-1, 1].some(dx => {
        const id = world.peek(x + dx, y);
        return id !== undefined && this.liquid(id) && world.waterAt(x + dx, y, id) > 0.25;
      });
      const roll = mixHash(x, y, world.h ^ Math.imul(this.weather.ticks, 2654435761));
      if (
        this.weather.ticks >= 300 &&
        roll / 4294967296 < (poolNearby ? 0.1 : 0.01) &&
        world.changeHabitat(x, y, block, this.materials.keys.AIR)
      ) return true;
    }
    const transfer = (dx: number, dy: number, requested: number) => {
      if (requested <= 0 || !budget) return 0;
      const neighbor = world.get(x + dx, y + dy);
      if (block === this.materials.keys.WATER && neighbor === this.materials.keys.LAVA) {
        world.set(x + dx, y + dy, this.materials.keys.STONE);
        this.write(x + dx, y + dy, this.materials.keys.STONE, 0);
        transferred = true;
        return 0;
      }
      if (block === this.materials.keys.LAVA && neighbor === this.materials.keys.WATER) {
        world.set(x, y, this.materials.keys.STONE);
        this.write(x, y, this.materials.keys.STONE, 0);
        budget = 0;
        transferred = true;
        return 0;
      }
      const offered = Math.min(budget, requested);
      const sent = block !== this.materials.keys.LAVA && !this.liquid(neighbor)
        ? offered - this.percolate(world, x + dx, y + dy, offered)
        : this.fill(world, x + dx, y + dy, offered);
      if (sent) {
        if (free && this.liquid(neighbor) && block !== this.materials.keys.LAVA && neighbor !== this.materials.keys.LAVA)
          for (const listener of this.waterFlowListeners) listener(x, y, sent / full);
        this.write(x, y, block, this.amount(x, y, block) - sent);
        budget -= sent;
        transferred = true;
        this.activeFluids.add(`${x},${y}`);
        if (this.liquid(neighbor)) this.activeFluids.add(`${x + dx},${y + dy}`);
        this.directions.set(`${x},${y}`, { dx, dy });
        this.directions.delete(`${x + dx},${y + dy}`);
      }
      return sent;
    };
    if (block === this.materials.keys.GRAVEL && (below === this.materials.keys.GRAVEL || this.liquid(below)))
      transfer(0, 1, Math.ceil(budget * Math.min(1, GRAVEL_PULL_RATE * quantum / interval)));
    if (!free && stored < cap) return transferred;
    const mobile = free ? budget : Math.max(0, stored - cap);
    if (!free) budget = mobile;
    const fluid = this.materials.blocks[block].fluid;
    const spread = fluid?.spread ?? 1;
    const conductivity = Math.min(
      free ? 2 * spread : (this.materials.blocks[block].permeability ?? 0),
      this.liquid(below) ? 2 : this.materials.blocks[below].permeability ?? 0);
    const moving = free && this.flowing(world, x, y, block);
    const absorption = moving && !this.liquid(below) ? MOVING_WATER_ABSORPTION : 1;
    // Preserve fractional requests for very impermeable materials. Rounding
    // every request up to one unit made compact stone absorb a full unit on
    // every simulation step, defeating its low permeability.
    const porousRequest = (amount: number) => amount > 0 && amount < 1 ? amount : Math.ceil(amount);
    const downward = free
      ? transfer(0, 1, Math.min(mobile, porousRequest(full * quantum * conductivity * absorption)))
      : 0;
    if (!free && downward > 0 && this.liquid(below)) this.drips.add(`${x},${y + 1}`);
    const lateral = this.sweepRight ? [1, -1] : [-1, 1];
    if (free) {
      for (const dx of lateral) {
        const neighbor = world.peek(x + dx, y);
        if (neighbor === undefined) continue;
        if (!this.liquid(neighbor)) {
          transfer(dx, 0, porousRequest((this.materials.blocks[neighbor].permeability ?? 0) * full *
            quantum * 0.25 * (moving ? MOVING_WATER_ABSORPTION : 1)));
          continue;
        }
        const difference = this.amount(x, y, block) - this.amount(x + dx, y, neighbor);
        transfer(dx, 0, Math.floor(difference / 2 * spread));
      }
    }
    return transferred;
  }

  save(): WaterCell[] {
    return Array.from(this.columns, ([x, column]) =>
      Array.from(column, ([y, amount]): WaterCell => [x, y, amount])).flat();
  }

  restore(entries: readonly WaterCell[]) {
    this.columns.clear();
    for (const [x, y, amount] of entries) {
      if (!Number.isFinite(amount) || amount < 0) continue;
      let column = this.columns.get(x);
      if (!column) this.columns.set(x, column = new Map());
      column.set(y, amount);
    }
  }
}
