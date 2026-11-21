import { immutable } from './immutable';
import { permeabilityFor } from './blocks/permeability';

export type { AssetStates, BlockAssetScript, ItemAssetScript, ToolAssetScript } from './types';
export type {
  EntityAssetScript,
  EntityBrain,
  EntityDecision,
  EntitySensor,
} from './entity-types';
export { chaseOrWander, directionToPlayer, distanceToPlayer } from './entity-sdk';
export type { CraftAsset } from './craft-types';
export { transformationAssets } from './transformations';
export type { TransformationAsset, TransformationCondition } from './transformations';
export { worldFeatureAssets } from './features';
export type { WorldFeatureAsset } from './features';

import entitySlimeConfig from './entities/slime/config.json';
import entitySlime from './entities/slime';
import entityCowConfig from './entities/cow/config.json';
import entityCow from './entities/cow';
import entityWolfConfig from './entities/wolf/config.json';
import entityWolf from './entities/wolf';

import item_leatherConfig from './items/leather/config.json';
import item_leatherScript from './items/leather';
import item_beefConfig from './items/beef/config.json';
import item_beefScript from './items/beef';
import item_slimeConfig from './items/slime/config.json';
import item_slimeScript from './items/slime';
import item_raw_meatConfig from './items/raw_meat/config.json';
import item_raw_meatScript from './items/raw_meat';
import item_wheatConfig from './items/wheat/config.json';
import item_wheatScript from './items/wheat';
import item_cooked_beefConfig from './items/cooked_beef/config.json';
import item_cooked_beefScript from './items/cooked_beef';
import item_swordConfig from './items/sword/config.json';
import item_swordScript from './items/sword';
import item_crystalpickConfig from './items/crystalPick/config.json';
import item_crystalpickScript from './items/crystalPick';
import item_leatherHelmetConfig from './items/leatherHelmet/config.json';
import item_leatherHelmetScript from './items/leatherHelmet';
import item_leatherChestplateConfig from './items/leatherChestplate/config.json';
import item_leatherChestplateScript from './items/leatherChestplate';
import item_leatherLeggingsConfig from './items/leatherLeggings/config.json';
import item_leatherLeggingsScript from './items/leatherLeggings';
import item_leatherBootsConfig from './items/leatherBoots/config.json';
import item_leatherBootsScript from './items/leatherBoots';
import block_airConfig from './blocks/AIR/config.json';
import block_airScript from './blocks/AIR';
import block_bedrockConfig from './blocks/BEDROCK/config.json';
import block_bedrockScript from './blocks/BEDROCK';
import block_brickConfig from './blocks/BRICK/config.json';
import block_brickScript from './blocks/BRICK';
import block_coalConfig from './blocks/COAL/config.json';
import block_coalScript from './blocks/COAL';
import block_copperConfig from './blocks/COPPER/config.json';
import block_copperScript from './blocks/COPPER';
import block_crystalConfig from './blocks/CRYSTAL/config.json';
import block_crystalScript from './blocks/CRYSTAL';
import block_deepConfig from './blocks/DEEP/config.json';
import block_deepScript from './blocks/DEEP';
import block_dirtConfig from './blocks/DIRT/config.json';
import block_dirtScript from './blocks/DIRT';
import block_goldConfig from './blocks/GOLD/config.json';
import block_goldScript from './blocks/GOLD';
import block_grassConfig from './blocks/GRASS/config.json';
import block_grassScript from './blocks/GRASS';
import block_gravelConfig from './blocks/GRAVEL/config.json';
import block_gravelScript from './blocks/GRAVEL';
import block_leafConfig from './blocks/LEAF/config.json';
import block_leafScript from './blocks/LEAF';
import block_plankConfig from './blocks/PLANK/config.json';
import block_plankScript from './blocks/PLANK';
import block_sandConfig from './blocks/SAND/config.json';
import block_sandScript from './blocks/SAND';
import block_stoneConfig from './blocks/STONE/config.json';
import block_stoneScript from './blocks/STONE';
import block_torchConfig from './blocks/TORCH/config.json';
import block_torchScript from './blocks/TORCH';
import block_woodConfig from './blocks/WOOD/config.json';
import block_woodScript from './blocks/WOOD';
import block_workbenchConfig from './blocks/WORKBENCH/config.json';
import block_workbenchScript from './blocks/WORKBENCH';
import block_waterConfig from './blocks/WATER/config.json';
import block_waterScript from './blocks/WATER';
import block_lavaConfig from './blocks/LAVA/config.json';
import block_lavaScript from './blocks/LAVA';
import block_ironConfig from './blocks/IRON/config.json';
import block_ironScript from './blocks/IRON';
import block_saplingConfig from './blocks/SAPLING/config.json';
import block_saplingScript from './blocks/SAPLING';
import item_brickConfig from './items/brick/config.json';
import item_brickScript from './items/brick';
import item_coalConfig from './items/coal/config.json';
import item_coalScript from './items/coal';
import item_copperConfig from './items/copper/config.json';
import item_copperScript from './items/copper';
import item_copperpickConfig from './items/copperPick/config.json';
import item_copperpickScript from './items/copperPick';
import item_crystalConfig from './items/crystal/config.json';
import item_crystalScript from './items/crystal';
import item_dirtConfig from './items/dirt/config.json';
import item_dirtScript from './items/dirt';
import item_goldConfig from './items/gold/config.json';
import item_goldScript from './items/gold';
import item_gravelConfig from './items/gravel/config.json';
import item_gravelScript from './items/gravel';
import item_lanternConfig from './items/lantern/config.json';
import item_lanternScript from './items/lantern';
import item_pickaxeConfig from './items/pickaxe/config.json';
import item_pickaxeScript from './items/pickaxe';
import item_plankConfig from './items/plank/config.json';
import item_plankScript from './items/plank';
import item_sandConfig from './items/sand/config.json';
import item_sandScript from './items/sand';
import item_stoneConfig from './items/stone/config.json';
import item_stoneScript from './items/stone';
import item_torchConfig from './items/torch/config.json';
import item_torchScript from './items/torch';
import item_woodConfig from './items/wood/config.json';
import item_woodScript from './items/wood';
import item_workbenchConfig from './items/workbench/config.json';
import item_workbenchScript from './items/workbench';
import item_ironConfig from './items/iron/config.json';
import item_ironScript from './items/iron';
import item_stonePickConfig from './items/stonePick/config.json';
import item_stonePickScript from './items/stonePick';
import item_ironPickConfig from './items/ironPick/config.json';
import item_ironPickScript from './items/ironPick';
import item_saplingConfig from './items/sapling/config.json';
import item_saplingScript from './items/sapling';

