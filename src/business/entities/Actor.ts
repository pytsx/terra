import { B, TILE } from '../catalog';
import type { World } from '../world/World';
export interface ActorView {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly vx: number;
  readonly ground: boolean;
  readonly face: number;
  readonly swimming?: boolean;
}
export abstract class Actor {
  protected vx = 0;
  protected vy = 0;
  protected ground = false;
  protected face = 1;
  protected swimming = false;
  protected waterFraction = 0;
  protected constructor(
    protected x: number,
    protected y: number,
    protected readonly w: number,
    protected readonly h: number,
  ) {}
  protected move(dt: number, world: World) {
    const tx = Math.floor((this.x + this.w / 2) / TILE);
    let immersed = 0;
    for (let ty = Math.floor(this.y / TILE); ty <= Math.floor((this.y + this.h) / TILE); ty++) {
      const id = world.get(tx, ty);
      if (id !== B.AIR && id !== B.WATER && id !== B.TORCH) continue;
      const bottom = (ty + 1) * TILE;
      const surface = bottom - world.waterAt(tx, ty, id) * TILE;
      immersed += Math.max(0, Math.min(this.y + this.h, bottom) - Math.max(this.y, surface));
    }
    const fraction = immersed / this.h;
    this.waterFraction = fraction;
    this.swimming = fraction > 0.2;
    if (immersed > 0) this.vy = (this.vy - 1900 * fraction * dt) / (1 + 7 * fraction * dt);
    const nx = this.x + this.vx * dt * (1 - fraction * 0.4);
    if (this.vx !== 0) this.face = Math.sign(this.vx);
    if (world.collides(nx, this.y, this.w, this.h)) {
      if (this.vx > 0) this.x = Math.floor((nx + this.w - 0.1) / TILE) * TILE - this.w;
      if (this.vx < 0) this.x = (Math.floor(nx / TILE) + 1) * TILE;
      this.vx = 0;
    } else this.x = nx;
    const ny = this.y + this.vy * dt;
    this.ground = false;
    if (world.collides(this.x, ny, this.w, this.h)) {
      if (this.vy > 0) {
        this.y = Math.floor((ny + this.h - 0.1) / TILE) * TILE - this.h;
        this.ground = true;
      }
      if (this.vy < 0) this.y = (Math.floor(ny / TILE) + 1) * TILE;
      this.vy = 0;
    } else this.y = ny;
  }
  view(): ActorView {
    return {
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      vx: this.vx,
      ground: this.ground,
      face: this.face,
      swimming: this.swimming,
    };
  }
  protected saveActor(): import('../save').EntitySave['actor'] {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy, ground: this.ground,
      face: this.face, swimming: this.swimming };
  }
  protected restoreActor(state: import('../save').EntitySave['actor']) {
    if (![state.x, state.y, state.vx, state.vy, state.face].every(Number.isFinite)) return;
    this.x = state.x; this.y = state.y; this.vx = state.vx; this.vy = state.vy;
    this.ground = !!state.ground; this.face = Math.sign(state.face) || 1; this.swimming = !!state.swimming;
  }
}
