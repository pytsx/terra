import { CHUNK_WIDTH as W, CHUNK_HEIGHT as H } from '../catalog';
import type { ExploredSection } from '../save';

const UNKNOWN = 65535;
type Bounds = { left: number; right: number; top: number; bottom: number };

export class ExplorationMap {
  private readonly sections = new Map<string, Uint16Array>();
  private bounds?: Bounds;
  private lastX = NaN;
  private lastY = NaN;

  extent(): Bounds | undefined {
    return this.bounds && { ...this.bounds };
  }

  private include(left: number, right: number, y: number) {
    if (!this.bounds) this.bounds = { left, right, top: y, bottom: y };
    else {
      this.bounds.left = Math.min(this.bounds.left, left);
      this.bounds.right = Math.max(this.bounds.right, right);
      this.bounds.top = Math.min(this.bounds.top, y);
      this.bounds.bottom = Math.max(this.bounds.bottom, y);
    }
  }

  reveal(x: number, y: number, radius: number, height: number, tiles: (cx: number, cy: number) => Uint16Array) {
    if (Math.hypot(x - this.lastX, y - this.lastY) < 4) return;
    this.lastX = x;
    this.lastY = y;
    for (let row = Math.max(0, Math.ceil(y - radius)); row <= Math.min(height - 1, y + radius); row++) {
      const span = Math.sqrt(radius * radius - (row - y) ** 2);
      const left = Math.ceil(x - span), right = Math.floor(x + span);
      if (left > right) continue;
      this.include(left, right, row);
      for (let start = left; start <= right;) {
        const cx = Math.floor(start / W), cy = Math.floor(row / H);
        const end = Math.min(right + 1, (cx + 1) * W);
        const localX = start - cx * W, key = `${cx},${cy}`;
        let section = this.sections.get(key);
        if (!section) {
          section = new Uint16Array(W * H).fill(UNKNOWN);
          this.sections.set(key, section);
        }
        const offset = (row % H) * W + localX;
        section.set(tiles(cx, cy).subarray(offset, offset + end - start), offset);
        start = end;
      }
    }
  }

  peek(x: number, y: number) {
    const cx = Math.floor(x / W), section = this.sections.get(`${cx},${Math.floor(y / H)}`);
    const value = section?.[(y % H) * W + x - cx * W];
    return value === UNKNOWN ? undefined : value;
  }

  update(x: number, y: number, id: number) {
    const cx = Math.floor(x / W), section = this.sections.get(`${cx},${Math.floor(y / H)}`);
    const index = (y % H) * W + x - cx * W;
    if (section && section[index] !== UNKNOWN) section[index] = id;
  }

  save(): ExploredSection[] {
    return Array.from(this.sections, ([key, section]) => {
      const [cx, cy] = key.split(',').map(Number);
      const runs: number[] = [];
      for (let i = 0; i < section.length;) {
        let end = i + 1;
        while (end < section.length && section[end] === section[i]) end++;
        runs.push(section[i], end - i);
        i = end;
      }
      return [cx, cy, runs];
    });
  }

  restore(entries: readonly ExploredSection[]) {
    for (const [cx, cy, runs] of entries) {
      const section = new Uint16Array(W * H);
      let offset = 0;
      for (let i = 0; i < runs.length; i += 2) {
        const count = runs[i + 1];
        section.fill(runs[i], offset, offset + count);
        offset += count;
      }
      if (offset !== section.length) continue;
      for (let row = 0; row < H; row++) {
        const start = row * W;
        let left = 0, right = W - 1;
        while (left <= right && section[start + left] === UNKNOWN) left++;
        while (right >= left && section[start + right] === UNKNOWN) right--;
        if (left <= right) this.include(cx * W + left, cx * W + right, cy * H + row);
      }
      this.sections.set(`${cx},${cy}`, section);
    }
  }
}
