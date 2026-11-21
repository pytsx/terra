import { ITEMS, type Stack } from '../catalog';
import { fuels, processingRecipes, stationRegistry } from './StationRegistry';
import type { ProcessingRecipe, StationInstance } from './StationTypes';
import { canStore, countItem, store, storeAt, take, takeAt } from './SlotStorage';

export class ProcessingSystem {
  completed = 0;
  status(station: StationInstance) {
    const definition = stationRegistry.get(station.definitionId)!;
    if (!station.enabled) return 'Pausada';
    if (station.process?.status === 'blocked') return 'Saída cheia';
    if (!station.process) return station.energyState.temperature > 21 ? 'Resfriando' : 'Ociosa';
    if (definition.energy.type === 'manual') return station.manualWork ? 'Processando' : 'Pausada';
    if (definition.energy.type === 'hydraulic') return station.process.status === 'processing' ? 'Processando' : 'Aguardando corrente';
    const recipe = processingRecipes.get(station.process.recipeId)!;
    const min = recipe.conditions?.minTemperature ?? 0, max = recipe.conditions?.maxTemperature ?? Infinity;
    if (station.energyState.temperature < min) return station.energyState.burningFuel ? 'Aquecendo' : 'Sem combustível';
    if (station.energyState.temperature > max) return 'Superaquecida';
    return 'Processando';
  }
  setManualWork(station: StationInstance, active: boolean) { station.manualWork = active; station.revision++; }
  setTargetTemperature(station: StationInstance, target: number) {
    const definition = stationRegistry.get(station.definitionId); if (definition?.energy.type !== 'thermal') return false;
    if (!Number.isFinite(target)) return false;
    station.energyState.targetTemperature = Math.max(20, Math.min(definition.energy.maxTemperature, target)); station.revision++; return true;
  }
  insert(station: StationInstance, area: 'input' | 'fuel', stack: Stack) {
    const definition = stationRegistry.get(station.definitionId);
    if (!definition?.storage || !Object.hasOwn(ITEMS, stack.item) || !Number.isSafeInteger(stack.amount) || stack.amount <= 0) return stack.amount;
    if (!this.insertAllowed(definition, area, stack)) return stack.amount;
    const slots = station[area], left = store(slots, { ...stack }, definition.storage.stackLimit); if (left !== stack.amount) station.revision++; return left;
  }
  insertAt(station: StationInstance, area: 'input' | 'fuel', index: number, stack: Stack, amount = Infinity) {
    const definition = stationRegistry.get(station.definitionId);
    if (!definition?.storage || !Number.isInteger(index) || index < 0 || index >= station[area].length) return stack.amount;
    const requested = Math.min(stack.amount, amount);
    if (!Number.isSafeInteger(requested) || requested <= 0 || !this.insertAllowed(definition, area, stack)) return stack.amount;
    const rejected = storeAt(station[area], index, { ...stack, amount: requested }, definition.storage.stackLimit);
    const moved = requested - rejected;
    if (moved) station.revision++;
    return stack.amount - moved;
  }
  takeSlot(station: StationInstance, area: 'input' | 'output' | 'fuel', index: number, amount = Infinity) {
    if (!Number.isInteger(index) || index < 0 || index >= station[area].length) return null;
    const result = takeAt(station[area], index, amount);
    if (result) station.revision++;
    return result;
  }
  private insertAllowed(definition: NonNullable<ReturnType<typeof stationRegistry.get>>, area: 'input' | 'fuel', stack: Stack) {
    if (!Object.hasOwn(ITEMS, stack.item) || ITEMS[stack.item].tool || ITEMS[stack.item].armor || ITEMS[stack.item].unique) return false;
    if (area === 'fuel') return definition.energy.type === 'thermal' && definition.energy.acceptedFuels.includes(stack.item);
    return processingRecipes.compatible(definition).some(recipe => recipe.inputs.some(input => input.item === stack.item));
  }
  takeOutput(station: StationInstance, index: number, amount = Infinity) {
    return this.takeSlot(station, 'output', index, amount);
  }
  cancel(station: StationInstance) {
    const job = station.process, definition = stationRegistry.get(station.definitionId);
    if (!job || !definition?.storage || !canStore(station.input, job.reservedInputs, definition.storage.stackLimit)) return false;
    for (const stack of job.reservedInputs) store(station.input, stack, definition.storage.stackLimit);
    station.process = null; station.enabled = false; station.manualWork = false; station.revision++;
    return true;
  }
  private choose(station: StationInstance) {
    const definition = stationRegistry.get(station.definitionId)!;
    const candidates = processingRecipes.compatible(definition);
    return candidates.find(r => (!station.selectedRecipe || r.id === station.selectedRecipe) &&
      r.inputs.every(s => countItem(station.input, s.item) >= s.amount) &&
      canStore(station.output, r.outputs, definition.storage!.stackLimit));
  }
  private start(station: StationInstance, recipe: ProcessingRecipe) {
    for (const input of recipe.inputs) take(station.input, input.item, input.amount);
    station.process = { recipeId: recipe.id, elapsedWork: 0, requiredWork: recipe.work,
      reservedInputs: recipe.inputs.map(s => ({ ...s })), status: 'paused' }; station.revision++;
  }
  private thermal(dt: number, station: StationInstance) {
    const definition = stationRegistry.get(station.definitionId)!; if (definition.energy.type !== 'thermal') return;
    const acceptedFuels = definition.energy.acceptedFuels;
    const state = station.energyState;
    if (!state.burningFuel && station.process && station.enabled &&
      state.temperature < state.targetTemperature &&
      canStore(station.output, processingRecipes.get(station.process.recipeId)?.outputs ?? [], definition.storage!.stackLimit)) {
      const slot = station.fuel.find(s => s && acceptedFuels.includes(s.item));
      const fuel = slot && fuels.get(slot.item);
      if (slot && fuel) { slot.amount--; if (!slot.amount) station.fuel[station.fuel.indexOf(slot)] = null;
        state.burningFuel = { item: fuel.item, remainingSeconds: fuel.burnDuration, totalSeconds: fuel.burnDuration, targetTemperature: fuel.targetTemperature }; station.revision++; }
    }
    if (state.burningFuel) {
      const used = Math.min(dt, state.burningFuel.remainingSeconds); state.burningFuel.remainingSeconds -= used;
      const target = Math.min(definition.energy.maxTemperature, state.burningFuel.targetTemperature, state.targetTemperature);
      state.temperature = state.temperature <= target
        ? Math.min(target, state.temperature + definition.energy.heatingRate * used)
        : Math.max(target, state.temperature - definition.energy.coolingRate * used);
      if (state.burningFuel.remainingSeconds <= 1e-9) {
        state.burningFuel = null;
        state.temperature = Math.max(20, state.temperature - definition.energy.coolingRate * (dt - used));
      }
    } else state.temperature = Math.max(20, state.temperature - definition.energy.coolingRate * dt);
  }
  step(dt: number, stations: readonly StationInstance[], waterFlow?: ReadonlyMap<string, number>) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const station of stations) {
      const definition = stationRegistry.get(station.definitionId); if (!definition?.processing || !definition.storage) continue;
      if (!station.process && station.enabled) { const recipe = this.choose(station); if (recipe) this.start(station, recipe); }
      const previousTemp = station.energyState.temperature;
      if (definition.energy.type === 'thermal' && (station.energyState.burningFuel || previousTemp > 20 || station.process)) {
        this.thermal(dt, station); station.revision++;
      }
      const job = station.process; if (!job) continue;
      if (!station.enabled) { job.status = 'paused'; continue; }
      const recipe = processingRecipes.get(job.recipeId); if (!recipe) { job.status = 'blocked'; continue; }
      if (!canStore(station.output, recipe.outputs, definition.storage.stackLimit)) { job.status = 'blocked'; continue; }
      let work = 0;
      if (definition.energy.type === 'manual') work = station.manualWork ? dt * definition.energy.workRate : 0;
      else if (definition.energy.type === 'hydraulic') work = (waterFlow?.get(station.id) ?? 0) * definition.energy.workPerVolume;
      else if (definition.energy.type === 'thermal') {
        const temp = station.energyState.temperature;
        // Credit only intervals whose endpoints satisfy the thermal requirement.
        const min = recipe.conditions?.minTemperature ?? 0, max = recipe.conditions?.maxTemperature ?? Infinity;
        if (Math.min(temp, previousTemp) >= min && Math.max(temp, previousTemp) <= max) work = dt;
      }
      if (!work) { job.status = 'paused'; continue; }
      job.status = 'processing'; job.elapsedWork = Math.min(job.requiredWork, job.elapsedWork + work * definition.processing.speed); station.revision++;
      if (job.requiredWork - job.elapsedWork > 1e-9) continue;
      for (const output of recipe.outputs) store(station.output, { ...output }, definition.storage.stackLimit);
      station.process = null;
      if (!definition.processing.automaticRepeat) station.enabled = false;
      station.revision++; this.completed++;
    }
  }
}
