import type { Materials } from '../content/Materials';
import { TILE, WORLD_W, WORLD_H, LEGACY_WORLD_H, CHUNK_WIDTH, CHUNK_HEIGHT } from '../EngineTypes';
import { RNG, clamp, noise1, noise2, hashText } from '../../shared/math';
import type { TileEdit, BlockDamage, ExploredSection } from '../save';
import type { RuntimeContent } from '../content/RuntimeContent';
import { defaultContent } from '../../assets/runtime';
import { createGenerationContext } from '../worldgen';
import { TerrainColumn } from '../worldgen/TerrainColumn';
import { ChunkStore } from './ChunkStore';
import { ExplorationMap } from './ExplorationMap';
import { BlockPartitionScheduler, BLOCK_PARTITION_COUNT, blockPartitionAt } from '../simulation/BlockPartitionScheduler';
import type { SimulationRegion } from '../simulation/SimulationRegion';
import { WorldEvolutionSystem } from '../simulation/WorldEvolutionSystem';
import { FeatureGenerator, type FeaturePlan } from '../worldgen/FeatureGenerator';

import { Hydrology } from './Hydrology';
import { CommandBus } from '../commands/CommandBus';
import { defineCommand } from '../commands/DomainCommand';

export interface BlockEdit {
  readonly x: number;
  readonly y: number;
  /** Unloaded sections can be restored without sampling the procedural terrain. */
  readonly previous: number | undefined;
  readonly block: number;
}

export interface ProducedItem {
  readonly item: string;
  readonly amount: number;
  readonly x: number;
  readonly y: number;
}

export interface TransformationEligibility {
  readonly natural: boolean;
  readonly playerPlaced: boolean;
}

interface CellState {
  natural?: boolean;
  damage?: number;
}

export class World {
  private readonly editListeners = new Set<(edit: BlockEdit) => void>();
  private readonly itemListeners = new Set<(item: ProducedItem) => void>();
  private readonly commands = new CommandBus(this);
  private readonly actions = {
    setBlock: defineCommand('setBlock', (x: number, y: number, id: number) => this.writeBlock(x, y, id)),
    mineBlock: defineCommand('mineBlock', this.applyMining.bind(this)),
    changeHabitat: defineCommand('changeHabitat', this.applyHabitatChange.bind(this)),
    transformBlock: defineCommand('transformBlock', this.applyNaturalTransformation.bind(this)),
    placeFeature: defineCommand('placeFeature', this.applyNaturalFeature.bind(this)),
  };
  readonly hydrology: Hydrology;
  readonly materials: Materials;
  readonly evolution: WorldEvolutionSystem;
  /** Compatibility alias for saves and integrations from the transformation-only version. */
  get transformations() { return this.evolution; }
  private readonly blockUpdates: BlockPartitionScheduler;

  waterAt(x: number, y: number, block = this.get(x, y)) {
    return this.hydrology.visible(x, y, block);
  }
  waterStateAt(x: number, y: number, block = this.get(x, y)) {
    return this.hydrology.state(x, y, block);
  }
  waterFlowingAt(x: number, y: number, block = this.get(x, y)) {
    return this.hydrology.flowing(this, x, y, block);
  }
  waterDrippingAt(x: number, y: number, block = this.get(x, y)) {
    return this.hydrology.dripping(this, x, y, block);
  }
  waterDirectionAt(x: number, y: number) {
    return this.hydrology.direction(x, y);
  }
  fluidKindAt(x: number, y: number, block = this.get(x, y)) {
    return this.hydrology.fluidKind(block);
  }
  readonly h: number;
  readonly width = WORLD_W;
  readonly height: number;
  readonly infinite: boolean;
  private readonly tiles: Uint16Array;
  private readonly surface: Int16Array;
  private readonly chunks: ChunkStore;
  private readonly survey = new ExplorationMap();
  private readonly edits = new Map<number, Map<number, number>>();
  private readonly damage = new Map<string, Map<number, number>>();
  private readonly falling = new Set<string>();
  private readonly naturalCells = new Set<string>();

