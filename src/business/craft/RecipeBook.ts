import type { Materials } from '../content/Materials';
import { production } from '../../assets/production';
import { legacyMaterials } from '../content/Materials';
import { type Stack, type Slot } from '../EngineTypes';
export interface Recipe {
  station?: string;
  pattern: readonly (readonly (string | null)[])[];
  output: Stack;
  byproducts?: readonly Stack[];
}
// Remove somente margens vazias. Espaços internos e a orientação fazem parte da fórmula.
function signature(rows: readonly (readonly (string | null)[])[]) {
  let left = Infinity,
    right = -1,
    top = Infinity,
    bottom = -1;
  rows.forEach((row, y) =>
    row.forEach((id, x) => {
      if (id) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }),
  );
  if (right < 0) return '';
  return JSON.stringify(rows.slice(top, bottom + 1).map((row) => row.slice(left, right + 1)));
}
export class RecipeBook {
  private readonly patterns = new Map<string, Recipe>();
  constructor(readonly recipes: readonly Recipe[], materials: Materials = legacyMaterials) {
    for (const recipe of recipes) {
      const { pattern, output } = recipe,
        width = pattern[0]?.length ?? 0;
      const key = (recipe.station ? recipe.station + ':' : 'personal:') + signature(pattern);
      if (
        !key ||
        pattern.length > 3 ||
        width > 3 ||
        pattern.some(
          (row) =>
            row.length !== width || row.some((id) => id !== null  && !Object.hasOwn(materials.items, id)),
        ) ||
        !Object.hasOwn(materials.items, output.item) ||
        recipe.byproducts?.some(stack => !Object.hasOwn(materials.items, stack.item) || !Number.isSafeInteger(stack.amount) || stack.amount <= 0) ||
        !Number.isSafeInteger(output.amount) ||
        output.amount <= 0 ||
        this.patterns.has(key)
      )
        throw new Error('Fórmula inválida ou repetida: ' + output.item);
      this.patterns.set(key, recipe);
    }
  }
  match(slots: readonly Slot[], size: number, station: Recipe['station'] = size === 3 ? 'workbench' : undefined) {
    if (slots.length !== size * size) return undefined;
    const rows = Array.from({ length: size }, (_, y) =>
      slots.slice(y * size, (y + 1) * size).map((slot) => slot?.item ?? null),
    );
    const shape = signature(rows);
    return this.patterns.get((station ? station + ':' : 'personal:') + shape) ??
      (!station ? undefined : this.patterns.get('personal:' + shape));
  }
}
/** @deprecated Compatibility facade; simulations use RuntimeContent.recipes. */
export const recipes = new RecipeBook(production.recipes, legacyMaterials);
