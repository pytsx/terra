import { clamp, lerp, mixHash } from '../../shared/math';

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export class PerlinNoise {
  constructor(private readonly seed: number) {}

  sample(x: number, y: number) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const dot = (ix: number, iy: number) => {
      const angle = (mixHash(ix, iy, this.seed) / 4294967296) * Math.PI * 2;
      return Math.cos(angle) * (x - ix) + Math.sin(angle) * (y - iy);
    };
    return lerp(
      lerp(dot(x0, y0), dot(x0 + 1, y0), fade(fx)),
      lerp(dot(x0, y0 + 1), dot(x0 + 1, y0 + 1), fade(fx)),
      fade(fy),
    );
  }
}

export class FractalNoise {
  private readonly perlin: PerlinNoise;
  constructor(seed: number, private readonly octaves = 5, private readonly persistence = 0.5) {
    this.perlin = new PerlinNoise(seed);
  }
  sample(x: number, y = 0) {
    let sum = 0, amplitude = 1, frequency = 1, total = 0;
    for (let octave = 0; octave < this.octaves; octave++) {
      sum += this.perlin.sample(x * frequency, y * frequency) * amplitude;
      total += amplitude;
      amplitude *= this.persistence;
      frequency *= 2;
    }
    return clamp(sum / total * 1.65, -1, 1);
  }
}

export class Spline {
  constructor(private readonly points: readonly [number, number][]) {
    if (points.length < 2) throw new Error('Uma spline precisa de pelo menos dois pontos.');
  }
  sample(value: number) {
    const points = this.points;
    if (value <= points[0][0]) return points[0][1];
    if (value >= points.at(-1)![0]) return points.at(-1)![1];
    let index = 0;
    while (value > points[index + 1][0]) index++;
    const [, y0] = points[Math.max(0, index - 1)];
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    const [, y3] = points[Math.min(points.length - 1, index + 2)];
    const t = (value - x1) / (x2 - x1), t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * y1) + (-y0 + y2) * t +
      (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3);
  }
}
