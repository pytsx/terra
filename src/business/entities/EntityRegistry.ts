import { modularEntities } from '../../assets';
import { ecologicalEntities } from '../../assets/entities/ecology';
import { Organism } from '../ecosystem/Organism';
import { B } from '../catalog';
import type { ActorView } from './Actor';
import type { World } from '../world/World';
import type { RNG } from '../../shared/math';
import { Slime } from './Slime';
import { Cow } from './Cow';
import { Wolf } from './Wolf';
import type { EntitySave } from '../save';

export interface EngineEntity {
  readonly dead: boolean;
  hit(face: number, damage?: number): void;
  step(dt: number, world: World, player: ActorView, rng: RNG, population?: readonly EngineEntity[], elapsed?: number): boolean;
  view(): ActorView & Record<string, unknown>;
  feed?(): boolean;
  mate?(other: EngineEntity): EngineEntity | null;
  inLove?: boolean;
  saveState(): Omit<EntitySave, 'id'>;
  restoreState(save: EntitySave): void;
}

type EntityFactory = (x: number, y: number, seed: number, baby?: boolean) => EngineEntity;
type EntityId = keyof typeof modularEntities;
type EntityAsset = (typeof modularEntities)[EntityId];

const mobFactories = {
  slime: (x, y, seed) => new Slime(x, y, seed),
  cow: (x, y, seed, baby) => new Cow(x, y, seed, baby),
  wolf: (x, y) => new Wolf(x, y),
} satisfies Record<Exclude<EntityId, keyof typeof ecologicalEntities>, EntityFactory>;

const factories = new Map<string, EntityFactory>(Object.entries(mobFactories));
for (const [id, species] of Object.entries(ecologicalEntities))
  factories.set(id, (x, y, seed) => new Organism(species, x, y, seed));

const identities = new WeakMap<EngineEntity, string>();
function identity(entity: EngineEntity) {
  let id = identities.get(entity);
  if (id) return id;
  const view = entity.view();
  id = `${String(view.kind)}:${Math.round(view.x * 1000)}:${Math.round(view.y * 1000)}`;
  identities.set(entity, id);
  return id;
}

function asset<K extends EntityId>(id: K): (typeof modularEntities)[K];
function asset(id: string): EntityAsset | undefined;
function asset(id: string) {
  return Object.hasOwn(modularEntities, id) ? modularEntities[id as EntityId] : undefined;
}

export const EntityRegistry = {
  ids() {
    return Object.keys(modularEntities) as EntityId[];
  },
  asset,
  create(id: string, x: number, y: number, seed: number, baby = false): EngineEntity | undefined {
    const entity = factories.get(id)?.(x, y, seed, baby);
    if (entity) identities.set(entity, `${id}:${seed}:${Math.round(x * 1000)}:${Math.round(y * 1000)}`);
    return entity;
  },
  save(entity: EngineEntity): EntitySave {
    return { id: identity(entity), ...entity.saveState() };
  },
  restore(save: EntitySave): EngineEntity | undefined {
    if (!save || typeof save.id !== 'string' || !save.id || typeof save.kind !== 'string' ||
      !save.actor || !Number.isFinite(save.actor.x) || !Number.isFinite(save.actor.y)) return;
    const entity = factories.get(save.kind)?.(save.actor.x, save.actor.y, 0, save.breeding?.stage === 'calf');
    if (!entity) return;
    entity.restoreState(save);
    identities.set(entity, save.id);
    return entity;
  },
  spawnPool(substrate?: number, biome?: string) {
    return this.ids().filter((id) => {
      const config = this.asset(id).config;
      return substrate === undefined || !('substrate' in config) ||
        config.substrate.some(material => B[material] === substrate);
    }).map((id) => {
      const spawn = this.asset(id).config.spawn;
      const preferred = biome && 'biomes' in spawn && spawn.biomes.includes(biome);
      return { id, weight: spawn.weight * (preferred ? 2 : 1) };
    });
  },
};
