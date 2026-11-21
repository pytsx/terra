import type { GenerationContext, WorldGenerator } from './types';

export class SpawnGenerator implements WorldGenerator {
  readonly name = 'safe-spawn';
  generate(context: GenerationContext) {
    const x = context.spawnX;
    if (x < 6 || x >= context.width - 6) return;
    for (let dx = -4; dx <= 4; dx++) {
      const surface = context.surface[x + dx];
      for (let y = surface - 7; y < surface; y++) context.set(x + dx, y, context.keys.AIR);
    }
    context.set(x - 5, context.surface[x - 5] - 1, context.keys.TORCH);
    context.set(x + 5, context.surface[x + 5] - 1, context.keys.TORCH);
  }
}
