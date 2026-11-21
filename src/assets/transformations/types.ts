export type TransformationProperty =
  | 'water.volume'
  | 'water.capacity'
  | 'water.saturation'
  | 'environment.exposedToSky';
export type TransformationOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';
export interface PropertyCondition {
  property: TransformationProperty;
  operator: TransformationOperator;
  value: number | boolean;
}
export type TransformationCondition = PropertyCondition |
  { all: TransformationCondition[] } |
  { any: TransformationCondition[] } |
  { not: TransformationCondition };
interface EvolutionRuleBase {
  id: string;
  priority?: number;
  conditions: TransformationCondition;
  duration: { days?: number; seconds?: number; mode: 'continuous' };
  probability: number;
  retry: 'on-condition-reset';
}
export interface LegacyTransformationAsset extends EvolutionRuleBase {
  from: string;
  to: string;
  preserve: ('waterVolume')[];
}
export interface WorldEvolutionAsset extends EvolutionRuleBase {
  source: string;
  action: { type: 'transformBlock'; to: string; preserve: ('waterVolume')[] } |
    { type: 'placeFeature'; feature: string; replaceSource: boolean };
}
export type TransformationAsset = LegacyTransformationAsset | WorldEvolutionAsset;
