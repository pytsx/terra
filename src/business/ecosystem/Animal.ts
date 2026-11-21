import { B, TILE } from '../catalog';
import { Mob } from '../entities/Mob';
import type { EngineEntity } from '../entities/EntityRegistry';
import type { World } from '../world/World';

export interface Diet {
  food: string;
  prey?: readonly string[];
  poreWater?: boolean;
}

export abstract class Animal extends Mob {
  private hydration = 1;
  private nutrition = 1;
  private deprivation = 0;
  private decisionIn = 0;
  private seeking?: 'water' | 'food';
  private direction = 0;

  protected get starved() { return this.deprivation >= 25; }
  protected eat() { this.nutrition = Math.min(1, this.nutrition + 0.5); }

  protected survive(dt: number, world: World, population: readonly EngineEntity[], diet: Diet, speed: number) {
    this.hydration = Math.max(0, this.hydration - dt / 165);
    this.nutrition = Math.max(0, this.nutrition - dt / 245);
    if (!this.hydration || !this.nutrition) this.deprivation += dt;
    else this.deprivation = Math.max(0, this.deprivation - dt);
    if (this.starved) return true;
    this.decisionIn -= dt;
    if (this.decisionIn <= 0) {
      this.decisionIn = 1;
      this.seeking = undefined;
      if (this.hydration < 0.62) this.seekWater(world, diet);
      if (!this.seeking && this.nutrition < 0.65) this.forage(world, population, diet);
    }
    if (!this.seeking) return false;
    this.vx = this.direction * speed;
    this.moveMob(dt, world);
    return true;
  }

  private seekWater(world: World, diet: Diet) {
    const x = Math.floor((this.x + this.w / 2) / TILE), floor = Math.floor((this.y + this.h + 0.1) / TILE);
    for (let distance = 0; distance <= 8; distance++) {
      for (const dx of distance ? [-distance, distance] : [0]) {
        for (const y of [floor - 1, floor, floor - 2]) {
          const block = world.get(x + dx, y);
          const accessible = block === B.WATER || block === B.AIR || block === B.TORCH ||
            (diet.poreWater && (block === B.DIRT || block === B.GRASS || block === B.SAND));
          if (!accessible || world.waterAt(x + dx, y, block) < 0.025) continue;
          this.seeking = 'water';
          this.direction = Math.sign(dx);
          if (!distance) {
            const drank = world.hydrology.drink(x, y, block, 55);
            this.hydration = Math.min(1, this.hydration + drank / 140);
          }
          return;
        }
      }
    }
  }

  private forage(world: World, population: readonly EngineEntity[], diet: Diet) {
    const x = Math.floor((this.x + this.w / 2) / TILE), floor = Math.floor((this.y + this.h + 0.1) / TILE);
    if (diet.prey) {
      let closest: EngineEntity | undefined, range = 8 * TILE;
      for (const animal of population) {
        if (animal.dead) continue;
        const prey = animal.view(), distance = Math.hypot(prey.x - this.x, prey.y - this.y);
        if (distance < range && diet.prey.includes(String(prey.kind))) { closest = animal; range = distance; }
      }
      if (closest) {
        const prey = closest.view();
        this.seeking = 'food';
        this.direction = Math.sign(prey.x - this.x);
        if (this.x <= prey.x + prey.w && this.x + this.w >= prey.x &&
          this.y < prey.y + prey.h && this.y + this.h > prey.y) {
          closest.hit(this.direction || this.face, 2);
          if (closest.dead) this.eat();
        }
        return;
      }
    }
    if (diet.food === 'prey') return;
    for (let distance = 0; distance <= 6; distance++) {
      for (const dx of distance ? [-distance, distance] : [0]) {
        const tx = x + dx, y = floor - Number(diet.food === 'wood');
        const block = world.get(tx, y);
        const grass = diet.food === 'grass' && block === B.GRASS;
        const stump = diet.food === 'wood' && block === B.WOOD && !world.solid(tx, y) && world.get(tx, y - 1) === B.AIR;
        const litter = diet.food === 'detritus' && (block === B.DIRT || block === B.SAND || block === B.GRASS) &&
          world.waterAt(tx, y, block) >= 0.08;
        if (!(grass || stump || litter)) continue;
        if (!distance) {
          if (!litter && !world.changeHabitat(tx, y, block, grass ? B.DIRT : B.AIR)) continue;
          this.eat();
        }
        this.seeking = 'food';
        this.direction = Math.sign(dx);
        return;
      }
    }
  }

  override view() {
    return { ...super.view(), hydration: this.hydration, nutrition: this.nutrition, seeking: this.seeking };
  }
  protected saveAnimal() {
    return { hydration: this.hydration, nutrition: this.nutrition, deprivation: this.deprivation };
  }
  protected restoreAnimal(state: { hydration: number; nutrition: number; deprivation: number }) {
    if (![state.hydration, state.nutrition, state.deprivation].every(Number.isFinite)) return;
    this.hydration = Math.max(0, Math.min(1, state.hydration));
    this.nutrition = Math.max(0, Math.min(1, state.nutrition));
    this.deprivation = Math.max(0, state.deprivation);
  }
}
