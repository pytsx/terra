import { CHUNK_HEIGHT, CHUNK_WIDTH, TILE } from '../catalog';
import type { EntityRegionSave, EntitySave } from '../save';
import type { SimulationRegion } from '../simulation/SimulationRegion';
import { EntityRegistry, type EngineEntity } from './EntityRegistry';

interface RegionBucket {
  sleeping: EntitySave[];
  active: EngineEntity[];
}

/** Owns entities by chunk section and only hydrates runtime objects for the
 * current simulation region. Sleeping regions retain compact serializable data. */
export class RegionalEntityStore {
  private readonly regions = new Map<string, RegionBucket>();
  /** Only these keys contain hydrated runtime entities. Historical regions are
   * intentionally never walked during an ordinary simulation tick. */
  private readonly activeKeys = new Set<string>();

  constructor(regions?: readonly EntityRegionSave[], legacy: readonly EntitySave[] = []) {
    if (regions !== undefined) {
      for (const [rx, ry, entities] of regions) this.bucket(rx, ry).sleeping.push(...entities);
    } else {
      for (const entity of legacy) {
        const [rx, ry] = this.regionOfActor(entity.actor);
        this.bucket(rx, ry).sleeping.push(entity);
      }
    }
  }

  activate(region: SimulationRegion) {
    this.reindexActive();
    const desired = this.keysFor(region);
    // Suspend only regions that were active last tick and are no longer needed.
    for (const key of [...this.activeKeys]) {
      if (desired.has(key)) continue;
      const bucket = this.regions.get(key);
      if (bucket) this.sleep(bucket);
      this.activeKeys.delete(key);
      if (bucket && !bucket.sleeping.length) this.regions.delete(key);
    }
    // Hydrate only newly entered regions; no scan over explored history.
    for (const key of desired) {
      const bucket = this.regions.get(key);
      if (!bucket) continue;
      if (!this.activeKeys.has(key)) this.wake(bucket);
      if (bucket.active.length) this.activeKeys.add(key);
    }
    const active: EngineEntity[] = [];
    for (const key of desired) {
      const bucket = this.regions.get(key);
      if (bucket) active.push(...bucket.active);
    }
    return active;
  }

  commit(region: SimulationRegion) {
    for (const key of this.activeKeys) {
      const bucket = this.regions.get(key);
      if (bucket) bucket.active = bucket.active.filter(entity => !entity.dead);
    }
    return this.activate(region);
  }

  add(entity: EngineEntity) {
    const [rx, ry] = this.regionOf(entity);
    const active = this.bucket(rx, ry).active;
    if (!active.includes(entity)) active.push(entity);
    this.activeKeys.add(this.key(rx, ry));
  }

  save(): EntityRegionSave[] {
    this.reindexActive();
    const result: EntityRegionSave[] = [];
    for (const [key, bucket] of this.regions) {
      const entities = [...bucket.sleeping, ...bucket.active.filter(entity => !entity.dead).map(EntityRegistry.save)];
      if (!entities.length) continue;
      const [rx, ry] = this.coords(key);
      result.push([rx, ry, entities]);
    }
    return result.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  get stats() {
    let activeEntities = 0, sleepingEntities = 0;
    for (const key of this.activeKeys) activeEntities += this.regions.get(key)?.active.length ?? 0;
    for (const bucket of this.regions.values()) {
      sleepingEntities += bucket.sleeping.length;
    }
    return { entityRegions: this.regions.size, activeEntityRegions: this.activeKeys.size,
      activeRegionEntities: activeEntities, sleepingRegionEntities: sleepingEntities };
  }

  private wake(bucket: RegionBucket) {
    if (!bucket.sleeping.length) return;
    for (const saved of bucket.sleeping) {
      const entity = EntityRegistry.restore(saved);
      if (entity && !entity.dead) bucket.active.push(entity);
    }
    bucket.sleeping = [];
  }

  private sleep(bucket: RegionBucket) {
    if (!bucket.active.length) return;
    bucket.sleeping.push(...bucket.active.filter(entity => !entity.dead).map(EntityRegistry.save));
    bucket.active = [];
  }

  private reindexActive() {
    for (const key of [...this.activeKeys]) {
      const bucket = this.regions.get(key);
      if (!bucket) { this.activeKeys.delete(key); continue; }
      const retained: EngineEntity[] = [];
      for (const entity of bucket.active) {
        if (entity.dead) continue;
        const [rx, ry] = this.regionOf(entity), target = this.key(rx, ry);
        if (target === key) retained.push(entity);
        else {
          this.bucket(rx, ry).active.push(entity);
          this.activeKeys.add(target);
        }
      }
      bucket.active = retained;
      if (!retained.length) this.activeKeys.delete(key);
    }
  }

  private keysFor(region: SimulationRegion) {
    const result = new Set<string>();
    const minX = Math.floor(region.left / CHUNK_WIDTH), maxX = Math.floor(region.right / CHUNK_WIDTH);
    const minY = Math.floor(Math.max(0, region.top) / CHUNK_HEIGHT);
    const maxY = Math.floor(Math.max(0, region.bottom) / CHUNK_HEIGHT);
    for (let ry = minY; ry <= maxY; ry++) for (let rx = minX; rx <= maxX; rx++) result.add(this.key(rx, ry));
    return result;
  }

  private regionOf(entity: EngineEntity) { return this.regionOfActor(entity.view()); }
  private regionOfActor(actor: { x: number; y: number; w?: number; h?: number }): [number, number] {
    const tileX = Math.floor((actor.x + (actor.w ?? 0) / 2) / TILE);
    const tileY = Math.max(0, Math.floor((actor.y + (actor.h ?? 0) / 2) / TILE));
    return [Math.floor(tileX / CHUNK_WIDTH), Math.floor(tileY / CHUNK_HEIGHT)];
  }
  private bucket(rx: number, ry: number) {
    const key = this.key(rx, ry);
    let bucket = this.regions.get(key);
    if (!bucket) this.regions.set(key, bucket = { sleeping: [], active: [] });
    return bucket;
  }
  private key(rx: number, ry: number) { return `${rx},${ry}`; }
  private coords(key: string): [number, number] {
    const comma = key.indexOf(',');
    return [Number(key.slice(0, comma)), Number(key.slice(comma + 1))];
  }
}
