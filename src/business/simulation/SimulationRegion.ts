import { TILE } from '../catalog';

// Covers a 960 × 540 viewport at minimum zoom plus an off-screen safety margin.
export const ACTIVE_HALF_WIDTH = 38;
export const ACTIVE_HALF_HEIGHT = 24;

export class SimulationRegion {
  private constructor(
    readonly left: number,
    readonly right: number,
    readonly top: number,
    readonly bottom: number,
  ) {}

  get centerX() { return Math.floor((this.left + this.right) / 2); }
  get centerY() { return Math.floor((this.top + this.bottom) / 2); }

  static around(actor: { x: number; y: number; w: number; h: number }) {
    const x = Math.floor((actor.x + actor.w / 2) / TILE);
    const y = Math.floor((actor.y + actor.h / 2) / TILE);
    return new SimulationRegion(
      x - ACTIVE_HALF_WIDTH, x + ACTIVE_HALF_WIDTH,
      y - ACTIVE_HALF_HEIGHT, y + ACTIVE_HALF_HEIGHT,
    );
  }

  containsTile(x: number, y: number) {
    return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
  }

  containsColumn(x: number) {
    return x >= this.left && x <= this.right;
  }

  intersects(actor: { x: number; y: number; w: number; h: number }) {
    return actor.x + actor.w >= this.left * TILE &&
      actor.x <= (this.right + 1) * TILE &&
      actor.y + actor.h >= this.top * TILE &&
      actor.y <= (this.bottom + 1) * TILE;
  }
}
