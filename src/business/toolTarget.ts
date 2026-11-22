import { TILE } from './EngineTypes';
import type { ActorView } from './entities/Actor';
import type { EngineEntity } from './entities/EntityRegistry';
import type { TerrainView } from './world/World';
import type { World } from './world/World';
import type { Point } from './Expedition';
import type { PlacementMode } from './commands';

type Rect = { x: number; y: number; w: number; h: number };
type Contact =
  | { kind: 'block'; tx: number; ty: number; id: number; bounds: Rect }
  | { kind: 'entity'; entity: EngineEntity; bounds: Rect };

function interval(origin: number, direction: number, min: number, max: number): [number, number] {
  if (direction === 0)
    return origin >= min && origin < max ? [-Infinity, Infinity] : [Infinity, -Infinity];
  const a = (min - origin) / direction,
    b = (max - origin) / direction;
  return a < b ? [a, b] : [b, a];
}
function entry(origin: Point, dir: Point, r: Rect) {
  const [x0, x1] = interval(origin.x, dir.x, r.x, r.x + r.w);
  const [y0, y1] = interval(origin.y, dir.y, r.y, r.y + r.h);
  const near = Math.max(0, x0, y0);
  return Math.min(x1, y1) > near ? near : Infinity;
}
// As distâncias são medidas até a primeira face atingida, inclusive para criaturas grandes.
export function traceTool(
  world: TerrainView,
  player: ActorView,
  aim: Point,
  reach: number,
  mobs: readonly EngineEntity[],
) {
  const origin = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  const dx = aim.x - origin.x,
    dy = aim.y - origin.y;
  const length = Math.hypot(dx, dy);
  const dir =
    dx * player.face >= 0 && length > 0
      ? { x: dx / length, y: dy / length }
      : { x: player.face, y: 0 };
  const end = { x: origin.x + dir.x * reach, y: origin.y + dir.y * reach };
  let hit: Contact | null = null,
    distance = reach;
  for (
    let ty = Math.floor(Math.min(origin.y, end.y) / TILE);
    ty <= Math.floor(Math.max(origin.y, end.y) / TILE);
    ty++
  ) {
    for (
      let tx = Math.floor(Math.min(origin.x, end.x) / TILE);
      tx <= Math.floor(Math.max(origin.x, end.x) / TILE);
      tx++
    ) {
      if ((!world.infinite && (tx < 0 || tx >= world.width)) || ty < 0 || ty >= world.height) continue;
      const id = world.get(tx, ty);
      if (id === world.materials.keys.AIR || id === world.materials.keys.WATER) continue;
      const bounds = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
      const d = entry(origin, dir, bounds);
      if (d <= distance) {
        distance = d;
        hit = { kind: 'block', id, tx, ty, bounds };
      }
    }
  }
  for (const entity of mobs) {
    if (entity.dead) continue;
    const bounds = entity.view();
    const d = entry(origin, dir, bounds);
    if (d < distance || (!hit && d === distance)) {
      distance = d;
      hit = { kind: 'entity', entity, bounds };
    }
  }
  return { angle: Math.atan2(dir.y, dir.x), hit };
}

export interface PlacementTrace {
  readonly angle: number;
  readonly target: { tx: number; ty: number };
  readonly reachable: boolean;
  readonly support: { tx: number; ty: number; id: number } | null;
}

/**
 * Construction always uses the cell directly below the cursor. Supporting
 * blocks only validate that cell, so a ray never redirects placement to an
 * adjacent face.
 */
export function tracePlacement(
  world: TerrainView & Pick<World, 'solid'>,
  player: ActorView,
  aim: Point,
  reach: number,
  mode: PlacementMode = 'free',
): PlacementTrace {
  const origin = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  const dx = aim.x - origin.x, dy = aim.y - origin.y;
  const length = Math.hypot(dx, dy);
  const dir = length > 0 ? { x: dx / length, y: dy / length } : { x: player.face || 1, y: 0 };
  const angle = Math.atan2(dir.y, dir.x);
  if (mode === 'approach') return traceApproachedPlacement(world, player, dir, angle, reach);
  const target = { tx: Math.floor(aim.x / TILE), ty: Math.floor(aim.y / TILE) };
  const inside = target.ty >= 0 && target.ty < world.height &&
    (world.infinite || (target.tx >= 0 && target.tx < world.width));
  let support: PlacementTrace['support'] = null;
  const faces = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
  if (inside) for (const [dx, dy] of faces) {
    const tx = target.tx + dx, ty = target.ty + dy;
    if (ty < 0 || ty >= world.height || (!world.infinite && (tx < 0 || tx >= world.width))) continue;
    if (world.solid(tx, ty)) {
      support = { tx, ty, id: world.get(tx, ty) };
      break;
    }
  }
  return { angle, target, reachable: inside && length <= reach, support };
}

function traceApproachedPlacement(
  world: TerrainView & Pick<World, 'solid'>,
  player: ActorView,
  dir: Point,
  angle: number,
  reach: number,
): PlacementTrace {
  const origin = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  const radius = Math.ceil(reach / TILE) + 1;
  const centerX = Math.floor(origin.x / TILE), centerY = Math.floor(origin.y / TILE);
  let best: { score: number; alignment: number; target: { tx: number; ty: number };
    support: NonNullable<PlacementTrace['support']> } | undefined;
  const faces = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
  for (let sy = centerY - radius; sy <= centerY + radius; sy++) {
    if (sy < 0 || sy >= world.height) continue;
    for (let sx = centerX - radius; sx <= centerX + radius; sx++) {
      if ((!world.infinite && (sx < 0 || sx >= world.width)) || !world.solid(sx, sy)) continue;
      for (const [fx, fy] of faces) {
        const tx = sx + fx, ty = sy + fy;
        if (ty < 0 || ty >= world.height || (!world.infinite && (tx < 0 || tx >= world.width))) continue;
        const block = world.get(tx, ty);
        if (block !== world.materials.keys.AIR && block !== world.materials.keys.WATER) continue;
        const x = tx * TILE, y = ty * TILE;
        if (x < player.x + player.w && x + TILE > player.x &&
          y < player.y + player.h && y + TILE > player.y) continue;
        const vx = x + TILE / 2 - origin.x, vy = y + TILE / 2 - origin.y;
        const distance = Math.hypot(vx, vy);
        if (distance > reach || vx * dir.x + vy * dir.y <= 0) continue;
        const alignment = Math.abs(vx * dir.y - vy * dir.x);
        if (alignment > TILE * 1.1) continue;
        const score = distance + alignment * 0.35;
        if (!best || score < best.score || (score === best.score && alignment < best.alignment))
          best = { score, alignment, target: { tx, ty }, support: { tx: sx, ty: sy, id: world.get(sx, sy) } };
      }
    }
  }
  if (best) return { angle, target: best.target, reachable: true, support: best.support };
  return {
    angle,
    target: {
      tx: Math.floor((origin.x + dir.x * reach) / TILE),
      ty: Math.floor((origin.y + dir.y * reach) / TILE),
    },
    reachable: false,
    support: null,
  };
}
