import { CHUNK_WIDTH, type Slot, type Stack } from '../EngineTypes';
import type { SimulationRegion } from '../simulation/SimulationRegion';
import type { StationRegistry } from './StationRegistry';
import type { StationInstance, StationSave, StationStoreSave } from './StationTypes';

const key = (x: number, y: number) => `${x},${y}`;
const cloneSlots = (slots: readonly Slot[]) => slots.map(slot => slot ? { ...slot } : null);
const cloneJob = (job: StationSave['process']) => job ? { ...job, reservedInputs: job.reservedInputs.map(s => ({ ...s })) } : null;

export class StationStore {
  private readonly byId = new Map<string, StationInstance>();
  private readonly byPosition = new Map<string, StationInstance>();
  private readonly regions = new Map<number, Set<string>>();
  private nextId = 1;
  constructor(private readonly definitions: StationRegistry, saved?: StationStoreSave) { if (saved) this.restore(saved); }
  get size() { return this.byId.size; }
  getById(id: string) { return this.byId.get(id); }
  getAt(x: number, y: number) { return this.byPosition.get(key(x, y)); }
  private region(x: number) { return Math.floor(x / CHUNK_WIDTH); }
  create(definitionId: string, x: number, y: number) {
    const existing = this.getAt(x, y);
    if (existing) {
      if (existing.definitionId !== definitionId) throw new Error('Estação incompatível na posição');
      return existing;
    }
    const definition = this.definitions.get(definitionId);
    if (!definition || definition.mode !== 'processing' || !definition.storage) throw new Error(`Estação inválida: ${definitionId}`);
    let id: string;
    do {
      if (!Number.isSafeInteger(this.nextId) || this.nextId >= Number.MAX_SAFE_INTEGER) throw new Error('Identificadores de estações esgotados');
      id = `station-${this.nextId++}`;
    } while (this.byId.has(id));
    const instance: StationInstance = {
      id, definitionId, x, y, revision: 0,
      input: Array.from({ length: definition.storage.inputSlots }, () => null),
      output: Array.from({ length: definition.storage.outputSlots }, () => null),
      fuel: Array.from({ length: definition.storage.fuelSlots }, () => null), enabled: true,
      process: null, energyState: { temperature: 20, targetTemperature: 200, burningFuel: null }, manualWork: false,
    } as StationInstance;
    this.byId.set(id, instance); this.byPosition.set(key(x, y), instance);
    let bucket = this.regions.get(this.region(x)); if (!bucket) this.regions.set(this.region(x), bucket = new Set()); bucket.add(id);
    return instance;
  }
  remove(id: string) {
    const station = this.byId.get(id); if (!station) return [];
    const recovered: Stack[] = [...station.input, ...station.output, ...station.fuel, ...(station.process?.reservedInputs ?? [])]
      .filter((slot): slot is Stack => !!slot).map(slot => ({ ...slot }));
    this.byId.delete(id); this.byPosition.delete(key(station.x, station.y));
    const bucket = this.regions.get(this.region(station.x)); bucket?.delete(id); if (!bucket?.size) this.regions.delete(this.region(station.x));
    return recovered;
  }
  active(region: SimulationRegion) {
    const result: StationInstance[] = [];
    for (let chunk = Math.floor(region.left / CHUNK_WIDTH); chunk <= Math.floor(region.right / CHUNK_WIDTH); chunk++)
      for (const id of this.regions.get(chunk) ?? []) { const station = this.byId.get(id)!; if (region.containsTile(station.x, station.y)) result.push(station); }
    return result;
  }
  values() { return [...this.byId.values()]; }
  save(): StationStoreSave {
    return { nextId: this.nextId, records: [...this.byId.values()].map(({ manualWork: _manual, ...station }) => ({
      ...station, input: cloneSlots(station.input), output: cloneSlots(station.output), fuel: cloneSlots(station.fuel),
      process: cloneJob(station.process), energyState: { ...station.energyState, burningFuel: station.energyState.burningFuel ? { ...station.energyState.burningFuel } : null },
    })) };
  }
  restore(saved: StationStoreSave) {
    this.byId.clear(); this.byPosition.clear(); this.regions.clear(); this.nextId = Number.isSafeInteger(saved.nextId) && saved.nextId > 0 ? saved.nextId : 1;
    for (const record of saved.records) {
      const definition = this.definitions.get(record.definitionId);
      if (!definition || definition.mode !== 'processing' || this.byId.has(record.id) || this.getAt(record.x, record.y)) throw new Error('Instância de estação inválida');
      const suffix = /^station-(\d+)$/.exec(record.id);
      if (suffix) this.nextId = Math.max(this.nextId, Number(suffix[1]) + 1);
      const station: StationInstance = { ...record, input: cloneSlots(record.input), output: cloneSlots(record.output), fuel: cloneSlots(record.fuel),
        process: cloneJob(record.process), energyState: { ...record.energyState, burningFuel: record.energyState.burningFuel ? { ...record.energyState.burningFuel } : null }, manualWork: false };
      this.byId.set(station.id, station); this.byPosition.set(key(station.x, station.y), station);
      let bucket = this.regions.get(this.region(station.x)); if (!bucket) this.regions.set(this.region(station.x), bucket = new Set()); bucket.add(station.id);
    }
  }
}
