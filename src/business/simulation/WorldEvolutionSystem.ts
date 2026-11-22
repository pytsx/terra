import { hashText, mixHash } from '../../shared/math';
import type { World } from '../world/World';
import type { FeatureGenerator } from '../worldgen/FeatureGenerator';
import { CHUNK_WIDTH, CHUNK_HEIGHT } from '../EngineTypes';
import { blockPartitionAt } from './BlockPartitionScheduler';
import type { SimulationRegion } from './SimulationRegion';
import { TransformationEvaluator } from './TransformationEvaluator';
import type { TransformationRegistry } from './TransformationRegistry';
import { TransformationState, type TransformationStateRecord } from './TransformationState';

export const MAX_EVOLUTION_CELLS_PER_PARTITION = 1024;

/** Spatially partitions discovery and scheduling so explored history does not
 * increase the cost of simulating the player's current region. */
export class WorldEvolutionSystem {
  private readonly evaluator = new TransformationEvaluator();
  private readonly state = new TransformationState();
  private readonly candidatesByChunk = new Map<string, Set<string>>();
  private readonly scannedCells = new Map<string, Uint8Array>();

  constructor(private readonly registry: TransformationRegistry, private readonly features: FeatureGenerator) {}

  step(dt: number, world: World, region: SimulationRegion, partition: number) {
    if (!(dt > 0)) return;
    const top = Math.max(0, region.top);
    const bottom = Math.min(world.height - 1, region.bottom);
    if (top > bottom) return;
    const minChunkX = Math.floor(region.left / CHUNK_WIDTH);
    const maxChunkX = Math.floor(region.right / CHUNK_WIDTH);
    const minChunkY = Math.floor(top / CHUNK_HEIGHT);
    const maxChunkY = Math.floor(bottom / CHUNK_HEIGHT);

    for (let cy = minChunkY; cy <= maxChunkY; cy++)
      for (let cx = minChunkX; cx <= maxChunkX; cx++)
        this.discover(world, region, partition, cx, cy, top, bottom);

    let remaining = MAX_EVOLUTION_CELLS_PER_PARTITION;
    for (let cy = minChunkY; cy <= maxChunkY && remaining > 0; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX && remaining > 0; cx++) {
        const bucketKey = this.chunkKey(cx, cy, partition);
        const bucket = this.candidatesByChunk.get(bucketKey);
        if (!bucket?.size) continue;
        const scheduled = bucket.size;
        let visited = 0;
        for (const key of bucket) {
          if (visited++ >= scheduled || remaining <= 0) break;
          bucket.delete(key);
          const [x, y] = this.coords(key);
          if (x < region.left || x > region.right || y < top || y > bottom) {
            bucket.add(key);
            continue;
          }
          const block = world.peek(x, y);
          if (block === undefined) continue;
          const rules = this.registry.forBlock(block);
          if (!rules.length) {
            this.state.invalidateCell(x, y);
            continue;
          }
          remaining--;
          if (this.evaluateCell(dt, world, x, y, block, rules)) bucket.add(key);
        }
        if (!bucket.size) this.candidatesByChunk.delete(bucketKey);
      }
    }
  }

  private discover(world: World, region: SimulationRegion, partition: number,
    cx: number, cy: number, top: number, bottom: number) {
    const chunkLeft = cx * CHUNK_WIDTH, chunkTop = cy * CHUNK_HEIGHT;
    const left = Math.max(region.left, chunkLeft);
    const right = Math.min(region.right, chunkLeft + CHUNK_WIDTH - 1);
    const scanTop = Math.max(top, chunkTop);
    const scanBottom = Math.min(bottom, Math.min(world.height - 1, chunkTop + CHUNK_HEIGHT - 1));
    const bucketKey = this.chunkKey(cx, cy, partition);
    let scanned = this.scannedCells.get(bucketKey);
    if (!scanned) this.scannedCells.set(bucketKey, scanned = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT));
    for (let y = scanTop; y <= scanBottom; y++) {
      for (let x = left; x <= right; x++) {
        if (blockPartitionAt(x, y) !== partition) continue;
        const index = (y - chunkTop) * CHUNK_WIDTH + x - chunkLeft;
        if (scanned[index]) continue;
        const block = world.peek(x, y);
        // Unloaded sections remain discoverable when they are materialized.
        if (block === undefined) continue;
        scanned[index] = 1;
        if (this.registry.forBlock(block).length) this.addCandidate(x, y, partition);
      }
    }
  }

  private evaluateCell(dt: number, world: World, x: number, y: number, block: number,
    rules: ReturnType<TransformationRegistry['forBlock']>) {
    let keep = true;
    for (const rule of rules) {
      if (!world.canTransformNaturally(x, y, rule.eligibility)) {
        this.state.invalidateCell(x, y);
        keep = false;
        break;
      }
      const previous = this.state.get(x, y, rule.id);
      const support = world.materials.blocks[block].support;
      const soil = support ? world.get(x, y + 1) : undefined;
      const evaluation = this.evaluator.evaluate(rule, {
        matureTree: () => world.isMatureTreeBase(x, y),
        soilMoisture: support && soil !== undefined && (soil === world.materials.keys[support] || world.materials.blocks[soil].fertile)
          ? world.waterStateAt(x, y + 1).saturation : 0,
        water: world.waterStateAt(x, y, block),
        environment: { exposedToSky: world.exposedToSky(x, y) },
      }, previous, dt);
      if (!evaluation.conditionsSatisfied) {
        this.state.resetCondition(x, y, rule.id, previous.attempts);
        continue;
      }
      const next = { elapsed: evaluation.elapsed, attempted: previous.attempted, attempts: previous.attempts };
      if (evaluation.canAttempt) {
        if (rule.rootWaterCost && world.waterStateAt(x, y + 1).volume * 1000 < rule.rootWaterCost) continue;
        const plan = rule.action.type === 'placeFeature'
          ? this.features.plan(rule.action.feature, x, y, world.h, previous.attempts) : undefined;
        if (rule.action.type === 'placeFeature' &&
          !world.canPlaceNaturalFeature(x, y, rule.source, plan, rule.action.replaceSource, rule.eligibility)) {
          this.state.set(x, y, rule.id, next);
          continue;
        }
        const roll = mixHash(x, y, world.h ^ hashText(rule.id) ^ previous.attempts) / 4294967296;
        const applied = roll < rule.probability && (rule.action.type === 'transformBlock'
          ? world.transformNaturally(x, y, rule.source, rule.action.to,
            rule.action.preserve.includes('waterVolume'), rule.eligibility)
          : rule.action.type === 'placeFeature'
            ? world.placeNaturalFeature(x, y, rule.source, plan, rule.action.replaceSource, rule.eligibility)
            : world.produceItem(rule.action.item, rule.action.amount, x, y));
        next.attempted = true;
        if (applied && rule.rootWaterCost) world.hydrology.drink(x, y + 1, world.get(x, y + 1), rule.rootWaterCost);
        next.attempts++;
        if (applied && rule.action.type !== 'spawnItem') {
          this.state.invalidateCell(x, y);
          keep = false;
          break;
        }
        if (rule.retry === 'every-interval') {
          this.state.set(x, y, rule.id, { elapsed: 0, attempted: false, attempts: next.attempts });
          continue;
        }
      }
      this.state.set(x, y, rule.id, next);
    }
    return keep;
  }

  invalidate(x: number, y: number) {
    this.state.invalidateCell(x, y);
    const partition = blockPartitionAt(x, y);
    this.addCandidate(x, y, partition);
    const cx = Math.floor(x / CHUNK_WIDTH), cy = Math.floor(y / CHUNK_HEIGHT);
    const scanned = this.scannedCells.get(this.chunkKey(cx, cy, partition));
    if (scanned) {
      const localX = x - cx * CHUNK_WIDTH, localY = y - cy * CHUNK_HEIGHT;
      scanned[localY * CHUNK_WIDTH + localX] = 0;
    }
  }

  invalidateChunk(x: number, y: number) {
    const cx = Math.floor(x / CHUNK_WIDTH), cy = Math.floor(y / CHUNK_HEIGHT);
    for (let partition = 0; partition < 4; partition++)
      this.scannedCells.delete(this.chunkKey(cx, cy, partition));
  }

  /** Releases discovery indexes for an evicted column. Durable temporal state
   * remains in TransformationState and resumes when the column is revisited. */
  releaseColumn(cx: number) {
    const prefix = `${cx},`;
    for (const key of this.scannedCells.keys()) if (key.startsWith(prefix)) this.scannedCells.delete(key);
    for (const key of this.candidatesByChunk.keys()) if (key.startsWith(prefix)) this.candidatesByChunk.delete(key);
  }

  save() { return this.state.save(); }
  restore(records: readonly TransformationStateRecord[]) {
    this.state.restore(records, id => this.registry.has(id));
  }
  get trackedCells() { return this.state.size; }
  get stats() {
    let candidates = 0;
    for (const bucket of this.candidatesByChunk.values()) candidates += bucket.size;
    return { transformations: this.state.size, evolutionCandidates: candidates,
      evolutionIndexedPartitions: this.scannedCells.size };
  }

  private addCandidate(x: number, y: number, partition: number) {
    const cx = Math.floor(x / CHUNK_WIDTH), cy = Math.floor(y / CHUNK_HEIGHT);
    const bucketKey = this.chunkKey(cx, cy, partition);
    let bucket = this.candidatesByChunk.get(bucketKey);
    if (!bucket) this.candidatesByChunk.set(bucketKey, bucket = new Set());
    bucket.add(this.key(x, y));
  }
  private chunkKey(cx: number, cy: number, partition: number) { return `${cx},${cy}|${partition}`; }
  private key(x: number, y: number) { return `${x},${y}`; }
  private coords(key: string): [number, number] {
    const comma = key.indexOf(',');
    return [Number(key.slice(0, comma)), Number(key.slice(comma + 1))];
  }
}
