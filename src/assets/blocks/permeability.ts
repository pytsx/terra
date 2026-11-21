export function permeabilityFor(blockKey: string, block: { readonly hardness: number | null }) {
  if (block.hardness === null) return { permeability: 0, waterCapacity: 0 };
  // Solid stone is a compact rock layer. Direct contact should move only a
  // trace amount of water over many in-game days, unlike soil and gravel.
  if (blockKey === 'STONE') return { permeability: 0.00002, waterCapacity: 0.08 };
  if (blockKey === 'LEAF') return { permeability: 0.82, waterCapacity: 0.02 };
  if (blockKey === 'GRAVEL') return { permeability: 2.4, waterCapacity: 2 };
  if (blockKey === 'SAND') return { permeability: 0.65, waterCapacity: 0.35 };
  if (blockKey === 'DIRT' || blockKey === 'GRASS')
    return { permeability: blockKey === 'GRASS' ? 0.24 : 0.26, waterCapacity: 0.55 };
  if (block.hardness < 0.55)
    return { permeability: 0.14, waterCapacity: 0.22 };
  if (block.hardness < 0.77)
    return { permeability: 0.08, waterCapacity: 0.14 };
  if (block.hardness < 1)
    return {
      permeability: Math.max(0.001, 0.0024 - (block.hardness - 0.77) * 0.0015),
      waterCapacity: 0.08,
    };
  if (block.hardness < 1.12)
    return { permeability: 0.0015, waterCapacity: 0.06 };
  if (block.hardness < 1.18)
    return { permeability: 0.0008, waterCapacity: 0.03 };
  return { permeability: 0.0018, waterCapacity: 0.07 };
}
