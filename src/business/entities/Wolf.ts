import type { ActorView } from './Actor';
import { Health } from './Health';
import { Animal } from '../ecosystem/Animal';
import type { EngineEntity } from './EntityRegistry';
import type { World } from '../world/World';
import type { RNG } from '../../shared/math';
import { modularEntities } from '../../assets';

const asset = modularEntities.wolf;

export class Wolf extends Animal {
  private readonly health = new Health(asset.config.health);
  private flash = 0;
  private state: 'world' | 'active' | 'dormant' | 'dead' = 'world';
  constructor(x: number, y: number) {
    super(x, y, asset.config.width, asset.config.height);
  }
  get dead() {
    if (this.health.depleted || this.starved) this.state = 'dead';
    return this.state === 'dead';
  }
  hit(face: number, damage = 1) {
    if (this.dead) return;
    this.health.damage(damage);
    this.flash = 0.15;
    this.face = face;
    this.vx = face * 170;
    this.vy = -120;
  }
  step(dt: number, world: World, player: ActorView, rng: RNG, population: readonly EngineEntity[] = []) {
    this.flash = Math.max(0, this.flash - dt);
    const sensor = this.sense(dt, world, player, rng, asset.config.activeRadius);
    if (!sensor) {
      this.state = 'dormant';
      return false;
    }
    this.state = 'active';
    if (this.survive(dt, world, population, asset.config.diet, 66)) return false;
    const decision = asset.script.brain.decide(sensor);
    this.vx = decision.velocityX ?? this.vx;
    if (this.ground && decision.velocityY !== undefined) this.vy = decision.velocityY;
    this.moveMob(dt, world);
    return (
      this.x < player.x + player.w &&
      this.x + this.w > player.x &&
      this.y < player.y + player.h &&
      this.y + this.h > player.y
    );
  }
  override view() {
    return { ...super.view(), kind: asset.config.id, flash: this.flash, state: this.state };
  }
}
