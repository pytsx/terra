export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export function hashText(text: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function mixHash(x: number, y: number, seed: number) {
  let n = Math.imul((x | 0) ^ seed, 0x45d9f3b) ^ Math.imul(y | 0, 0x119de1f3);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
export function rand01(x: number, y: number, seed: number) {
  return mixHash(x, y, seed) / 4294967295;
}
export function noise1(x: number, seed: number) {
  let n = Math.floor(x),
    f = smooth(x - n);
  return lerp(rand01(n, 0, seed), rand01(n + 1, 0, seed), f);
}
export function noise2(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = smooth(x - ix),
    fy = smooth(y - iy);
  return lerp(
    lerp(rand01(ix, iy, seed), rand01(ix + 1, iy, seed), fx),
    lerp(rand01(ix, iy + 1, seed), rand01(ix + 1, iy + 1, seed), fx),
    fy,
  );
}
export class RNG {
  private value: number;
  constructor(seed: number) {
    this.value = seed >>> 0 || 1;
  }
  next() {
    let x = this.value;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.value = x >>> 0;
    return this.value / 4294967296;
  }
  int(min: number, max: number) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}
