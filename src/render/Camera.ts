import { TILE, type Point } from '../business';
import { clamp, lerp } from '../shared/math';

type WorldSize = { width: number; height: number; infinite: boolean };

export class Camera {
  x = 0;
  y = 0;
  constructor(public width: number, public height: number) {}

  follow(focus: Point, world: WorldSize, zoom: number, dt: number) {
    const center = (position: number, size: number, viewport: number) => {
      const half = viewport / (2 * zoom);
      return size <= 2 * half ? size / 2 : clamp(position, half, size - half);
    };
    const x = world.infinite ? focus.x : center(focus.x, world.width * TILE, this.width);
    const y = center(focus.y, world.height * TILE, this.height);
    const fraction = 1 - Math.exp(-6 * dt);
    this.x = lerp(this.x, x - this.width / 2, fraction);
    this.y = lerp(this.y, y - this.height / 2, fraction);
  }

  toWorld(pointer: Point, zoom: number): Point {
    return {
      x: this.x + this.width / 2 + (pointer.x - 0.5) * this.width / zoom,
      y: this.y + this.height / 2 + (pointer.y - 0.5) * this.height / zoom,
    };
  }

  bounds(zoom: number) {
    const { x: left, y: top } = this.toWorld({ x: 0, y: 0 }, zoom);
    return { left, top, width: this.width / zoom, height: this.height / zoom };
  }
}
