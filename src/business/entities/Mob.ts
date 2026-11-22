import { Actor, type ActorView } from './Actor';
import type { EntitySensor } from '../../assets/entity-types';
import type { RNG } from '../../shared/math';
import { TILE } from '../EngineTypes';
import type { World } from '../world/World';

const gravity = 950;
// A margem de seis pixels compensa a integração em passos de 1/60 s.
const jumpSpeed = Math.sqrt(2 * gravity * (TILE + 6));
export abstract class Mob extends Actor {
  protected sense(dt: number, world: World, player: ActorView, rng: RNG, activeRadius: number): EntitySensor | undefined {
    const dx = this.x + this.w / 2 - (player.x + player.w / 2);
    const dy = this.y + this.h / 2 - (player.y + player.h / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > activeRadius) return;
    return {
      player,
      self: { x: this.x, y: this.y, w: this.w, h: this.h },
      ground: this.ground,
      swimming: this.swimming,
      near: radius => distance <= radius,
      blockAt: (x, y) => world.get(x, y),
      solidAt: (x, y) => world.solid(x, y),
      random: () => rng.next(),
      deltaTime: dt,
    };
  }

  protected moveMob(dt: number, world: World, canJump = true) {
    const speed = this.vx;
    if (canJump && this.ground && speed) {
      const ahead = this.x + Math.sign(speed) * (Math.abs(speed) * 0.13 + 1);
      if (
        world.collides(ahead, this.y, this.w, this.h) &&
        !world.collides(ahead, this.y - TILE, this.w, this.h) &&
        !world.collides(this.x, this.y - TILE, this.w, this.h)
      )
        this.vy = -jumpSpeed;
    }
    if (this.ground && this.vy < 0) this.vy = Math.min(this.vy, -jumpSpeed);
    this.vy = Math.min(520, this.vy + gravity * dt);
    this.move(dt, world);
    // A parede pode bloquear o primeiro passo horizontal antes de os pés passarem do topo.
    if (!this.ground && this.vy < 0 && this.vx === 0) this.vx = speed;
  }
}
