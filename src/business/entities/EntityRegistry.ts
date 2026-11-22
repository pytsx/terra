import type { ActorView } from './Actor';
import type { World } from '../world/World';
import type { RNG } from '../../shared/math';
import type { EntitySave } from '../save';
export interface EngineEntity { readonly dead:boolean; hit(face:number,damage?:number):void; step(dt:number,world:World,player:ActorView,rng:RNG,population?:readonly EngineEntity[],elapsed?:number):boolean; view():ActorView&Record<string,unknown>; feed?():boolean; mate?(other:EngineEntity):EngineEntity|null; inLove?:boolean; saveState():Omit<EntitySave,'id'>; restoreState(save:EntitySave):void }
export type EntityFactory=(x:number,y:number,seed:number,baby?:boolean)=>EngineEntity;
export interface EntityAssetView { readonly config:{readonly id:string;readonly name?:string;readonly health:number;readonly spawn:{readonly weight:number;readonly biomes?:readonly string[]};readonly substrate?:readonly string[];readonly [key:string]:any};readonly script:any }
export class EntityRegistry {
  private readonly identities=new WeakMap<EngineEntity,string>();
  constructor(private readonly assets:Readonly<Record<string,EntityAssetView>>,private readonly factories:ReadonlyMap<string,EntityFactory>,private readonly keys:Readonly<Record<string,number>>){}
  ids(){return Object.keys(this.assets)} asset(id:string){return this.assets[id]}
  create(id:string,x:number,y:number,seed:number,baby=false){const entity=this.factories.get(id)?.(x,y,seed,baby);if(entity)this.identities.set(entity,`${id}:${seed}:${Math.round(x*1000)}:${Math.round(y*1000)}`);return entity}
  save(entity:EngineEntity):EntitySave{let id=this.identities.get(entity);if(!id){const v=entity.view();id=`${String(v.kind)}:${Math.round(v.x*1000)}:${Math.round(v.y*1000)}`;this.identities.set(entity,id)}return{id,...entity.saveState()}}
  restore(save:EntitySave){if(!save||typeof save.id!=='string'||!save.id||typeof save.kind!=='string'||!save.actor||!Number.isFinite(save.actor.x)||!Number.isFinite(save.actor.y))return;const entity=this.factories.get(save.kind)?.(save.actor.x,save.actor.y,0,save.breeding?.stage==='calf');if(!entity)return;entity.restoreState(save);this.identities.set(entity,save.id);return entity}
  spawnPool(substrate?:number,biome?:string){return this.ids().filter(id=>substrate===undefined||!this.assets[id].config.substrate||this.assets[id].config.substrate!.some(key=>this.keys[key]===substrate)).map(id=>{const spawn=this.assets[id].config.spawn;return{id,weight:spawn.weight*(biome&&spawn.biomes?.includes(biome)?2:1)}})}
}
