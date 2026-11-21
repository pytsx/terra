import { ITEMS, type Slot, type Stack } from '../catalog';
import { fuels, processingRecipes, stationRegistry } from './StationRegistry';
import type { ProcessingRecipe, StationInstance } from './StationTypes';

function count(slots: readonly Slot[], item: string) { return slots.reduce((n, s) => n + (s?.item === item ? s.amount : 0), 0); }
function canStore(slots: readonly Slot[], stacks: readonly Stack[], limit: number) {
  const copy = slots.map(s => s ? { ...s } : null);
  return stacks.every(stack => {
    let left = stack.amount;
    for (const slot of copy) if (slot?.item === stack.item && slot.durability === stack.durability) {
      const add = Math.max(0, Math.min(left, limit - slot.amount)); slot.amount += add; left -= add;
    }
    for (let i = 0; left && i < copy.length; i++) if (!copy[i]) { const add = Math.min(left, limit); copy[i] = { ...stack, amount: add }; left -= add; }
    return left === 0;
  });
}
function store(slots: Slot[], stack: Stack, limit: number) {
  let left = stack.amount;
  for (const slot of slots) if (slot?.item === stack.item && slot.durability === stack.durability) {
    const add = Math.max(0, Math.min(left, limit - slot.amount)); slot.amount += add; left -= add;
  }
  for (let i = 0; left && i < slots.length; i++) if (!slots[i]) { const add = Math.min(left, limit); slots[i] = { ...stack, amount: add }; left -= add; }
  return left;
}
function take(slots: Slot[], item: string, amount: number) {
  let left = amount;
  for (let i = 0; left && i < slots.length; i++) { const slot = slots[i]; if (slot?.item !== item) continue;
    const used = Math.min(left, slot.amount); slot.amount -= used; left -= used; if (!slot.amount) slots[i] = null; }
  return left === 0;
}

export class ProcessingSystem {
  completed = 0;
  status(station: StationInstance) {
    const definition = stationRegistry.get(station.definitionId)!;
    if (!station.enabled) return 'Pausada';
    if (station.process?.status === 'blocked') return 'Saída cheia';
    if (!station.process) return station.energyState.temperature > 21 ? 'Resfriando' : 'Ociosa';
    if (definition.energy.type === 'manual') return station.manualWork ? 'Processando' : 'Pausada';
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
    if (ITEMS[stack.item].tool || ITEMS[stack.item].armor || ITEMS[stack.item].unique) return stack.amount;
    if (area === 'input' && !processingRecipes.compatible(definition).some(r => r.inputs.some(s => s.item === stack.item))) return stack.amount;
    if (area === 'fuel' && (definition.energy.type !== 'thermal' || !definition.energy.acceptedFuels.includes(stack.item))) return stack.amount;
    const slots = station[area], left = store(slots, { ...stack }, definition.storage.stackLimit); if (left !== stack.amount) station.revision++; return left;
  }
  takeOutput(station: StationInstance, index: number, amount = Infinity) {
    const slot = station.output[index]; if (!slot || !(amount === Infinity || Number.isSafeInteger(amount) && amount > 0)) return null;
    const moved = Math.min(slot.amount, amount), result = { ...slot, amount: moved }; slot.amount -= moved;
    if (!slot.amount) station.output[index] = null; station.revision++; return result;
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
      r.inputs.every(s => count(station.input, s.item) >= s.amount) &&
      canStore(station.output, r.outputs, definition.storage!.stackLimit));
  }
  private start(station: StationInstance, recipe: ProcessingRecipe) {
    for (const input of recipe.inputs) take(station.input, input.item, input.amount);
    station.process = { recipeId: recipe.id, elapsedWork: 0, requiredWork: recipe.work,
      reservedInputs: recipe.inputs.map(s => ({ ...s })), status: 'paused' }; station.revision++;
  }
  private thermal(dt: number, station: StationInstance) {
    const definition = stationRegistry.get(station.definitionId)!; if (definition.energy.type !== 'thermal') return;
    const state = station.energyState;
    if (!state.burningFuel && station.process && station.enabled &&
      state.temperature < state.targetTemperature &&
      canStore(station.output, processingRecipes.get(station.process.recipeId)?.outputs ?? [], definition.storage!.stackLimit)) {
      const slot = station.fuel.find(s => s && definition.energy.acceptedFuels.includes(s.item));
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
  step(dt: number, stations: readonly StationInstance[]) {
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
      let rate = 0;
      if (definition.energy.type === 'manual') rate = station.manualWork ? definition.energy.workRate : 0;
      else if (definition.energy.type === 'thermal') {
        const temp = station.energyState.temperature;
        // Credit only intervals whose endpoints satisfy the thermal requirement.
        const min = recipe.conditions?.minTemperature ?? 0, max = recipe.conditions?.maxTemperature ?? Infinity;
        if (Math.min(temp, previousTemp) >= min && Math.max(temp, previousTemp) <= max) rate = 1;
      }
      if (!rate) { job.status = 'paused'; continue; }
      job.status = 'processing'; job.elapsedWork = Math.min(job.requiredWork, job.elapsedWork + dt * rate * definition.processing.speed); station.revision++;
      if (job.requiredWork - job.elapsedWork > 1e-9) continue;
      for (const output of recipe.outputs) store(station.output, { ...output }, definition.storage.stackLimit);
      station.process = null;
      if (!definition.processing.automaticRepeat) station.enabled = false;
      station.revision++; this.completed++;
    }
  }
}
