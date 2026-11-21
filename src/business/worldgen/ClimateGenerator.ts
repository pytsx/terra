import { clamp } from '../../shared/math';
import { FractalNoise, Spline } from './noise';
import type { GenerationContext, WorldGenerator } from './types';

const continentalSpline = new Spline([[-1, 25], [-0.55, 12], [-0.2, 2], [0.25, -5], [0.65, -12], [1, -18]]);
const erosionSpline = new Spline([[-1, -13], [-0.35, -5], [0.15, 5], [0.6, 11], [1, 15]]);
const ridgeSpline = new Spline([[0, 0], [0.25, -3], [0.48, 4], [0.7, -8], [1, -22]]);

export class ClimateGenerator implements WorldGenerator {
  readonly name = 'multi-noise-climate-splines';
  generate(context: Pick<GenerationContext, 'width' | 'seed' | 'globalX' | 'surface' | 'climate'>) {
    const continental = new FractalNoise(context.seed ^ 0x1011, 5, 0.54);
    const erosion = new FractalNoise(context.seed ^ 0x2022, 4, 0.56);
    const weirdness = new FractalNoise(context.seed ^ 0x3033, 5, 0.5);
    const temperature = new FractalNoise(context.seed ^ 0x4044, 3, 0.55);
    const humidity = new FractalNoise(context.seed ^ 0x5055, 3, 0.55);
    const detail = new FractalNoise(context.seed ^ 0x6066, 4, 0.48);
    for (let x = 0; x < context.width; x++) {
      const gx = context.globalX(x);
      const c = continental.sample(gx * 0.0014);
      const e = erosion.sample(gx * 0.0032);
      const w = weirdness.sample(gx * 0.0022);
      const pv = 1 - Math.abs(3 * Math.abs(w) - 2);
      context.climate[x] = {
        continentalness: c, erosion: e, weirdness: w, peaksValleys: pv,
        temperature: temperature.sample(gx * 0.0018), humidity: humidity.sample(gx * 0.0018),
      };
      const height = 78 + continentalSpline.sample(c) + erosionSpline.sample(e) +
        ridgeSpline.sample(clamp((pv + 1) / 2, 0, 1)) + detail.sample(gx * 0.018) * 2;
      const mountain = Math.max(0, c + 0.12) * Math.max(0, 0.32 - e) *
        Math.max(0, pv + 0.08) * 76;
      const highland = Math.max(0, c - 0.12) * 24;
      context.surface[x] = clamp(Math.round(height - mountain - highland), 30, 112);
    }
  }
}
