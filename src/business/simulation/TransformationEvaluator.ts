import type { TransformationCondition } from '../../assets';
import type { TransformationRule } from './TransformationRegistry';
import type { TransformationProperty, TransformationOperator } from '../../assets/transformations/types';

export interface TransformationEnvironment {
  readonly matureTree?: () => boolean;
  readonly soilMoisture?: number;
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

type Reading = number | boolean;
type Predicate = (context: TransformationEnvironment) => boolean;
const sensors: Record<TransformationProperty, (context: TransformationEnvironment) => Reading> = {
  'feature.matureTree': c => c.matureTree?.() ?? false,
  'soil.moisture': c => c.soilMoisture ?? 0,
  'water.volume': c => c.water.volume,
  'water.capacity': c => c.water.capacity,
  'water.saturation': c => c.water.saturation,
  'environment.exposedToSky': c => c.environment.exposedToSky,
};
const operators: Record<TransformationOperator, (a: Reading, b: Reading) => boolean> = {
  '==': (a, b) => a === b, '!=': (a, b) => a !== b, '>': (a, b) => a > b,
  '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b,
};

export function compileCondition(condition: TransformationCondition, id: string): Predicate {
  if ('all' in condition || 'any' in condition) {
    const every = 'all' in condition;
    const parts = (every ? condition.all : condition.any).map(child => compileCondition(child, id));
    if (!parts.length) throw new Error('Condição vazia: ' + id);
    return every ? c => parts.every(test => test(c)) : c => parts.some(test => test(c));
  }
  if ('not' in condition) {
    const child = compileCondition(condition.not, id);
    return c => !child(c);
  }
  const { property, operator, value } = condition;
  if (!Object.hasOwn(sensors, property) || !Object.hasOwn(operators, operator) ||
      !(typeof value === 'boolean' || Number.isFinite(value))) throw new Error('Condição inválida: ' + id);
  const read = sensors[property], compare = operators[operator];
  return c => compare(read(c), value);
}

export class TransformationEvaluator {
  condition(condition: TransformationCondition, context: TransformationEnvironment): boolean {
    return compileCondition(condition, 'condition')(context);
  }

  evaluate(rule: TransformationRule, context: TransformationEnvironment,
    progress: TransformationProgress, dt: number): TransformationEvaluation {
    const conditionsSatisfied = rule.test(context);
    const elapsed = conditionsSatisfied ? Math.min(rule.duration.seconds, progress.elapsed + Math.max(0, dt)) : 0;
    const durationReached = conditionsSatisfied && elapsed >= rule.duration.seconds;
    const canAttempt = rule.retry === 'every-interval' ? durationReached : durationReached && !progress.attempted;
    return { conditionsSatisfied, elapsed, durationReached, canAttempt };
  }
}
