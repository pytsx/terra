import type { RNG } from '../shared/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export class ImpactParticles {
  private readonly live: Particle[] = [];
  private readonly free: Particle[] = [];

  constructor(private readonly rng: RNG) {}

  get visible(): readonly Readonly<Particle>[] { return this.live; }

  burst(count: number, x: number, y: number, color: string, life = 0.55) {
    for (let i = 0; i < count; i++) {
      const vx = (this.rng.next() - 0.5) * 130;
      const vy = -this.rng.next() * 120;
      const size = this.rng.int(2, 5);
      const p = this.free.pop();
      if (p) {
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.life = p.max = life;
        p.color = color;
        p.size = size;
        this.live.push(p);
      } else {
        this.live.push({ x, y, color, life, max: life, vx, vy, size });
      }
    }
  }

  step(dt: number) {
    let count = 0;
    for (const p of this.live) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
      if (p.life > 0) this.live[count++] = p;
      else this.free.push(p);
    }
    this.live.length = count;
  }

  clear() {
    for (const p of this.live) this.free.push(p);
    this.live.length = 0;
  }
}
