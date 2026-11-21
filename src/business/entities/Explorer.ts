import { Actor } from './Actor';
import { TILE } from '../catalog';
import type { World } from '../world/World';
import type { PlayerSave } from '../save';
import { clamp } from '../../shared/math';
export interface Movement {
  direction: number;
  sprint: boolean;
  jump: boolean;
  dive?: boolean;
  ascend?: boolean;
}
export class Explorer extends Actor {
  private life = 5;
  private maxLife = 5;
  private invuln = 0;
  private depthMax = 0;
  private placed = 0;
  private animation = 0;
  private grace = 0;
  private jumpBuffer = 0;
  private lookDirection = 1;
  constructor(world: World, saved?: PlayerSave) {
    super(
      saved?.x ?? world.spawnX * TILE + 2,
      saved?.y ?? (world.heightAt(world.spawnX) - 4) * TILE,
      18,
      30,
    );
    if (saved) {
      this.life = saved.life;
      this.depthMax = saved.depthMax;
      this.placed = saved.placed;
    }
  }
  step(dt: number, input: Movement, world: World) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.grace = this.ground ? 0.1 : Math.max(0, this.grace - dt);
    this.jumpBuffer = input.jump ? 0.13 : Math.max(0, this.jumpBuffer - dt);
    const speed = input.sprint ? 245 : 165;
    this.vx += clamp(input.direction * speed - this.vx, -1150 * dt, 1150 * dt);
    if (this.grace > 0 && this.jumpBuffer > 0) {
      this.vy = -350;
      this.jumpBuffer = 0;
      this.grace = 0;
    }
    if (this.swimming) {
      if (input.dive) this.vy = Math.max(this.vy, 115);
      if (input.jump || input.ascend)
        this.vy = Math.min(this.vy, this.waterFraction < 0.55 ? -350 : -215);
    }
    this.vy = Math.min(530, this.vy + 960 * dt);
    this.move(dt, world);
    // Preserve the upward impulse for the frame in which the head leaves water.
    if (!this.swimming && input.jump && this.vy < 0) this.vy = Math.min(this.vy, -285);
    this.face = this.lookDirection;
    if (!world.infinite) this.x = clamp(this.x, TILE, (world.width - 2) * TILE);
    this.animation += Math.abs(this.vx) > 5 ? (dt * Math.abs(this.vx)) / 15 : dt * 1.5;
    this.depthMax = Math.max(
      this.depthMax,
      Math.floor(this.y / TILE) - world.heightAt(this.x / TILE),
    );
  }
  recordPlacement() {
    this.placed++;
  }
  lookAt(worldX: number) {
    const delta = worldX - (this.x + this.w / 2);
    if (Math.abs(delta) > 0.01) this.lookDirection = Math.sign(delta);
    this.face = this.lookDirection;
  }
  heal(amount: number) {
    this.life = Math.min(this.maxLife, this.life + amount);
  }
  syncMaxLife(value: number, grantIncrease = true) {
    if (grantIncrease && value > this.maxLife) this.life += value - this.maxLife;
    this.maxLife = value;
    this.life = Math.min(this.life, this.maxLife);
  }
  damage(origin: number, world: World) {
    if (this.invuln > 0) return 'immune';
    this.life--;
    this.invuln = 1.1;
    this.vy = -185;
    this.vx = Math.sign(this.x - origin) * 145;
    if (this.life > 0) return 'hurt';
    this.life = this.maxLife;
    this.x = world.spawnX * TILE;
    this.y = (world.heightAt(world.spawnX) - 4) * TILE;
    this.vx = 0;
    this.vy = 0;
    this.grace = 0;
    this.jumpBuffer = 0;
    return 'respawn';
  }
  save(): PlayerSave {
    return { x: this.x, y: this.y, life: this.life, depthMax: this.depthMax, placed: this.placed };
  }
  override view() {
    return {
      ...super.view(),
      ...this.save(),
      face: this.face,
      invuln: this.invuln,
      maxLife: this.maxLife,
      animation: this.animation,
    };
  }
}
