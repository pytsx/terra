import workbench from './stations/workbench.json';
import mill from './stations/mill.json';
import oven from './stations/oven.json';
import processes from './processing-recipes.json';
import recipes from './recipes.json';
import fuels from './fuels.json';
import { packs } from './packs/generated';
import { immutable } from './immutable';
import type { StationDefinition } from '../business/stations/StationTypes';

export const production = {
  stations: [...[workbench, mill, oven] as StationDefinition[], ...packs.flatMap(p => p.stations ?? [])],
  processes: [...processes, ...packs.flatMap(p => p.processes ?? [])],
  recipes: [...recipes, ...packs.flatMap(p => p.recipes ?? [])],
  fuels: [...fuels, ...packs.flatMap(p => p.fuels ?? [])],
};
immutable(production);
