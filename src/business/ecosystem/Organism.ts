import { B, TILE } from '../catalog';
import { Animal } from './Animal';
import { Health } from '../entities/Health';
import type { ActorView } from '../entities/Actor';
import type { RNG } from '../../shared/math';
import type { EngineEntity } from '../entities/EntityRegistry';
import type { World } from '../world/World';
import type { Activity, Species } from './Habitat';
import { rainIntensity } from '../weather';

export class Organism extends Animal implements EngineEntity {
  private readonly health: Health;
  private cooldown: number;
  private activity: Activity = 'rest';
  private phase = 0;
  private homeX: number;
  private homeFloor?: number;

  constructor(private readonly species: Species, x: number, y: number, seed: number) {
    super(x, y, species.config.width, species.config.height);
    this.health = new Health(species.config.health);
    this.homeX = Math.floor((x + this.w / 2) / TILE);
    this.face = seed % 2 ? 1 : -1;
    this.cooldown = (seed % 11) / 11;
  }

  get dead() { return this.health.depleted || this.starved; }

  hit(face: number, damage = 1) {
    this.health.damage(damage);
    this.face = face;
  }

  step(dt: number, world: World, _player: ActorView, _rng: RNG, population: readonly EngineEntity[] = [], elapsed = this.phase) {
    if (this.dead) return false;
    this.phase += dt;
    if (this.survive(dt, world, population, this.species.config.diet, this.species.config.speed)) return false;
    this.cooldown -= dt;
    if (this.cooldown <= 0 && (this.ground || this.swimming || this.activity === 'climb' || this.activity === 'descend')) {
      const x = Math.floor((this.x + this.w / 2) / TILE);
      const y = Math.floor((this.y + this.h + 0.1) / TILE);
      this.homeFloor ??= y;
      const depth = y - world.heightAt(x);
      const dayPhase = (elapsed / 240 + 0.18) % 1;
      this.activity = this.species.script.act({
        depth, face: this.face, clock: elapsed,
        night: dayPhase > 0.52 && dayPhase < 0.94, rainy: rainIntensity(elapsed, world.h, depth) > 0.25,
        homeDistance: Math.abs(this.homeX - x), depthBelowHome: y - this.homeFloor,
        rememberHome: () => { this.homeX = x; this.homeFloor = y; },
        flee: (kind, radius) => {
          const threat = this.nearest(population, kind, radius);
          if (!threat) return false;
          this.face = Math.sign(this.x - threat.view().x) || this.face;
          return true;
        },
        is: (dx, dy, material) => world.get(x + dx, y + dy) === B[material],
        change: (dx, dy, from, to) => {
          const changed = world.changeHabitat(x + dx, y + dy, B[from], B[to]);
          const food = this.species.config.diet.food;
          if (changed && ((food === 'grass' && from === 'GRASS') || (food === 'wood' && from === 'WOOD'))) this.eat();
          return changed;
        },
        hunt: (species, radius, damage) => this.hunt(population, species, radius, damage),
      });
      this.cooldown = this.species.config.interval;
      if (this.activity === 'digest') this.cooldown = 12;
      if (['flee', 'chase', 'climb', 'descend', 'return'].includes(this.activity)) this.cooldown = 0.45;
      if (this.activity === 'return') this.face = Math.sign(this.homeX - x) || this.face;
      if (this.activity === 'flee' || this.activity === 'emerge') this.vy = -245;
      if (this.activity === 'turn') {
        this.face *= -1;
        this.activity = 'rest';
      }
    }
    if (this.activity === 'climb' || this.activity === 'descend') {
      const x = Math.floor((this.x + this.w / 2) / TILE), y = Math.floor((this.y + this.h / 2) / TILE);
      if (world.get(x, y) === B.WOOD && !world.solid(x, y)) {
        this.vx = 0;
        this.vy = this.activity === 'climb' ? -21 : 21;
        this.move(dt, world);
        return false;
      }
      this.activity = 'rest';
    }
    const stationary = this.activity === 'rest' || this.activity === 'digest';
    this.vx = stationary ? 0 : this.face * this.species.config.speed * (this.activity === 'flee' ? 1.65 : 1);
    this.moveMob(dt, world, this.activity !== 'tunnel');
    if (this.vx === 0 && this.activity === 'walk' && this.ground) this.face *= -1;
    return false;
  }

  private nearest(population: readonly EngineEntity[], species: string, radius: number) {
    let nearest: EngineEntity | undefined;
    let distance = TILE * radius;
    for (const entity of population) {
      if (entity.dead) continue;
      const prey = entity.view();
      if (prey.kind !== species) continue;
      const d = Math.hypot(prey.x - this.x, prey.y - this.y);
      if (d < distance) { nearest = entity; distance = d; }
    }
    return nearest;
  }

  private hunt(population: readonly EngineEntity[], species: string, radius: number, damage: number): 'chase' | 'digest' | undefined {
    const nearest = this.nearest(population, species, radius);
    if (!nearest) return;
    const prey = nearest.view();
    this.face = Math.sign(prey.x - this.x) || this.face;
    if (prey.x > this.x + this.w || prey.x + prey.w < this.x ||
      prey.y >= this.y + this.h || prey.y + prey.h <= this.y) return 'chase';
    nearest.hit(this.face, damage);
    if (nearest.dead) this.eat();
    return nearest.dead ? 'digest' : 'chase';
  }

  view() {
    return { ...super.view(), kind: this.species.config.id, phase: this.phase, health: this.health.remaining, activity: this.activity };
  }
}
