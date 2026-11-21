export interface PerformanceSnapshot {
  fps: number;
  frame: { average: number; p95: number; max: number };
  systems: { simulation: number; rendering: number };
  samples: number;
}

/** Small rolling window suitable for the debug HUD and automated soak tests. */
export class PerformanceMonitor {
  private readonly frames: number[] = [];
  private readonly simulation: number[] = [];
  private readonly rendering: number[] = [];
  constructor(private readonly capacity = 180) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError('Invalid metrics capacity');
  }
  record(frameMs: number, simulationMs: number, renderingMs: number) {
    this.push(this.frames, frameMs);
    this.push(this.simulation, simulationMs);
    this.push(this.rendering, renderingMs);
  }
  snapshot(): PerformanceSnapshot {
    const sorted = [...this.frames].sort((a, b) => a - b);
    const average = this.average(this.frames);
    return {
      fps: average > 0 ? 1000 / average : 0,
      frame: {
        average,
        p95: sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] : 0,
        max: sorted.at(-1) ?? 0,
      },
      systems: { simulation: this.average(this.simulation), rendering: this.average(this.rendering) },
      samples: this.frames.length,
    };
  }
  reset() { this.frames.length = this.simulation.length = this.rendering.length = 0; }
  private push(values: number[], value: number) {
    values.push(Number.isFinite(value) ? Math.max(0, value) : 0);
    if (values.length > this.capacity) values.shift();
  }
  private average(values: readonly number[]) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }
}
