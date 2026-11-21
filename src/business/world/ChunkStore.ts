import type { TerrainColumn } from '../worldgen/TerrainColumn';

interface Chunk {
  terrain: TerrainColumn;
  sections: Map<number, Uint16Array>;
}

const MAX_COLUMNS = 64;

export class ChunkStore {
  private readonly columns = new Map<number, Chunk>();
  private sectionLoads = 0;
  private evictionCount = 0;

  constructor(
    private readonly sectionCount: number,
    private readonly generateColumn: (cx: number) => TerrainColumn,
    private readonly restoreSection: (cx: number, cy: number, cells: Uint16Array) => void,
    private readonly evicted: (cx: number) => void,
  ) {}

  get size() { return this.columns.size; }

  private column(cx: number) {
    let chunk = this.columns.get(cx);
    if (!chunk) {
      chunk = { terrain: this.generateColumn(cx), sections: new Map() };
      this.columns.set(cx, chunk);
      if (this.columns.size > MAX_COLUMNS) {
        const oldest = this.columns.keys().next().value!;
        this.columns.delete(oldest);
        this.evictionCount++;
        this.evicted(oldest);
      }
    } else {
      // Map preserves insertion order. Reinsert on access so the first entry is
      // always the least recently used column instead of the oldest created one.
      this.columns.delete(cx);
      this.columns.set(cx, chunk);
    }
    return chunk;
  }

  terrain(cx: number) { return this.column(cx).terrain; }

  peek(cx: number, cy: number) { return this.columns.get(cx)?.sections.get(cy); }

  section(cx: number, cy: number) {
    if (!Number.isSafeInteger(cy) || cy < 0 || cy >= this.sectionCount)
      throw new RangeError(`Invalid chunk section: ${cy}`);
    const column = this.column(cx);
    let cells = column.sections.get(cy);
    if (!cells) {
      cells = column.terrain.generate(cy);
      this.sectionLoads++;
      this.restoreSection(cx, cy, cells);
      column.sections.set(cy, cells);
    }
    return cells;
  }

  materializedColumns() {
    return [...this.columns].filter(([, chunk]) => chunk.sections.size > 0).map(([cx]) => cx);
  }
  get stats() {
    let sections = 0;
    for (const chunk of this.columns.values()) sections += chunk.sections.size;
    return { loadedColumns: this.columns.size, materializedSections: sections,
      sectionLoads: this.sectionLoads, chunkEvictions: this.evictionCount };
  }
}
