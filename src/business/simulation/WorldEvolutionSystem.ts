import { hashText, mixHash } from '../../shared/math';
import type { World } from '../world/World';
import { featureGenerator } from '../worldgen/FeatureGenerator';
import { CHUNK_WIDTH, CHUNK_HEIGHT } from '../catalog';
import { blockPartitionAt } from './BlockPartitionScheduler';
import type { SimulationRegion } from './SimulationRegion';
import { TransformationEvaluator } from './TransformationEvaluator';
import { transformationRegistry, type TransformationRegistry } from './TransformationRegistry';
import { TransformationState, type TransformationStateRecord } from './TransformationState';

export const MAX_EVOLUTION_CELLS_PER_PARTITION = 1024;

export class WorldEvolutionSystem {
  private readonly evaluator = new TransformationEvaluator();
  private readonly state = new TransformationState();
  private readonly candidates = new Set<string>();
  private readonly scannedChunks = new Set<string>();
  private cursor = 0;

  constructor(private readonly registry: TransformationRegistry = transformationRegistry) {}

  step(dt: number, world: World, region: SimulationRegion, partition: number) {
    if (!(dt > 0)) return;

    // A chunk is fully inside the simulation region if all its boundaries are within the region.
    // For chunks that are only partially overlapped by the region, we scan the cells in region,
    // but only mark the chunk as fully scanned when the region completely encloses it.
    const minChunkX = Math.floor(region.left / CHUNK_WIDTH);
    const maxChunkX = Math.floor(region.right / CHUNK_WIDTH);
    const topClamped = Math.max(0, region.top);
    const bottomClamped = Math.min(world.height - 1, region.bottom);
    const minChunkY = Math.floor(topClamped / CHUNK_HEIGHT);
    const maxChunkY = Math.floor(bottomClamped / CHUNK_HEIGHT);

    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        const partitionChunkKey = `${cx},${cy}|${partition}`;
        if (this.scannedChunks.has(partitionChunkKey)) continue;

        const chunkLeft = cx * CHUNK_WIDTH;
        const chunkRight = (cx + 1) * CHUNK_WIDTH - 1;
        const chunkTop = cy * CHUNK_HEIGHT;
        const chunkBottom = Math.min(world.height - 1, (cy + 1) * CHUNK_HEIGHT - 1);

        const cLeft = Math.max(region.left, chunkLeft);
        const cRight = Math.min(region.right, chunkRight);
        const cTop = Math.max(topClamped, chunkTop);
        const cBottom = Math.min(bottomClamped, chunkBottom);

        for (let y = cTop; y <= cBottom; y++) {
          for (let x = cLeft; x <= cRight; x++) {
            if (blockPartitionAt(x, y) === partition && world.peek(x, y) !== undefined) {
              this.candidates.add(this.key(x, y));
            }
          }
        }

        // Only mark chunk as fully scanned for this partition if region covered the full chunk bounds
        if (region.left <= chunkLeft && region.right >= chunkRight &&
            region.top <= chunkTop && region.bottom >= chunkBottom) {
          this.scannedChunks.add(partitionChunkKey);
        }
      }
    }

    // Fair cursor-based processing over a snapshot of candidates
    const snapshot = Array.from(this.candidates);
    const total = snapshot.length;
    if (total === 0) return;

    // Clamp cursor in case candidates shrank since last call
    if (this.cursor >= total) this.cursor = 0;

    let processed = 0;
    const top = Math.max(0, region.top);
    const bottom = Math.min(world.height - 1, region.bottom);
    let i = this.cursor;
    let visited = 0;

    while (visited < total && processed <= MAX_EVOLUTION_CELLS_PER_PARTITION) {
      const key = snapshot[i];
      i = (i + 1) % total;
      visited++;

      // Key may have been deleted from the live set already
      if (!this.candidates.has(key)) continue;

      const [x, y] = this.coords(key);

      // Skip if not in current region or wrong partition
      if (y < top || y > bottom || x < region.left || x > region.right ||
        blockPartitionAt(x, y) !== partition) continue;

      const block = world.peek(x, y);
      if (block === undefined) {
        this.candidates.delete(key);
        continue;
      }

      const rules = this.registry.forBlock(block);
      if (!rules.length) {
        this.candidates.delete(key);
        continue;
      }

      if (++processed > MAX_EVOLUTION_CELLS_PER_PARTITION) break;

      for (const rule of rules) {
        if (!world.canTransformNaturally(x, y, rule.eligibility)) {
          this.state.invalidateCell(x, y);
          continue;
        }
        const previous = this.state.get(x, y, rule.id);
        const evaluation = this.evaluator.evaluate(rule, {
          water: world.waterStateAt(x, y, block),
          environment: { exposedToSky: world.exposedToSky(x, y) },
        }, previous, dt);
        if (!evaluation.conditionsSatisfied) {
          this.state.resetCondition(x, y, rule.id, previous.attempts);
          continue;
        }
        const next = { elapsed: evaluation.elapsed, attempted: previous.attempted, attempts: previous.attempts };
        if (evaluation.canAttempt) {
          const plan = rule.action.type === 'placeFeature'
            ? featureGenerator.plan(rule.action.feature, x, y, world.h, previous.attempts)
            : undefined;
          if (rule.action.type === 'placeFeature' &&
            !world.canPlaceNaturalFeature(x, y, rule.source, plan, rule.action.replaceSource, rule.eligibility)) {
            // Placement blocked by space: do not consume the attempt or mark attempted.
            // Leave attempted: false so when space clears, it can be attempted immediately.
            this.state.set(x, y, rule.id, next);
            continue;
          }
          const roll = mixHash(x, y, world.h ^ hashText(rule.id) ^ previous.attempts) / 4294967296;
          const actionApplied = roll < rule.probability && (rule.action.type === 'transformBlock'
            ? world.transformNaturally(x, y, rule.source, rule.action.to,
              rule.action.preserve.includes('waterVolume'), rule.eligibility)
            : rule.action.type === 'placeFeature'
              ? world.placeNaturalFeature(x, y, rule.source, plan, rule.action.replaceSource, rule.eligibility)
              : world.produceItem(rule.action.item, rule.action.amount, x, y));
          next.attempted = true;
          next.attempts++;
          if (actionApplied) {
            if (rule.retry === 'every-interval') {
              // For periodic effects: reset elapsed and attempted to start next interval,
              // keep the candidate alive, do not invalidate the cell state.
              this.state.set(x, y, rule.id, { elapsed: 0, attempted: false, attempts: next.attempts });
              continue;
            } else if (rule.action.type === 'spawnItem') {
              // For spawnItem with on-condition-reset: block didn't change, preserve attempted=true
              // so it does not fire again without condition reset.
              this.state.set(x, y, rule.id, next);
              continue;
            } else {
              // For block-transforming actions: invalidate all state for this cell and stop.
              this.state.invalidateCell(x, y);
              break;
            }
          } else if (rule.retry === 'every-interval') {
            // Probabilistic failure on periodic effect: reset elapsed to wait for next interval
            this.state.set(x, y, rule.id, { elapsed: 0, attempted: false, attempts: next.attempts });
            continue;
          }
        }
        this.state.set(x, y, rule.id, next);
      }
    }

    // Update cursor for next call (round-robin)
    this.cursor = i % total;
  }

  invalidate(x: number, y: number) {
    this.state.invalidateCell(x, y);
    this.candidates.add(this.key(x, y));
    this.invalidateChunk(x, y);
  }

  invalidateChunk(x: number, y: number) {
    const cx = Math.floor(x / CHUNK_WIDTH);
    const cy = Math.floor(y / CHUNK_HEIGHT);
    const prefix = `${cx},${cy}|`;
    for (const key of this.scannedChunks) {
      if (key.startsWith(prefix)) this.scannedChunks.delete(key);
    }
  }

  save() { return this.state.save(); }
  restore(records: readonly TransformationStateRecord[]) {
    this.state.restore(records, id => this.registry.has(id));
  }
  get trackedCells() { return this.state.size; }
  private key(x: number, y: number) { return `${x},${y}`; }
  private coords(key: string): [number, number] {
    const comma = key.indexOf(',');
    return [Number(key.slice(0, comma)), Number(key.slice(comma + 1))];
  }
}
