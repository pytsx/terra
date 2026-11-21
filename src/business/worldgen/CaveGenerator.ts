import { B } from '../catalog';
import { FractalNoise } from './noise';
import type { GenerationContext, WorldGenerator } from './types';

export class CaveGenerator implements WorldGenerator {
  readonly name = 'cheese-spaghetti-noodle-caves';
  generate(context: GenerationContext) {
    const cheese = new FractalNoise(context.seed ^ 0xca11, 4, 0.55);
    const spaghettiA = new FractalNoise(context.seed ^ 0xca22, 3, 0.5);
    const spaghettiB = new FractalNoise(context.seed ^ 0xca33, 3, 0.5);
    const noodle = new FractalNoise(context.seed ^ 0xca44, 2, 0.5);
    for (let x = 0; x < context.width; x++) {
      const gx = context.globalX(x);
      const caveStart = context.surface[x] + 26;
      for (let y = Math.max(caveStart, context.startY); y < Math.min(context.endY, context.height - 5); y++) {
        if (context.get(x, y) === B.BEDROCK) continue;
        const depthBias = Math.min(0.055, (y - caveStart) / 1800);
        const cheeseCave = y > caveStart + 12 && cheese.sample(gx * 0.015, y * 0.016) > 0.69 - depthBias;
        const spaghetti = Math.abs(spaghettiA.sample(gx * 0.031, y * 0.027)) < 0.028 &&
          Math.abs(spaghettiB.sample(gx * 0.024, y * 0.036)) < 0.09;
        const noodleCave = y > caveStart + 32 && Math.abs(noodle.sample(gx * 0.052, y * 0.045)) < 0.012;
        if (cheeseCave || spaghetti || noodleCave) context.set(x, y, B.AIR);
      }
    }
  }
}
