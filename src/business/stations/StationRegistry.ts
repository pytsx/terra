import type { Materials } from '../content/Materials';
import { production } from '../../assets/production';
import { legacyMaterials } from '../content/Materials';

import type { FuelDefinition, ProcessingRecipe, StationDefinition } from './StationTypes';

export class StationRegistry {
  private readonly definitions = new Map<string, StationDefinition>();
  private readonly blocks = new Map<number, StationDefinition>();
  constructor(values: readonly StationDefinition[], materials: Materials) {
    for (const value of values) {
      if (!value.id || this.definitions.has(value.id)) throw new Error(`Estação duplicada: ${value.id}`);
      const block = materials.keys[value.block];
      if (block === undefined || this.blocks.has(block)) throw new Error(`Bloco desconhecido da estação: ${value.block}`);
      if (!['crafting', 'processing'].includes(value.mode) || !['none', 'manual', 'thermal', 'hydraulic'].includes(value.energy.type)) throw new Error(`Modo ou energia inválida: ${value.id}`);
      if (value.energy.type === 'hydraulic' && !(Number.isFinite(value.energy.workPerVolume) && value.energy.workPerVolume > 0))
        throw new Error('Conversão hidráulica inválida: ' + value.id);
      if (!Array.isArray(value.capabilities) || value.capabilities.some(c => typeof c !== 'string' || !c) || new Set(value.capabilities).size !== value.capabilities.length)
        throw new Error(`Capacidades inválidas: ${value.id}`);
      if (value.mode === 'processing') {
        const storage = value.storage, processing = value.processing;
        if (value.energy.type === 'none' || !storage || !processing || [storage.inputSlots, storage.outputSlots, storage.fuelSlots, storage.stackLimit]
          .every(Number.isSafeInteger) === false || storage.inputSlots < 0 || storage.outputSlots < 0 ||
          storage.fuelSlots < 0 || storage.stackLimit <= 0 || !Number.isFinite(processing.speed) || processing.speed <= 0)
          throw new Error(`Configuração de processamento inválida: ${value.id}`);
      }
      if (value.energy.type === 'manual' && (!Number.isFinite(value.energy.workRate) || value.energy.workRate <= 0))
        throw new Error(`Energia manual inválida: ${value.id}`);
      if (value.energy.type === 'thermal') {
        for (const item of value.energy.acceptedFuels) if (!materials.items[item]) throw new Error(`Combustível desconhecido: ${item}`);
        if (![value.energy.maxTemperature, value.energy.heatingRate, value.energy.coolingRate]
          .every(n => Number.isFinite(n) && n > 0)) throw new Error(`Energia térmica inválida: ${value.id}`);
      }
      this.definitions.set(value.id, value); this.blocks.set(block, value);
    }
  }
  get(id: string) { return this.definitions.get(id); }
  forBlock(block: number) { return this.blocks.get(block); }
  values() { return [...this.definitions.values()]; }
}
export class ProcessingRecipeRegistry {
  private readonly byStation = new WeakMap<StationDefinition, readonly ProcessingRecipe[]>();
  private readonly recipes = new Map<string, ProcessingRecipe>();
  constructor(values: readonly ProcessingRecipe[], materials: Materials) {
    for (const value of values) {
      if (!value.id || this.recipes.has(value.id) || !Number.isFinite(value.work) || value.work <= 0 ||
        !value.requires.length || [...value.inputs, ...value.outputs].some(s => !materials.items[s.item] || !Number.isSafeInteger(s.amount) || s.amount <= 0))
        throw new Error(`Receita de processamento inválida: ${value.id}`);
      if (!value.inputs.length || !value.outputs.length || new Set(value.inputs.map(s => s.item)).size !== value.inputs.length ||
        [value.conditions?.minTemperature, value.conditions?.maxTemperature].some(n => n !== undefined && !Number.isFinite(n)) ||
        (value.conditions?.minTemperature ?? -Infinity) > (value.conditions?.maxTemperature ?? Infinity)) throw new Error(`Condições ou ingredientes inválidos: ${value.id}`);
      this.recipes.set(value.id, value);
    }
  }
  get(id: string) { return this.recipes.get(id); }
  compatible(definition: StationDefinition) {
    let matches = this.byStation.get(definition);
    if (!matches) {
      const energy = definition.energy;
      matches = Object.freeze([...this.recipes.values()].filter(recipe =>
        recipe.requires.every(cap => definition.capabilities.includes(cap)) &&
        (!recipe.conditions || (energy.type === 'thermal' &&
          (recipe.conditions.minTemperature ?? 20) <= energy.maxTemperature &&
          (recipe.conditions.maxTemperature ?? Infinity) >= 20))));
      this.byStation.set(definition, matches);
    }
    return matches;
  }
}

export interface ProductionDefinitions {
  stations: readonly StationDefinition[];
  processes: readonly ProcessingRecipe[];
  fuels: readonly FuelDefinition[];
}

export function compileProduction(definitions: ProductionDefinitions, materials: Materials) {
  const stationRegistry = new StationRegistry(definitions.stations, materials);
  const processingRecipes = new ProcessingRecipeRegistry(definitions.processes, materials);
  const reachable = new Set(stationRegistry.values().filter(s => s.mode === 'processing')
    .flatMap(s => processingRecipes.compatible(s).map(r => r.id)));
  for (const recipe of definitions.processes)
    if (!reachable.has(recipe.id)) throw new Error('Processo sem estação compatível: ' + recipe.id);
  const fuels = new Map<string, FuelDefinition>();
  for (const value of definitions.fuels) {
    if (!Object.hasOwn(materials.items, value.item) || fuels.has(value.item) ||
        !Number.isFinite(value.burnDuration) || value.burnDuration <= 0 ||
        !Number.isFinite(value.targetTemperature) || value.targetTemperature < 20) throw new Error('Combustível inválido: ' + value.item);
    fuels.set(value.item, value);
  }
  for (const definition of stationRegistry.values()) if (definition.energy.type === 'thermal')
    for (const item of definition.energy.acceptedFuels) if (!fuels.has(item)) throw new Error('Combustível sem definição: ' + item);
  return { stationRegistry, processingRecipes, fuels };
}
/** @deprecated Compatibility facades; simulations receive these through RuntimeContent. */
export const { stationRegistry, processingRecipes, fuels } = compileProduction(production, legacyMaterials);

