import { hashText, mixHash } from '../../shared/math';
import type { World } from '../world/World';
import { featureGenerator } from '../worldgen/FeatureGenerator';
import { blockPartitionAt } from './BlockPartitionScheduler';
import type { SimulationRegion } from './SimulationRegion';
import { TransformationEvaluator } from './TransformationEvaluator';
import { transformationRegistry, type TransformationRegistry } from './TransformationRegistry';
import { TransformationState, type TransformationStateRecord } from './TransformationState';

export const MAX_EVOLUTION_CELLS_PER_PARTITION = 1024;

export class WorldEvolutionSystem {
  private readonly evaluator = new TransformationEvaluator();
  private readonly state = new TransformationState();

  constructor(private readonly registry: TransformationRegistry = transformationRegistry) {}

  step(dt: number, world: World, region: SimulationRegion, partition: number) {
    if (!(dt > 0)) return;
    let candidates = 0;
    const top = Math.max(0, region.top), bottom = Math.min(world.height - 1, region.bottom);
    outer: for (let y = top; y <= bottom; y++) for (let x = region.left; x <= region.right; x++) {
      if (blockPartitionAt(x, y) !== partition) continue;
      const block = world.peek(x, y);
      if (block === undefined) continue;
      const rules = this.registry.forBlock(block);
      if (!rules.length) continue;
      if (++candidates > MAX_EVOLUTION_CELLS_PER_PARTITION) break outer;
      if (!world.canTransformNaturally(x, y)) {
        this.state.invalidateCell(x, y);
        continue;
      }
      for (const rule of rules) {
        const previous = this.state.get(x, y, rule.id);
        const evaluation = this.evaluator.evaluate(rule, {
          water: world.waterStateAt(x, y, block),
          environment: { exposedToSky: world.exposedToSky(x, y) },
        }, previous, dt);
        if (!evaluation.conditionsSatisfied) {
          this.state.resetCondition(x, y, rule.id, previous.attempts);
          continue;
        }
        const next = { elapsed: evaluation.elapsed, attempted: previous.attempted, attempts: previous.attempts };
        if (evaluation.canAttempt) {
          const roll = mixHash(x, y, world.h ^ hashText(rule.id) ^ previous.attempts) / 4294967296;
          next.attempted = true;
          next.attempts++;
          const actionApplied = roll < rule.probability && (rule.action.type === 'transformBlock'
            ? world.transformNaturally(x, y, rule.source, rule.action.to,
              rule.action.preserve.includes('waterVolume'))
            : world.placeNaturalFeature(x, y, rule.source,
              featureGenerator.plan(rule.action.feature, x, y, world.h, previous.attempts),
              rule.action.replaceSource));
          if (actionApplied) {
            this.state.invalidateCell(x, y);
            break;
          }
        }
        this.state.set(x, y, rule.id, next);
      }
    }
  }

  invalidate(x: number, y: number) { this.state.invalidateCell(x, y); }
  save() { return this.state.save(); }
  restore(records: readonly TransformationStateRecord[]) {
    this.state.restore(records, id => this.registry.has(id));
  }
  get trackedCells() { return this.state.size; }
}
