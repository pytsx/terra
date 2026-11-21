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
  private readonly candidates = new Set<string>();
  private readonly scannedBounds = new Map<number, { left: number; right: number; top: number; bottom: number }>();

  constructor(private readonly registry: TransformationRegistry = transformationRegistry) {}

  step(dt: number, world: World, region: SimulationRegion, partition: number) {
    if (!(dt > 0)) return;
    const previousBounds = this.scannedBounds.get(partition);
    for (let y = Math.max(0, region.top); y <= Math.min(world.height - 1, region.bottom); y++)
      for (let x = region.left; x <= region.right; x++)
        if ((!previousBounds || x < previousBounds.left || x > previousBounds.right ||
          y < previousBounds.top || y > previousBounds.bottom) &&
          blockPartitionAt(x, y) === partition && world.peek(x, y) !== undefined)
          this.candidates.add(this.key(x, y));
    this.scannedBounds.set(partition, {
      left: Math.min(previousBounds?.left ?? region.left, region.left),
      right: Math.max(previousBounds?.right ?? region.right, region.right),
      top: Math.min(previousBounds?.top ?? region.top, region.top),
      bottom: Math.max(previousBounds?.bottom ?? region.bottom, region.bottom),
    });
    let processed = 0;
    const top = Math.max(0, region.top), bottom = Math.min(world.height - 1, region.bottom);
    for (const key of this.candidates) {
      const [x, y] = this.coords(key);
      if (y < top || y > bottom || x < region.left || x > region.right ||
        blockPartitionAt(x, y) !== partition) continue;
      if (blockPartitionAt(x, y) !== partition) continue;
      const block = world.peek(x, y);
      if (block === undefined) {
        this.candidates.delete(key);
        continue;
      }
      const rules = this.registry.forBlock(block);
      if (!rules.length) {
        this.candidates.delete(key);
        continue;
      }
      if (++processed > MAX_EVOLUTION_CELLS_PER_PARTITION) break;
      for (const rule of rules) {
        if (!world.canTransformNaturally(x, y, rule.eligibility)) {
          this.state.invalidateCell(x, y);
          continue;
        }
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
          const plan = rule.action.type === 'placeFeature'
            ? featureGenerator.plan(rule.action.feature, x, y, world.h, previous.attempts)
            : undefined;
          if (rule.action.type === 'placeFeature' &&
            !world.canPlaceNaturalFeature(x, y, rule.source, plan, rule.action.replaceSource, rule.eligibility))
            continue;
          const roll = mixHash(x, y, world.h ^ hashText(rule.id) ^ previous.attempts) / 4294967296;
          const actionApplied = roll < rule.probability && (rule.action.type === 'transformBlock'
            ? world.transformNaturally(x, y, rule.source, rule.action.to,
              rule.action.preserve.includes('waterVolume'), rule.eligibility)
            : rule.action.type === 'placeFeature'
              ? world.placeNaturalFeature(x, y, rule.source, plan, rule.action.replaceSource, rule.eligibility)
              : world.produceItem(rule.action.item, rule.action.amount, x, y));
          next.attempted = true;
          next.attempts++;
          if (actionApplied) {
            this.state.invalidateCell(x, y);
            break;
          }
        }
        this.state.set(x, y, rule.id, next);
      }
    }
  }

  invalidate(x: number, y: number) {
    this.state.invalidateCell(x, y);
    this.candidates.add(this.key(x, y));
  }
  save() { return this.state.save(); }
  restore(records: readonly TransformationStateRecord[]) {
    this.state.restore(records, id => this.registry.has(id));
  }
  get trackedCells() { return this.state.size; }
  private key(x: number, y: number) { return `${x},${y}`; }
  private coords(key: string): [number, number] {
    const comma = key.indexOf(',');
    return [Number(key.slice(0, comma)), Number(key.slice(comma + 1))];
  }
}