const blocks = {
  FARMLAND: { config: { ...block_dirtConfig, id: 22, name: 'Solo preparado', color: '#63462c' }, script: block_dirtScript },
  WHEAT_SHOOT: { config: { ...block_saplingConfig, id: 23, name: 'Trigo jovem', drop: 'wheatSeed' }, script: block_saplingScript },
  RIPE_WHEAT: { config: { ...block_saplingConfig, id: 24, name: 'Trigo maduro', drop: 'wheat' }, script: {
    ...block_saplingScript, placed: { render(c: CanvasRenderingContext2D) {
      for (const x of [5, 11, 17]) { c.fillStyle = '#ad863c'; c.fillRect(x, 6, 2, 18);
        c.fillStyle = '#e5be61'; c.fillRect(x - 2, 3, 5, 9); }
    } } } },
  "AIR": { config: block_airConfig, script: block_airScript },
  "BEDROCK": { config: block_bedrockConfig, script: block_bedrockScript },
  "BRICK": { config: block_brickConfig, script: block_brickScript },
  "COAL": { config: block_coalConfig, script: block_coalScript },
  "COPPER": { config: block_copperConfig, script: block_copperScript },
  "CRYSTAL": { config: block_crystalConfig, script: block_crystalScript },
  "DEEP": { config: block_deepConfig, script: block_deepScript },
  "DIRT": { config: block_dirtConfig, script: block_dirtScript },
  "GOLD": { config: block_goldConfig, script: block_goldScript },
  "GRASS": { config: block_grassConfig, script: block_grassScript },
  "GRAVEL": { config: block_gravelConfig, script: block_gravelScript },
  "LEAF": { config: block_leafConfig, script: block_leafScript },
  "PLANK": { config: block_plankConfig, script: block_plankScript },
  "SAND": { config: block_sandConfig, script: block_sandScript },
  "STONE": { config: block_stoneConfig, script: block_stoneScript },
  "TORCH": { config: block_torchConfig, script: block_torchScript },
  "WOOD": { config: block_woodConfig, script: block_woodScript },
  "WORKBENCH": { config: block_workbenchConfig, script: block_workbenchScript },
  "WATER": { config: block_waterConfig, script: block_waterScript },
  "LAVA": { config: block_lavaConfig, script: block_lavaScript },
  "IRON": { config: block_ironConfig, script: block_ironScript },
  "SAPLING": { config: block_saplingConfig, script: block_saplingScript },
} as const;