  changeHabitat(x: number, y: number, from: number, to: number) {
    return this.commands.run(this.actions.changeHabitat(x, y, from, to));
  }
  private applyHabitatChange(x: number, y: number, from: number, to: number) {
    if (!this.inside(x, y) || this.get(x, y) !== from) return false;
    if (this.edited(x, y) && !this.naturalCells.has(this.key(x, y))) return false;
    this.writeBlock(x, y, to, { natural: true });
    return true;
  }

  canTransformNaturally(x: number, y: number, eligibility: TransformationEligibility = {
    natural: true, playerPlaced: false,
  }) {
    if (!this.inside(x, y)) return false;
    // Removing a player construction must not leave an invisible provenance
    // barrier that permanently prevents vegetation from occupying empty space.
    if (this.get(x, y) === this.materials.keys.AIR) return eligibility.natural;
    const natural = !this.edited(x, y) || this.naturalCells.has(this.key(x, y));
    return natural ? eligibility.natural : eligibility.playerPlaced;
  }
  transformNaturally(x: number, y: number, from: number, to: number, preserveWaterVolume: boolean,
    eligibility?: TransformationEligibility) {
    return this.commands.run(this.actions.transformBlock(x, y, from, to, preserveWaterVolume, eligibility));
  }
  private applyNaturalTransformation(x: number, y: number, from: number, to: number, preserveWaterVolume: boolean,
    eligibility?: TransformationEligibility) {
    if (!this.inside(x, y) || this.get(x, y) !== from || !this.canTransformNaturally(x, y, eligibility)) return false;
    if (!preserveWaterVolume) this.hydrology.clear(x, y, from);
    this.writeBlock(x, y, to, { natural: true });
    return true;
  }
  placeNaturalFeature(x: number, y: number, source: number, plan: FeaturePlan | undefined, replaceSource: boolean,
    eligibility?: TransformationEligibility) {
    return this.commands.run(this.actions.placeFeature(x, y, source, plan, replaceSource, eligibility));
  }
  canPlaceNaturalFeature(x: number, y: number, source: number, plan: FeaturePlan | undefined, replaceSource: boolean,
    eligibility?: TransformationEligibility) {
    if (!plan || this.get(x, y) !== source || !this.canTransformNaturally(x, y, eligibility)) return false;
    const placements = replaceSource ? plan.placements : plan.placements.filter(cell => cell.x !== x || cell.y !== y);
    return placements.length > 0 && placements.every(cell =>
      this.validCell(cell.x, cell.y, cell.block) &&
      this.canTransformNaturally(cell.x, cell.y, cell.x === x && cell.y === y ? eligibility : undefined) &&
      plan.replace.has(this.get(cell.x, cell.y)));
  }
  private applyNaturalFeature(x: number, y: number, source: number, plan: FeaturePlan | undefined,
    replaceSource: boolean, eligibility?: TransformationEligibility) {
    if (!this.canPlaceNaturalFeature(x, y, source, plan, replaceSource, eligibility)) return false;
    if (!plan) return false;
    const placements = replaceSource ? plan.placements : plan.placements.filter(cell => cell.x !== x || cell.y !== y);
    for (const cell of placements) this.writeBlock(cell.x, cell.y, cell.block, { natural: true });
    return true;
  }

  onItemProduced(listener: (item: ProducedItem) => void) {
    this.itemListeners.add(listener);
    return () => this.itemListeners.delete(listener);
  }

