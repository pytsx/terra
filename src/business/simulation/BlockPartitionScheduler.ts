import { RNG } from '../../shared/math';

export const BLOCK_PARTITION_COLUMNS = 2;
export const BLOCK_PARTITION_ROWS = 2;
export const BLOCK_PARTITION_COUNT = BLOCK_PARTITION_COLUMNS * BLOCK_PARTITION_ROWS;

const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export function blockPartitionAt(x: number, y: number) {
  return modulo(x, BLOCK_PARTITION_COLUMNS) +
    modulo(y, BLOCK_PARTITION_ROWS) * BLOCK_PARTITION_COLUMNS;
}

export interface PartitionWork {
  id: number;
  elapsed: number;
  urgent: boolean;
}

export interface BlockUpdateBatch {
  primary: PartitionWork;
  partitions: readonly PartitionWork[];
  frameElapsed: number;
}

export class BlockPartitionScheduler {
  private readonly elapsed = new Float64Array(BLOCK_PARTITION_COUNT);
  private readonly dirty = new Set<number>();
  private readonly rng: RNG;
  private order = Array.from({ length: BLOCK_PARTITION_COUNT }, (_, id) => id);
  private cursor = 0;
  private pendingFrameTime = 0;
  private lastPrimary = -1;

  constructor(seed: number) {
    this.rng = new RNG(seed ^ 0x51a7e);
    this.shuffle();
  }

  advance(dt: number) {
    this.pendingFrameTime += dt;
    for (let id = 0; id < this.elapsed.length; id++) this.elapsed[id] += dt;
  }

  invalidate(x: number, y: number) {
    this.dirty.add(blockPartitionAt(x, y));
  }

  invalidateNeighborhood(x: number, y: number) {
    this.invalidate(x, y);
    this.invalidate(x - 1, y);
    this.invalidate(x + 1, y);
    this.invalidate(x, y - 1);
    this.invalidate(x, y + 1);
  }

  next(): BlockUpdateBatch {
    const primaryId = this.order[this.cursor++];
    if (this.cursor === this.order.length) {
      this.cursor = 0;
      this.shuffle();
    }
    const ids = new Set([primaryId, ...this.dirty]);
    const partitions = [...ids].map((id): PartitionWork => {
      const work = { id, elapsed: this.elapsed[id], urgent: this.dirty.has(id) };
      this.elapsed[id] = 0;
      this.dirty.delete(id);
      return work;
    });
    const frameElapsed = this.pendingFrameTime;
    this.pendingFrameTime = 0;
    this.lastPrimary = primaryId;
    return {
      primary: partitions.find(partition => partition.id === primaryId)!,
      partitions,
      frameElapsed,
    };
  }

  get stats() {
    return {
      partitions: BLOCK_PARTITION_COUNT,
      lastPrimary: this.lastPrimary,
      pendingInvalidations: this.dirty.size,
    };
  }

  private shuffle() {
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    }
  }
}
