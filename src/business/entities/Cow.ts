import type { ActorView } from './Actor';
import { BreedingCycle } from './BreedingCycle';
import { Health } from './Health';
import { Animal } from '../ecosystem/Animal';
import type { EngineEntity } from './EntityRegistry';
import type { World } from '../world/World';
import type { RNG } from '../../shared/math';
import { modularEntities } from '../../assets';
import type { EntitySave } from '../save';

const asset = modularEntities.cow;

export class Cow extends Animal {
  private readonly health = new Health(asset.config.health);
  private flash = 0;
  private wanderTime = 1;
  private activity: 'world' | 'active' | 'dormant' = 'world';
  private readonly breeding: BreedingCycle;
  constructor(x: number, y: number, seed: number, baby = false) {
    super(x, y, asset.config.width, asset.config.height);
    this.wanderTime = 0.5 + (seed % 100) / 100;
    this.breeding = new BreedingCycle(asset.config.breeding, baby);
  }
  get dead() {
    return this.health.depleted || this.starved;
  }
  hit(face: number, damage = 1) {
    if (this.dead) return;
    this.health.damage(damage);
    this.flash = 0.15;
    this.face = face;
    this.vx = face * 130;
    this.vy = -95;
  }
  feed() {
    if (this.dead || !this.breeding.feed()) return false;
    this.eat();
    return true;
  }
  get inLove() {
    return !this.dead && this.breeding.inLove;
  }
  mate(other: EngineEntity) {
    if (!(other instanceof Cow) || this.dead || other.dead || !this.breeding.mate(other.breeding)) return null;
    this.activity = other.activity = 'active';
    return new Cow(
      (this.x + other.x) / 2,
      (this.y + other.y) / 2,
      Math.floor(Math.random() * 10000),
      true,
    );
  }
  step(dt: number, world: World, player: ActorView, rng: RNG, population: readonly EngineEntity[] = []) {
    if (this.dead) return false;
    this.breeding.step(dt);
    this.flash = Math.max(0, this.flash - dt);
    const sensor = this.sense(dt, world, player, rng, asset.config.activeRadius);
    if (!sensor) {
      this.activity = 'dormant';
      return false;
    }
    this.activity = 'active';
    if (this.survive(dt, world, population, asset.config.diet, 31)) return false;
    this.wanderTime -= dt;
    const decision = asset.script.brain.decide(sensor);
    if ((this.ground || this.swimming) && this.wanderTime <= 0) {
      this.vx = decision.velocityX ?? 0;
      if (this.ground && rng.next() > 0.75) this.vy = -145;
      this.wanderTime = 1.2 + rng.next() * 2.4;
    }
    this.moveMob(dt, world);
    return false;
  }
  override view() {
    return {
      ...super.view(),
      kind: asset.config.id,
      flash: this.flash,
      state: this.dead ? 'dead' : this.activity === 'dormant' ? 'dormant' :
        this.breeding.baby ? 'baby' : this.inLove ? 'love' : this.activity,
      baby: this.breeding.baby,
      love: this.inLove,
    };
  }
  saveState(): Omit<EntitySave, 'id'> {
    return { kind: asset.config.id, actor: this.saveActor(), health: this.health.remaining,
      animal: this.saveAnimal(), breeding: this.breeding.save(),
      data: { wanderTime: this.wanderTime, activity: this.activity } };
  }
  restoreState(save: EntitySave) {
    this.restoreActor(save.actor);
    this.health.restore(save.health);
    if (save.animal) this.restoreAnimal(save.animal);
    if (save.breeding) this.breeding.restore(save.breeding);
    const wanderTime = save.data?.wanderTime;
    if (typeof wanderTime === 'number' && Number.isFinite(wanderTime)) this.wanderTime = wanderTime;
    const activity = save.data?.activity;
    if (activity === 'world' || activity === 'active' || activity === 'dormant') this.activity = activity;
  }
}
