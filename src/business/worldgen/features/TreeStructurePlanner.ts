export interface FeaturePlacement { readonly x: number; readonly y: number; readonly block: number }

export class TreeStructurePlanner {
  plan(x: number, baseY: number, height: number, trunk: number, leaves: number,
    canopy: 'broadleaf' | 'conifer'): readonly FeaturePlacement[] {
    const result: FeaturePlacement[] = [];
    const occupied = new Set<string>();
    for (let level = 0; level < height; level++) {
      const y = baseY - level;
      result.push({ x, y, block: trunk });
      occupied.add(`${x},${y}`);
    }
    const top = baseY - height + 1;
    for (let dy = -2; dy <= (canopy === 'conifer' ? 5 : 2); dy++) {
      const radius = canopy === 'conifer' ? Math.floor((dy + 3) / 2) : 4 - Math.abs(dy);
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = x + dx, ty = top + dy, key = `${tx},${ty}`;
        if (!occupied.has(key)) result.push({ x: tx, y: ty, block: leaves });
      }
    }
    return result;
  }
}
