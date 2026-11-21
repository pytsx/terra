import { clamp, noise1 } from '../shared/math';

export function rainIntensity(elapsed: number, seed: number, undergroundDepth: number) {
  if (undergroundDepth > 4) return 0;
  const weather = noise1(elapsed / 75, seed ^ 0x72a91);
  const exposure = clamp(1 - Math.max(0, undergroundDepth) / 5, 0, 1);
  return clamp((weather - 0.57) / 0.16, 0, 1) * exposure;
}
