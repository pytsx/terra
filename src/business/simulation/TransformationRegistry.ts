import { transformationAssets, type TransformationAsset, type TransformationCondition } from '../../assets';
import { B, ITEMS } from '../catalog';
import { GAME_DAY_SECONDS } from '../time';
import { worldFeatureRegistry } from '../worldgen/features/WorldFeatureRegistry';

export type EvolutionAction =
  | { readonly type: 'transformBlock'; readonly to: number; readonly preserve: readonly 'waterVolume'[] }
  | { readonly type: 'placeFeature'; readonly feature: string; readonly replaceSource: boolean }
  | { readonly type: 'spawnItem'; readonly item: string; readonly amount: number };
export interface TransformationRule {
  readonly id: string;
  readonly priority: number;
  readonly source: number;
  readonly conditions: TransformationAsset['conditions'];
  readonly duration: { readonly seconds: number; readonly mode: 'continuous' };
  readonly probability: number;
  readonly retry: 'on-condition-reset';
  readonly eligibility: { readonly natural: boolean; readonly playerPlaced: boolean };
  readonly action: EvolutionAction;
}

const properties = new Set(['water.volume', 'water.capacity', 'water.saturation', 'environment.exposedToSky']);
const operators = new Set(['==', '!=', '>', '>=', '<', '<=']);

function validateCondition(condition: TransformationCondition, id: string): void {
  if ('all' in condition) {
    if (!condition.all.length) throw new Error(`Transformação ${id}: all vazio`);
    condition.all.forEach(child => validateCondition(child, id));
  } else if ('any' in condition) {
    if (!condition.any.length) throw new Error(`Transformação ${id}: any vazio`);
    condition.any.forEach(child => validateCondition(child, id));
  } else if ('not' in condition) validateCondition(condition.not, id);
  else if (!properties.has(condition.property) || !operators.has(condition.operator) ||
    (typeof condition.value !== 'number' && typeof condition.value !== 'boolean') ||
    (typeof condition.value === 'number' && !Number.isFinite(condition.value)))
    throw new Error(`Transformação ${id}: condição inválida`);
}

export class TransformationRegistry {
  readonly rules: readonly TransformationRule[];
  private readonly bySource = new Map<number, readonly TransformationRule[]>();

  constructor(assets: readonly TransformationAsset[] = transformationAssets) {
    const ids = new Set<string>();
    const resolved = assets.map((asset): TransformationRule => {
      if (!asset.id || ids.has(asset.id)) throw new Error(`Transformação duplicada: ${asset.id}`);
      ids.add(asset.id);
      const sourceKey = 'source' in asset ? asset.source : asset.from;
      const source = B[sourceKey];
      const seconds = (asset.duration.days ?? 0) * GAME_DAY_SECONDS + (asset.duration.seconds ?? 0);
      const eligibility = asset.eligibility ?? { natural: true, playerPlaced: false };
      validateCondition(asset.conditions, asset.id);
      const declaredAction = 'action' in asset ? asset.action :
        { type: 'transformBlock' as const, to: asset.to, preserve: asset.preserve };
      let action: EvolutionAction;
      if (declaredAction.type === 'transformBlock') {
        const to = B[declaredAction.to];
        if (to === undefined || to === source || declaredAction.preserve.some(value => value !== 'waterVolume'))
          throw new Error(`Transformação ${asset.id}: ação inválida`);
        action = Object.freeze({ type: 'transformBlock', to, preserve: Object.freeze([...declaredAction.preserve]) });
      } else {
        if (declaredAction.type === 'placeFeature' &&
          (!worldFeatureRegistry.has(declaredAction.feature) || typeof declaredAction.replaceSource !== 'boolean'))
          throw new Error(`Transformação ${asset.id}: feature desconhecida`);
        if (declaredAction.type === 'spawnItem' &&
          (!Object.hasOwn(ITEMS, declaredAction.item) || !Number.isSafeInteger(declaredAction.amount) ||
            declaredAction.amount <= 0))
          throw new Error(`Transformação ${asset.id}: item inválido`);
        action = Object.freeze({ ...declaredAction });
      }
      if (source === undefined || asset.duration.mode !== 'continuous' || !(seconds > 0) ||
        !(asset.probability >= 0 && asset.probability <= 1) || asset.retry !== 'on-condition-reset' ||
        typeof eligibility.natural !== 'boolean' || typeof eligibility.playerPlaced !== 'boolean')
        throw new Error(`Transformação ${asset.id}: definição inválida`);
      return Object.freeze({ id: asset.id, source, conditions: asset.conditions, probability: asset.probability,
        retry: asset.retry, action, priority: asset.priority ?? 0,
        eligibility: Object.freeze(eligibility),
        duration: Object.freeze({ seconds, mode: 'continuous' as const }) });
    }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    this.rules = Object.freeze(resolved);
    for (const source of new Set(resolved.map(rule => rule.source)))
      this.bySource.set(source, Object.freeze(resolved.filter(rule => rule.source === source)));
  }

  forBlock(block: number) { return this.bySource.get(block) ?? []; }
  has(id: string) { return this.rules.some(rule => rule.id === id); }
}

export const transformationRegistry = new TransformationRegistry();
