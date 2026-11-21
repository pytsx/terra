import type { TransformationCondition } from '../../assets';
import type { TransformationRule } from './TransformationRegistry';

export interface TransformationEnvironment {
  readonly water: { readonly volume: number; readonly capacity: number; readonly saturation: number };
  readonly environment: { readonly exposedToSky: boolean };
}

export interface TransformationProgress {
  readonly elapsed: number;
  readonly attempted: boolean;
}

export interface TransformationEvaluation {
  readonly conditionsSatisfied: boolean;
  readonly elapsed: number;
  readonly durationReached: boolean;
  readonly canAttempt: boolean;
}

const compare = (left: number | boolean, operator: string, right: number | boolean) => {
  switch (operator) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '>': return left > right;
    case '>=': return left >= right;
    case '<': return left < right;
    case '<=': return left <= right;
    default: return false;
  }
};

export class TransformationEvaluator {
  condition(condition: TransformationCondition, context: TransformationEnvironment): boolean {
    if ('all' in condition) return condition.all.every(child => this.condition(child, context));
    if ('any' in condition) return condition.any.some(child => this.condition(child, context));
    if ('not' in condition) return !this.condition(condition.not, context);
    const value = condition.property === 'water.volume' ? context.water.volume :
      condition.property === 'water.capacity' ? context.water.capacity :
      condition.property === 'water.saturation' ? context.water.saturation :
      context.environment.exposedToSky;
    return compare(value, condition.operator, condition.value);
  }

  evaluate(rule: TransformationRule, context: TransformationEnvironment,
    progress: TransformationProgress, dt: number): TransformationEvaluation {
    const conditionsSatisfied = this.condition(rule.conditions, context);
    const elapsed = conditionsSatisfied ? Math.min(rule.duration.seconds, progress.elapsed + Math.max(0, dt)) : 0;
    const durationReached = conditionsSatisfied && elapsed >= rule.duration.seconds;
    const canAttempt = rule.retry === 'every-interval' ? durationReached : durationReached && !progress.attempted;
    return { conditionsSatisfied, elapsed, durationReached, canAttempt };
  }
}
