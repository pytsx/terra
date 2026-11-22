import { TILE, type Stack } from '../EngineTypes';
import type { DroppedSave } from '../save';
import type { World } from '../world/World';

export interface DroppedItem extends DroppedSave {
  vx: number;
  vy: number;
  pickupDelay: number;
}

export class DroppedItems {
  private items: DroppedItem[];

  constructor(saved: readonly DroppedSave[] = []) {
    this.items = saved.map((item) => ({
      ...item, vx: item.vx ?? 0, vy: item.vy ?? 0, pickupDelay: item.pickupDelay ?? 0,
    }));
  }

  spawn(stack: DroppedSave, vx = 0, vy = 0, pickupDelay = 0) {
    this.items.push({ ...stack, vx, vy, pickupDelay });
  }

  get visible(): readonly Readonly<DroppedItem>[] {
    return this.items;
  }

  save(): DroppedSave[] {
    return this.items.map((item) => ({ ...item }));
  }

  step(dt: number, world: World, player: { x: number; y: number; w: number; h: number },
    collect: (stack: Readonly<Stack>) => void,
    active: (drop: Readonly<DroppedItem>) => boolean = () => true) {
    this.items = this.items.filter((drop) => {
      // Inactive drops remain serialized but consume no simulation time.
      if (!active(drop)) return true;
      drop.pickupDelay = Math.max(0, drop.pickupDelay - dt);
      drop.vy = Math.min(530, drop.vy + 360 * dt);
      const x = drop.x + drop.vx * dt;
      if (!world.collides(x - 5, drop.y - 5, 10, 10)) drop.x = x;
      else drop.vx *= -0.25;
      const y = drop.y + drop.vy * dt;
      if (!world.collides(drop.x - 5, y - 5, 10, 10)) drop.y = y;
      else {
        if (drop.vy > 0) {
          const floor = Math.floor((y + 5 - 0.1) / TILE) * TILE - 5;
          if (floor >= drop.y) drop.y = floor;
        }
        drop.vy = 0;
        drop.vx *= 0.85;
      }
      const dx = Math.max(player.x - drop.x, 0, drop.x - player.x - player.w);
      const dy = Math.max(player.y - drop.y, 0, drop.y - player.y - player.h);
      if (drop.pickupDelay > 0 || dx * dx + dy * dy > (TILE * 0.8) ** 2) return true;
      collect(drop);
      return false;
    });
  }
}
