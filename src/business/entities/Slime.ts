import type { ActorView } from './Actor';
import { Health } from './Health';
import { Mob } from './Mob';
import type { World } from '../world/World';
import type { RNG } from '../../shared/math';
import { modularEntities } from '../../assets';
import type { EntitySave } from '../save';
const SLIME_ASSET = modularEntities.slime;
export class Slime extends Mob {
  private readonly health = new Health(SLIME_ASSET.config.health);
  private jumpTime: number;
  private flash = 0;
  private tint: number;
  private state: 'world' | 'active' | 'dormant' | 'dead' = 'world';
  constructor(x: number, y: number, seed: number) {
    super(x, y, SLIME_ASSET.config.width, SLIME_ASSET.config.height);
    this.jumpTime = 0.7 + (seed % 150) / 100;
    this.tint = seed % 3;
  }
  get dead() {
    if (this.health.depleted) this.state = 'dead';
    return this.state === 'dead';
  }
  hit(face: number, damage = 1) {
    if (this.dead) return;
    this.health.damage(damage);
    this.flash = 0.15;
    this.face = face;
    this.vx = face * 180;
    this.vy = -130;
  }
  step(dt: number, world: World, player: ActorView, rng: RNG) {
    this.flash = Math.max(0, this.flash - dt);
    const sensor = this.sense(dt, world, player, rng, SLIME_ASSET.config.activeRadius);
    if (!sensor) {
      this.state = 'dormant';
      return false;
    }
    this.state = 'active';
    this.jumpTime -= dt;
    const decision = SLIME_ASSET.script.brain.decide(sensor);
    if ((this.ground || this.swimming) && this.jumpTime <= 0) {
      if (this.ground) this.vy = decision.velocityY ?? -205;
      this.vx = decision.velocityX ?? 0;
      this.jumpTime = 1 + rng.next() * 1.8;
    }
    this.moveMob(dt, world);
    return (
      this.x < player.x + player.w &&
      this.x + this.w > player.x &&
      this.y < player.y + player.h &&
      this.y + this.h > player.y
    );
  }
  override view() {
    return {
      ...super.view(),
      kind: SLIME_ASSET.config.id,
      flash: this.flash,
      tint: this.tint,
      state: this.state,
    };
  }
  saveState(): Omit<EntitySave, 'id'> {
    return { kind: SLIME_ASSET.config.id, actor: this.saveActor(), health: this.health.remaining,
      data: { jumpTime: this.jumpTime, tint: this.tint, state: this.state } };
  }
  restoreState(save: EntitySave) {
    this.restoreActor(save.actor);
    this.health.restore(save.health);
    const jumpTime = save.data?.jumpTime;
    if (typeof jumpTime === 'number' && Number.isFinite(jumpTime)) this.jumpTime = jumpTime;
    const tint = save.data?.tint;
    if (typeof tint === 'number' && Number.isSafeInteger(tint) && tint >= 0 && tint <= 2) this.tint = tint;
    const state = save.data?.state;
    if (state === 'world' || state === 'active' || state === 'dormant' || state === 'dead') this.state = state;
  }
}