for (const [key, asset] of Object.entries(blocks)) {
  Object.assign(asset, { config: { ...asset.config, ...permeabilityFor(key, asset.config) } });
}
export const modularBlocks = immutable(blocks);

export const modularItems = immutable({
  wheatSeed: { config: { ...item_saplingConfig, name: 'Sementes de trigo', block: 'WHEAT_SHOOT' }, script: item_saplingScript },
  bucket: { config: { name: 'Balde vazio', kind: 'item', unique: false, color: '#9aabba' }, script: item_saplingScript },
  waterBucket: { config: { name: 'Balde com água', kind: 'item', unique: false, color: '#488cd6' }, script: item_saplingScript },
  "brick": { config: item_brickConfig, script: item_brickScript },
  "coal": { config: item_coalConfig, script: item_coalScript },
  "copper": { config: item_copperConfig, script: item_copperScript },
  "copperPick": { config: item_copperpickConfig, script: item_copperpickScript },
  "crystal": { config: item_crystalConfig, script: item_crystalScript },
  "dirt": { config: item_dirtConfig, script: item_dirtScript },
  "gold": { config: item_goldConfig, script: item_goldScript },
  "gravel": { config: item_gravelConfig, script: item_gravelScript },
  "lantern": { config: item_lanternConfig, script: item_lanternScript },
  "pickaxe": { config: item_pickaxeConfig, script: item_pickaxeScript },
  "plank": { config: item_plankConfig, script: item_plankScript },
  "sand": { config: item_sandConfig, script: item_sandScript },
  "stone": { config: item_stoneConfig, script: item_stoneScript },
  "torch": { config: item_torchConfig, script: item_torchScript },
  "wood": { config: item_woodConfig, script: item_woodScript },
  "workbench": { config: item_workbenchConfig, script: item_workbenchScript },
  "leather": { config: item_leatherConfig, script: item_leatherScript },
  "beef": { config: item_beefConfig, script: item_beefScript },
  "slime": { config: item_slimeConfig, script: item_slimeScript },
  "raw_meat": { config: item_raw_meatConfig, script: item_raw_meatScript },
  "wheat": { config: item_wheatConfig, script: item_wheatScript },
  "cooked_beef": { config: item_cooked_beefConfig, script: item_cooked_beefScript },
  "sword": { config: item_swordConfig, script: item_swordScript },
  "crystalPick": { config: item_crystalpickConfig, script: item_crystalpickScript },
  "iron": { config: item_ironConfig, script: item_ironScript },
  "stonePick": { config: item_stonePickConfig, script: item_stonePickScript },
  "ironPick": { config: item_ironPickConfig, script: item_ironPickScript },
  "sapling": { config: item_saplingConfig, script: item_saplingScript },
  "leatherHelmet": { config: item_leatherHelmetConfig, script: item_leatherHelmetScript },
  "leatherChestplate": { config: item_leatherChestplateConfig, script: item_leatherChestplateScript },
  "leatherLeggings": { config: item_leatherLeggingsConfig, script: item_leatherLeggingsScript },
  "leatherBoots": { config: item_leatherBootsConfig, script: item_leatherBootsScript },
} as const);

import { ecologicalEntities } from './entities/ecology';

export const modularEntities = immutable({
  ...ecologicalEntities,
  slime: { config: entitySlimeConfig, script: entitySlime },
  cow: { config: entityCowConfig, script: entityCow },
  wolf: { config: entityWolfConfig, script: entityWolf },
} as const);
