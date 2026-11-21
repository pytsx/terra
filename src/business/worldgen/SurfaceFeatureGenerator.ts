import type { ResolvedTreeFeature } from './features/types';
import { LandscapeTreeStrategy } from './strategies/LandscapeTreeStrategy';
import { LegacyTreeStrategy } from './strategies/LegacyTreeStrategy';
import type { GenerationContext, WorldGenerator } from './types';

export class SurfaceFeatureGenerator implements WorldGenerator {
  readonly name = 'climate-surface-features';
  constructor(
    private readonly trees: readonly ResolvedTreeFeature[],
    private readonly landscapeStrategy = new LandscapeTreeStrategy(),
    private readonly legacyStrategy = new LegacyTreeStrategy(),
  ) {}
  generate(context: GenerationContext) {
    if (context.landscape) this.landscapeStrategy.generate(context, this.trees);
    else this.legacyStrategy.generate(context);
  }
}