  produceItem(item: string, amount: number, x: number, y: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) return false;
    const produced = Object.freeze({ item, amount, x: (x + 0.5) * TILE, y: y * TILE });
    for (const listener of [...this.itemListeners]) listener(produced);
    return true;
  }

  isMatureTreeBase(x: number, y: number) {
    const soil = this.get(x, y + 1);
    if (soil !== this.materials.keys.DIRT && soil !== this.materials.keys.GRASS) return false;
    let row = y;
    while (row >= 0 && this.get(x, row) === this.materials.keys.WOOD && this.canTransformNaturally(x, row)) row--;
    return y - row >= 3 && this.get(x, row) === this.materials.keys.LEAF && this.canTransformNaturally(x, row);
  }
  exposedToSky(x: number, y: number) {
    if (!this.inside(x, y)) return false;
    for (let row = y - 1; row >= 0; row--) {
      // Lazy columns may not have materialized the sections above this cell.
      // A sky query is authoritative and therefore loads only the sections it
      // actually crosses instead of treating unloaded terrain as a ceiling.
      const block = this.get(x, row);
      if (block !== this.materials.keys.AIR && block !== this.materials.keys.WATER && block !== this.materials.keys.LAVA && block !== this.materials.keys.TORCH)
        return false;
    }
    return true;
  }

  exportNaturalCells(): [number, number][] {
    return [...this.naturalCells].map(key => this.coords(key));
  }

  restoreNaturalCells(cells: readonly [number, number][]) {
    for (const [x, y] of cells) {
      const block = this.recordedBlock(x, y);
      if (block !== undefined) this.naturalCells.add(this.key(x, y));
    }
  }
  /** Compatibility with saves produced before natural structures existed. */
  exportEcologicalSoil() { return this.exportNaturalCells(); }
  restoreEcologicalSoil(cells: readonly [number, number][]) { this.restoreNaturalCells(cells); }
  private fallTime = 0;
  private readonly partitionFallTime = new Float64Array(BLOCK_PARTITION_COUNT);
  readonly spawnX: number;
  constructor(readonly seed: string, readonly generationVersion = 6, content: Pick<RuntimeContent, 'materials' | 'generation' | 'transformations' | 'structures'> = defaultContent) {
    this.materials = content.materials;
    this.hydrology = new Hydrology(this.materials);
    this.evolution = new WorldEvolutionSystem(content.transformations, new FeatureGenerator(content.structures));
    this.h = hashText(seed);
    this.blockUpdates = new BlockPartitionScheduler(this.h);
    this.height = generationVersion === 1 ? LEGACY_WORLD_H : WORLD_H;
    this.infinite = generationVersion >= 3;
    this.spawnX = Math.floor(WORLD_W * 0.34);
    this.tiles = new Uint16Array(this.infinite ? 0 : WORLD_W * this.height);
    this.surface = new Int16Array(this.infinite ? 0 : WORLD_W);
    this.chunks = new ChunkStore(
      Math.ceil(this.height / CHUNK_HEIGHT),
      cx => new TerrainColumn(this.h, cx, this.height, this.spawnX, this.generationVersion, content.generation.terrain, this.materials.keys, content.generation.biomes),
      (cx, cy, cells) => this.restoreSection(cx, cy, cells),
      cx => {
        this.evolution.releaseColumn(cx);
        for (let x = cx * CHUNK_WIDTH; x < (cx + 1) * CHUNK_WIDTH; x++) this.hydrology.terrainChanged(x);
      },
    );
    this.onBlockEdited(({ x, y, previous, block }) => {
      this.hydrology.terrainChanged(x);
      if (previous !== undefined && previous !== block) this.hydrology.displace(this, x, y, previous, block);
    });
    this.onBlockEdited(({ x, y, previous }) => {
      if (previous === undefined) return;
      this.blockUpdates.invalidateNeighborhood(x, y);
      this.queueFall(x, y);
      this.queueFall(x, y - 1);
      this.evolution.invalidate(x, y);
    });
    this.hydrology.onChanged((x, y) => this.blockUpdates.invalidate(x, y));
    if (this.infinite) this.onBlockEdited(({ x, y, block }) => this.survey.update(x, y, block));
    if (generationVersion === 1) this.generateLegacy();
    else if (generationVersion === 2) content.generation.modern.run(createGenerationContext({
      keys: this.materials.keys, generationVersion, seed: this.h, width: this.width, height: this.height, spawnX: this.spawnX,
      originX: 0, surface: this.surface, globalX: (x) => x, get: (x, y) => this.get(x, y),
      set: (x, y, block) => this.set(x, y, block, false),
    }));
    // A geração v3 é preguiçosa por coluna. Uma coluna carregada contém toda a altura do mapa.
  }
  idx(x: number, y: number) {
    return y * this.width + x;
  }
  inside(x: number, y: number) {
    return (this.infinite || (x >= 0 && x < this.width)) && y >= 0 && y < this.height;
  }
  get(x: number, y: number) {
    if (y < 0) return this.materials.keys.AIR;
    if (!this.inside(x, y)) return this.materials.keys.BEDROCK;
    if (!this.infinite) return this.tiles[this.idx(x, y)];
    const chunkX = Math.floor(x / CHUNK_WIDTH), localX = x - chunkX * CHUNK_WIDTH;
    return this.chunks.section(chunkX, Math.floor(y / CHUNK_HEIGHT))[(y % CHUNK_HEIGHT) * CHUNK_WIDTH + localX];
  }
  peek(x: number, y: number) {
    if (y < 0) return this.materials.keys.AIR;
    if (!this.inside(x, y)) return this.materials.keys.BEDROCK;
    if (!this.infinite) return this.tiles[this.idx(x, y)];
    const chunkX = Math.floor(x / CHUNK_WIDTH), localX = x - chunkX * CHUNK_WIDTH;
    const section = this.chunks.peek(chunkX, Math.floor(y / CHUNK_HEIGHT));
    return section?.[(y % CHUNK_HEIGHT) * CHUNK_WIDTH + localX];
  }
  exploreAround(x: number, y: number, radius = 1) {
    if (this.infinite) this.survey.reveal(x, y, radius * CHUNK_HEIGHT + 8, this.height, (cx, cy) => this.chunks.section(cx, cy));
  }
  mapPeek(x: number, y: number) {
    const mapped = this.infinite ? this.survey.peek(x, y) : this.peek(x, y);
    if (mapped !== this.materials.keys.AIR && mapped !== this.materials.keys.WATER) return mapped;
    return this.waterAt(x, y, mapped) >= 0.15 ? this.materials.keys.WATER : this.materials.keys.AIR;
  }
  exploredBounds() {
    if (!this.infinite) return { left: 0, right: this.width - 1, top: 0, bottom: this.height - 1 };
    return this.survey.extent() ?? { left: this.spawnX, right: this.spawnX, top: 0, bottom: 0 };
  }
  exportExploration() { return this.survey.save(); }
  importExploration(entries: readonly ExploredSection[]) {
    if (this.infinite) this.survey.restore(entries);
  }
  private recordEdit(x: number, y: number, id: number) {
    const cx = Math.floor(x / CHUNK_WIDTH);
    let entries = this.edits.get(cx);
    if (!entries) {
      entries = new Map();
      this.edits.set(cx, entries);
    }
    entries.set(y * CHUNK_WIDTH + x - cx * CHUNK_WIDTH, id);
  }
  private recordedBlock(x: number, y: number) {
    const cx = Math.floor(x / CHUNK_WIDTH);
    return this.edits.get(cx)?.get(y * CHUNK_WIDTH + x - cx * CHUNK_WIDTH);
  }
  private edited(x: number, y: number) {
    return this.recordedBlock(x, y) !== undefined;
  }
  onBlockEdited(listener: (edit: BlockEdit) => void) {
    this.editListeners.add(listener);
    return () => this.editListeners.delete(listener);
  }
  set(x: number, y: number, id: number, record = true) {
    if (record) this.commands.run(this.actions.setBlock(x, y, id));
    else if (this.validCell(x, y, id)) {
      this.storeCell(x, y, id);
      this.hydrology.terrainChanged(x);
    }
  }
  private validCell(x: number, y: number, id: number) {
    return this.inside(x, y) && Number.isSafeInteger(x) && Number.isInteger(y) && Object.hasOwn(this.materials.blocks, id);
  }
  private storeCell(x: number, y: number, id: number) {
    if (this.infinite) {
      const chunkX = Math.floor(x / CHUNK_WIDTH), localX = x - chunkX * CHUNK_WIDTH;
      this.chunks.section(chunkX, Math.floor(y / CHUNK_HEIGHT))[(y % CHUNK_HEIGHT) * CHUNK_WIDTH + localX] = id;
    } else this.tiles[this.idx(x, y)] = id;
  }
  private writeBlock(x: number, y: number, block: number, state?: CellState) {
    if (!this.validCell(x, y, block)) return;
    const previous = this.get(x, y);
    this.storeCell(x, y, block);
    this.commitEdit({ x, y, previous, block }, state);
  }
  private commitEdit(edit: BlockEdit, state?: CellState) {
    const { x, y, block } = edit;
    if (state?.natural) this.naturalCells.add(this.key(x, y));
    else this.naturalCells.delete(this.key(x, y));
    this.recordEdit(x, y, block);
    this.setDamage(x, y, state?.damage ?? 0);
    Object.freeze(edit);
    for (const listener of [...this.editListeners]) listener(edit);
  }
  damageAt(x: number, y: number) {
    if (!this.damage.size) return 0;
    const cx = Math.floor(x / CHUNK_WIDTH), cy = Math.floor(y / CHUNK_HEIGHT);
    return this.damage.get(this.key(cx, cy))?.get((y % CHUNK_HEIGHT) * CHUNK_WIDTH + x - cx * CHUNK_WIDTH) ?? 0;
  }
  private setDamage(x: number, y: number, amount: number) {
    if (!amount && !this.damage.size) return;
    const cx = Math.floor(x / CHUNK_WIDTH), cy = Math.floor(y / CHUNK_HEIGHT);
    const key = this.key(cx, cy), index = (y % CHUNK_HEIGHT) * CHUNK_WIDTH + x - cx * CHUNK_WIDTH;
    let section = this.damage.get(key);
    if (!amount) {
      section?.delete(index);
      if (section?.size === 0) this.damage.delete(key);
      return;
    }
    if (!section) { section = new Map(); this.damage.set(key, section); }
    section.set(index, amount);
  }
  mine(x: number, y: number, work: number) {
    return this.commands.run(this.actions.mineBlock(x, y, work));
  }
  private applyMining(x: number, y: number, work: number) {
    const id = this.get(x, y),
      hardness = this.materials.blocks[id].hardness;
    if (!hardness || work <= 0) return 0;
    const next = Math.min(1, this.damageAt(x, y) + work / hardness);
    if (next === 1) this.set(x, y, this.materials.keys.AIR);
    else this.setDamage(x, y, next);
    return next;
  }
  exportDamage(): BlockDamage[] {
    const result: BlockDamage[] = [];
    for (const [key, section] of this.damage) {
      const [cx, cy] = this.coords(key);
      for (const [index, amount] of section) {
        const x = cx * CHUNK_WIDTH + index % CHUNK_WIDTH;
        const y = cy * CHUNK_HEIGHT + Math.floor(index / CHUNK_WIDTH);
        result.push(this.infinite ? [x, y, amount] : [this.idx(x, y), amount]);
      }
    }
    return result;
  }
  restoreDamage(entries: readonly BlockDamage[]) {
    for (const entry of entries) {
      const [x, y, amount] = entry.length === 3
        ? entry : [entry[0] % this.width, Math.floor(entry[0] / this.width), entry[1]];
      if (!this.inside(x, y) || !(amount > 0 && amount < 1)) continue;
      const block = this.peek(x, y);
      if (block === undefined || this.materials.blocks[block]?.hardness) this.setDamage(x, y, amount);
    }
  }
  private queueFall(x: number, y: number) {
    if (!this.inside(x, y) || y + 1 >= this.height) return;
    if (this.materials.blocks[this.get(x, y)].gravity && !this.materials.blocks[this.get(x, y + 1)].solid)
      this.falling.add(this.key(x, y));
  }
  stepGravity(
    dt: number,
    occupied: (x: number, y: number) => boolean,
    onDisplace: (id: number, x: number, y: number) => void,
    scope?: { region: SimulationRegion; partition: number },
    movedThisFrame?: Set<string>,
  ) {
    if (scope) {
      this.partitionFallTime[scope.partition] += dt;
      if (this.partitionFallTime[scope.partition] < 0.08) return;
      this.partitionFallTime[scope.partition] %= 0.08;
    } else {
      this.fallTime += dt;
      if (this.fallTime < 0.08) return;
      this.fallTime %= 0.08;
    }
    const pending = [...this.falling].sort((a, b) => this.coords(b)[1] - this.coords(a)[1]);
    this.falling.clear();
    for (const key of pending) {
      const [x, y] = this.coords(key);
      if (movedThisFrame?.has(key)) {
        this.falling.add(key);
        continue;
      }
      if (scope && (!scope.region.containsTile(x, y) ||
        blockPartitionAt(x, y) !== scope.partition)) {
        this.falling.add(key);
        continue;
      }
      const
        id = this.get(x, y),
        below = this.get(x, y + 1);
      if (!this.materials.blocks[id].gravity || this.materials.blocks[below].solid) continue;
      if (occupied(x, y + 1)) {
        this.falling.add(key);
        continue;
      }
      const damage = this.damageAt(x, y);
      this.set(x, y, this.materials.keys.AIR);
      this.writeBlock(x, y + 1, id, { damage });
      movedThisFrame?.add(this.key(x, y + 1));
      if (below !== this.materials.keys.AIR) onDisplace(below, x, y + 1);
    }
  }

  stepBlocks(
    dt: number,
    processFrame: boolean,
    region: SimulationRegion,
    rain: number,
    sunlight: number,
    occupied: (x: number, y: number) => boolean,
    onDisplace: (id: number, x: number, y: number) => void,
  ) {
    this.blockUpdates.advance(dt);
    if (!processFrame) return;
    // High-priority layer: moving liquids are never delayed by the partition lottery.
    this.hydrology.stepActiveFluids(dt, this, region);
    const batch = this.blockUpdates.next();
    const movedThisFrame = new Set<string>();
    for (const partition of batch.partitions)
      this.stepGravity(partition.elapsed, occupied, onDisplace,
        { region, partition: partition.id }, movedThisFrame);
    for (const partition of batch.partitions)
      this.evolution.step(partition.elapsed, this, region, partition.id);
    this.hydrology.step(batch.frameElapsed, this, region.centerX, region.centerY,
      rain, sunlight, batch.primary.id, region);
  }

  get blockUpdateStats() {
    return { ...this.blockUpdates.stats, priorityFluids: this.hydrology.activeFluidCount,
      ...this.evolution.stats, ...this.chunks.stats };
  }
  solid(x: number, y: number) {
    const block = this.get(x, y);
    if ((block === this.materials.keys.WOOD || block === this.materials.keys.LEAF) && this.canTransformNaturally(x, y)) return false;
    return this.materials.blocks[block].solid;
  }
  heightAt(x: number) {
    const tx = Math.floor(x);
    if (!this.infinite) return this.surface[clamp(tx, 0, this.width - 1)];
    const chunkX = Math.floor(tx / CHUNK_WIDTH), localX = tx - chunkX * CHUNK_WIDTH;
    return this.chunks.terrain(chunkX).surface[localX];
  }
  biomeAt(x: number) {
    x = Math.floor(x);
    if (this.generationVersion >= 4) {
      const cx = Math.floor(x / CHUNK_WIDTH);
      return this.chunks.terrain(cx).landscape!.biome(x - cx * CHUNK_WIDTH);
    }
    return this.materials.blocks[this.get(x, this.heightAt(x))].biome ?? 'Floresta';
  }
  private key(x: number, y: number) { return `${x},${y}`; }
  private coords(key: string): [number, number] {
    const comma = key.indexOf(',');
    return [Number(key.slice(0, comma)), Number(key.slice(comma + 1))];
  }
  private restoreSection(cx: number, cy: number, cells: Uint16Array) {
    const edits = this.edits.get(cx);
    if (edits) {
      const first = cy * CHUNK_HEIGHT * CHUNK_WIDTH, end = first + cells.length;
      for (const [index, block] of edits)
        if (index >= first && index < end) cells[index - first] = block;
      // A saved edit can release sand in its own cell or immediately above it.
      for (const index of edits.keys())
        for (const candidate of [index, index - CHUNK_WIDTH]) {
          if (candidate < first || candidate >= end || !this.materials.blocks[cells[candidate - first]].gravity) continue;
          const y = Math.floor(candidate / CHUNK_WIDTH);
          if (y + 1 < this.height) this.falling.add(this.key(cx * CHUNK_WIDTH + candidate % CHUNK_WIDTH, y));
        }
    }
    const key = this.key(cx, cy), damage = this.damage.get(key);
    if (damage) {
      for (const index of damage.keys()) if (!this.materials.blocks[cells[index]].hardness) damage.delete(index);
      if (!damage.size) this.damage.delete(key);
    }
  }
  get loadedChunks() { return this.chunks.size; }
  weatherChunks() {
    if (!this.infinite) return Array.from({ length: Math.ceil(this.width / CHUNK_WIDTH) }, (_, i) => i);
    return this.chunks.materializedColumns();
  }
  private carve(cx: number, cy: number, rx: number, ry: number) {
    for (
      let y = Math.max(3, Math.floor(cy - ry));
      y <= Math.min(this.height - 4, Math.ceil(cy + ry));
      y++
    )
      for (
        let x = Math.max(2, Math.floor(cx - rx));
        x <= Math.min(this.width - 3, Math.ceil(cx + rx));
        x++
      ) {
        let dx = (x - cx) / rx,
          dy = (y - cy) / ry;
        if (dx * dx + dy * dy < 1 && y > this.heightAt(x) + 5) this.set(x, y, this.materials.keys.AIR, false);
      }
  }
  private generateLegacy() {
    const rng = new RNG(this.h);
    const sh = this.h ^ 0x1a09e667;
    for (let x = 0; x < this.width; x++) {
      const hills = (noise1(x * 0.01, sh) - 0.5) * 30;
      const bumps = (noise1(x * 0.043, sh + 31) - 0.5) * 11;
      const details = (noise1(x * 0.15, sh + 11) - 0.5) * 3;
      const surface = clamp(Math.floor(43 + hills + bumps + details), 24, 63);
      this.surface[x] = surface;
      const desert = noise1(x * 0.007, sh + 72) > 0.74;
      for (let y = surface; y < this.height; y++) {
        let id;
        if (y >= this.height - 3) id = this.materials.keys.BEDROCK;
        else if (y === surface) id = desert ? this.materials.keys.SAND : this.materials.keys.GRASS;
        else if (y < surface + (desert ? 8 : 5)) id = desert ? this.materials.keys.SAND : this.materials.keys.DIRT;
        else if (y > 114) id = this.materials.keys.DEEP;
        else id = this.materials.keys.STONE;
        this.set(x, y, id, false);
      }
    }
    // Cavernas celulares orgânicas. A topologia é função exclusiva da seed.
    for (let y = 23; y < this.height - 5; y++)
      for (let x = 2; x < this.width - 2; x++) {
        if (y < this.heightAt(x) + 7) continue;
        const wide = noise2(x * 0.061, y * 0.066, this.h ^ 0xa4c32);
        const detail = noise2(x * 0.128, y * 0.12, this.h ^ 0x4ab92);
        if (wide > 0.598 || (wide > 0.535 && detail > 0.61)) this.set(x, y, this.materials.keys.AIR, false);
      }
    // Túneis que interligam as cavernas; aglomerados de minério nas rochas.
    for (let i = 0; i < 130; i++) {
      let x = rng.int(10, this.width - 10),
        y = rng.int(this.heightAt(x) + 14, this.height - 12);
      let angle = rng.next() * Math.PI * 2;
      let radius = 1.5 + rng.next() * 2.6;
      for (let step = 0; step < rng.int(18, 75); step++) {
        this.carve(x, y, radius, radius * (0.65 + rng.next() * 0.35));
        angle += (rng.next() - 0.5) * 0.46;
        x += Math.cos(angle) * 1.7;
        y += Math.sin(angle) * 1.2;
        x = clamp(x, 5, this.width - 6);
        y = clamp(y, this.heightAt(x) + 9, this.height - 8);
      }
    }
    const oreTypes = [this.materials.keys.COAL, this.materials.keys.COPPER, this.materials.keys.GOLD, this.materials.keys.CRYSTAL];
    for (let i = 0; i < 2200; i++) {
      const x = rng.int(4, this.width - 5),
        y = rng.int(this.heightAt(x) + 7, this.height - 7);
      const depth = y - this.heightAt(x);
      const type =
        oreTypes[
          depth > 52 && rng.next() > 0.75
            ? 3
            : depth > 34 && rng.next() > 0.7
              ? 2
              : rng.next() > 0.48
                ? 1
                : 0
        ];
      const radius = rng.int(1, 3);
      for (let oy = -radius; oy <= radius; oy++)
        for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radius * radius + 1 || rng.next() < 0.2) continue;
          const xx = x + ox,
            yy = y + oy,
            t = this.get(xx, yy);
          if (t === this.materials.keys.STONE || t === this.materials.keys.DEEP) this.set(xx, yy, type, false);
        }
    }
    // Árvores no solo e pequenas concentrações de folhagem.
    let previousTree = -40;
    for (let x = 8; x < this.width - 9; x++) {
      if (x - previousTree < rng.int(5, 11) || rng.next() > 0.15) continue;
      if (Math.abs(x - this.spawnX) < 8) continue;
      const y = this.surface[x];
      if (
        this.get(x, y) !== this.materials.keys.GRASS ||
        Math.abs(this.surface[x - 2] - y) > 2 ||
        Math.abs(this.surface[x + 2] - y) > 2
      )
        continue;
      const height = rng.int(4, 7);
      for (let j = 1; j <= height; j++) this.set(x, y - j, this.materials.keys.WOOD, false);
      for (let dy = -2; dy <= 1; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx * 0.5 + dy * dy * 1.2 > 5.5 || rng.next() < 0.08) continue;
          if (this.get(x + dx, y - height + dy) === this.materials.keys.AIR)
            this.set(x + dx, y - height + dy, this.materials.keys.LEAF, false);
        }
      previousTree = x;
    }
    // Garante uma área livre perto do spawn.
    const sx = this.spawnX;
    for (let x = sx - 3; x <= sx + 3; x++)
      for (let y = this.surface[x] - 5; y < this.surface[x]; y++) this.set(x, y, this.materials.keys.AIR, false);
    // Pequeno acampamento inicial com tochas — marcadores de exploração.
    for (const config of Object.values(this.materials.blocks)) {
      if (!config.spawnDecoration) continue;
      for (const offset of config.spawnDecoration.offsets) {
        const x = sx + offset;
        this.set(x, this.surface[x] - 1, config.id, false);
      }
    }
  }
  collides(x: number, y: number, w: number, h: number) {
    for (let row = Math.floor(y / TILE); row <= Math.floor((y + h - 0.1) / TILE); row++)
      for (let col = Math.floor(x / TILE); col <= Math.floor((x + w - 0.1) / TILE); col++)
        if (this.solid(col, row)) return true;
    return false;
  }
  exportEdits(): TileEdit[] {
    const edits: TileEdit[] = [];
    for (const [cx, entries] of this.edits)
      for (const [index, block] of entries) {
        const x = cx * CHUNK_WIDTH + index % CHUNK_WIDTH, y = Math.floor(index / CHUNK_WIDTH);
        edits.push(this.infinite ? [x, y, block] : [this.idx(x, y), block]);
      }
    return edits;
  }
  importEdits(changes: readonly TileEdit[]) {
    if (!Array.isArray(changes)) return;
    for (const pair of changes) {
      if (!Array.isArray(pair) || (pair.length !== 2 && pair.length !== 3)) continue;
      const [x, y, val] = pair.length === 3
        ? pair
        : [pair[0] % this.width, Math.floor(pair[0] / this.width), pair[1]];
      if (!this.validCell(x, y, val)) continue;
      if (!this.infinite || this.chunks.peek(Math.floor(x / CHUNK_WIDTH), Math.floor(y / CHUNK_HEIGHT)))
        this.set(x, y, val);
      else this.commitEdit({ x, y, previous: undefined, block: val });
    }
  }
}
export type TerrainView = Pick<
  World,
  'materials' | 'seed' | 'width' | 'height' | 'infinite' | 'h' | 'get' | 'peek' | 'mapPeek' | 'exploredBounds' | 'heightAt' | 'biomeAt' | 'damageAt' | 'waterAt' | 'waterFlowingAt' | 'waterDrippingAt' | 'waterDirectionAt' | 'fluidKindAt' | 'onBlockEdited'
>;
