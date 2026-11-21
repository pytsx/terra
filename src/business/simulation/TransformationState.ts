export type TransformationStateRecord = [
  x: number, y: number, rule: string, elapsed: number, attempted: 0 | 1, attempts: number,
];

export interface TransformationCellState {
  elapsed: number;
  attempted: boolean;
  attempts: number;
}

export class TransformationState {
  private readonly cells = new Map<string, TransformationCellState>();
  private key(x: number, y: number, rule: string) { return `${x},${y}|${rule}`; }

  get(x: number, y: number, rule: string) {
    return this.cells.get(this.key(x, y, rule)) ?? { elapsed: 0, attempted: false, attempts: 0 };
  }
  set(x: number, y: number, rule: string, state: TransformationCellState) {
    this.cells.set(this.key(x, y, rule), state);
  }
  resetCondition(x: number, y: number, rule: string, attempts: number) {
    if (attempts) this.set(x, y, rule, { elapsed: 0, attempted: false, attempts });
    else this.cells.delete(this.key(x, y, rule));
  }
  invalidateCell(x: number, y: number) {
    const prefix = `${x},${y}|`;
    for (const key of this.cells.keys()) if (key.startsWith(prefix)) this.cells.delete(key);
  }
  save(): TransformationStateRecord[] {
    const result: TransformationStateRecord[] = [];
    for (const [key, state] of this.cells) {
      const split = key.lastIndexOf('|'), coordinates = key.slice(0, split), comma = coordinates.indexOf(',');
      result.push([Number(coordinates.slice(0, comma)), Number(coordinates.slice(comma + 1)), key.slice(split + 1),
        state.elapsed, state.attempted ? 1 : 0, state.attempts]);
    }
    return result;
  }
  restore(records: readonly TransformationStateRecord[], knownRule: (id: string) => boolean) {
    this.cells.clear();
    for (const [x, y, rule, elapsed, attempted, attempts] of records)
      if (Number.isSafeInteger(x) && Number.isInteger(y) && knownRule(rule) && Number.isFinite(elapsed) && elapsed >= 0 &&
        (attempted === 0 || attempted === 1) && Number.isSafeInteger(attempts) && attempts >= 0)
        this.set(x, y, rule, { elapsed, attempted: !!attempted, attempts });
  }
  get size() { return this.cells.size; }
}
