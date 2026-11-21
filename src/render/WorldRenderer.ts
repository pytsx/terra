import { drawExplorer } from './ExplorerSprite';
import { Camera } from './Camera';
import { drawSky } from './Sky';
import { drawLighting } from './Lighting';
import { drawRain } from './Rain';
import { drawWater } from '../assets/blocks/WATER';
import { Atlas } from './Atlas';
import { ImpactParticles } from './ImpactParticles';

import {
  B,
  BLOCKS,
  ITEMS,
  placedTile,
  TILE,
  type Scene,
  type GameEvent,
  type Point,
} from '../business';
import { clamp, rand01, mixHash, RNG } from '../shared/math';
import { modularEntities, modularItems } from '../assets';
const crackSegments = [
  [12, 1, 10, 7],
  [10, 7, 15, 12],
  [15, 12, 12, 18],
  [12, 18, 16, 23],
  [10, 7, 4, 11],
  [15, 12, 21, 10],
  [12, 18, 7, 21],
  [15, 12, 18, 19],
  [4, 11, 2, 15],
];
export class WorldRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly miniCtx: CanvasRenderingContext2D;
  private readonly lightCanvas = document.createElement('canvas');
  private readonly lctx = this.lightCanvas.getContext('2d')!;
  private readonly cam = new Camera(960, 540);
  private get width() { return this.cam.width; }
  private get height() { return this.cam.height; }
  private scene!: Scene;
  private paused = false;
  private readonly particles = new ImpactParticles(new RNG(19));
  private impactFlash?: { x: number; y: number; life: number; block: number };
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly mini: HTMLCanvasElement,
    private readonly atlas: Atlas,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.miniCtx = mini.getContext('2d')!;
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.cam.width = Math.round(clamp((540 * rect.width) / rect.height, 320, 1600));
    this.cam.height = Math.round((this.width * rect.height) / rect.width);
    this.canvas.width = this.lightCanvas.width = this.width;
    this.canvas.height = this.lightCanvas.height = this.height;
  }
  follow(player: Scene['player'], world: Scene['world'], dt: number, zoom: number) {
    this.cam.follow({ x: player.x + player.w / 2, y: player.y + player.h / 2 }, world, zoom, dt);
  }
  reset(player: Scene['player'], world: Scene['world'], zoom: number) {
    this.particles.clear();
    this.impactFlash = undefined;
    this.follow(player, world, Infinity, zoom);
  }
  aim(pointer: Point, zoom: number) {
    return this.cam.toWorld(pointer, zoom);
  }
  effect(event: Exclude<GameEvent, { type: 'message' }>) {
    if (event.type === 'entityHit') {
      this.particles.burst(4, event.position.x, event.position.y, '#e7ccab', 0.18);
      return;
    }
    if (event.type === 'mineHit') {
      this.impactFlash = {
        x: event.position.x,
        y: event.position.y,
        life: 0.1,
        block: event.block,
      };
      this.particles.burst(7, event.position.x, event.position.y, BLOCKS[event.block].color);
      return;
    }
    this.impactFlash = { x: event.position.x, y: event.position.y, life: 0.12, block: event.block };
    this.particles.burst(10, event.position.x, event.position.y, BLOCKS[event.block].color);
  }
  animate(dt: number) {
    if (this.impactFlash) this.impactFlash.life -= dt;
    if (this.impactFlash && this.impactFlash.life <= 0) this.impactFlash = undefined;
    this.particles.step(dt);
  }
  draw(scene: Scene, paused: boolean) {
    this.scene = scene;
    this.paused = paused;
    const c = this.ctx;
    c.save();
    c.imageSmoothingEnabled = false;
    drawSky(c, this.width, this.height, this.cam, scene.elapsed);
    c.translate(this.width / 2, this.height / 2);
    c.scale(this.scene.zoom, this.scene.zoom);
    c.translate(-this.width / 2, -this.height / 2);
    const { left: viewLeft, top: viewTop, width: viewWidth, height: viewHeight } = this.cam.bounds(scene.zoom);
    const x1 = this.scene.world.infinite ? Math.floor(viewLeft / TILE) - 1 : Math.max(0, Math.floor(viewLeft / TILE) - 1);
    const x2 = this.scene.world.infinite ? Math.ceil((viewLeft + viewWidth) / TILE) + 1 : Math.min(scene.world.width - 1, Math.ceil((viewLeft + viewWidth) / TILE) + 1);
    const y1 = Math.max(0, Math.floor(viewTop / TILE) - 1);
    const y2 = Math.min(this.scene.world.height - 1, Math.ceil((viewTop + viewHeight) / TILE) + 1);
    // Paredes de fundo nas regiões abaixo da superfície.
    for (let x = x1; x <= x2; x++) {
      const px = Math.floor(x * TILE - this.cam.x);
      const surf = this.scene.world.heightAt(x);
      const bgStart = Math.floor(surf * TILE - this.cam.y);
      if (bgStart < viewTop - this.cam.y + viewHeight) {
        c.fillStyle = '#263348';
        c.fillRect(px, bgStart, TILE + 1, viewTop - this.cam.y + viewHeight - bgStart);
        if (x % 7 === 0) {
          c.fillStyle = '#2b3a4e';
          c.fillRect(px + 6, bgStart, 2, viewHeight + TILE);
        }
      }
    }
    // Tilemap desenhado apenas na janela da câmera (culling da matriz).
    const lights = [];
    const waterTiles: { x: number; y: number; level: number; surface: boolean;
      mode: 'pooled' | 'flowing' | 'dripping'; dx: number; dy: number;
      kind: 'water' | 'lava' }[] = [];
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++) {
        const id = this.scene.world.get(x, y);
        const water = scene.world.waterAt(x, y, id);
        if (!id && !water) continue;
        const sx = Math.floor(x * TILE - this.cam.x),
          sy = Math.floor(y * TILE - this.cam.y);
        if (id && id !== B.WATER) this.atlas.tile(c, id, sx, sy, mixHash(x, y, this.scene.world.h) % 4);
        if (water) {
          const capacity = BLOCKS[id].waterCapacity;
          if (capacity) {
            c.fillStyle = `rgba(24, 42, 58, ${0.4 * Math.min(1, water / capacity)})`;
            c.fillRect(sx, sy, TILE, TILE);
          } else {
            const dripping = scene.world.waterDrippingAt(x, y, id);
            const direction = scene.world.waterDirectionAt(x, y);
            const connectedBody = scene.world.waterAt(x - 1, y) > 0 ||
              scene.world.waterAt(x + 1, y) > 0;
            waterTiles.push({ x: sx, y: sy, level: water,
              surface: water < 1 || scene.world.waterAt(x, y - 1) === 0,
              mode: dripping ? 'dripping' :
                connectedBody ? 'pooled' :
                  scene.world.waterFlowingAt(x, y, id) ? 'flowing' : 'pooled',
              dx: direction.dx,
              dy: direction.dy,
              kind: scene.world.fluidKindAt(x, y, id) ?? 'water',
            });
          }
        }
        const damage = this.scene.world.damageAt(x, y);
        if (damage > 0) this.drawBlockCracks(c, sx, sy, damage);
        const block = BLOCKS[id];
        if (block.light)
          lights.push({ x: sx + 12, y: sy + (block.light.offsetY ?? 12), light: block.light });
        if (block.foliage && this.scene.world.get(x, y - 1) === B.AIR) {
          const r = rand01(x, y, this.scene.world.h);
          if (r > 0.7) {
            c.fillStyle = block.foliage;
            c.fillRect(sx + 8, sy - 6, 2, 7);
            c.fillRect(sx + 12, sy - 4, 2, 5);
            if (r > 0.93) {
              c.fillStyle = '#f2d7a2';
              c.fillRect(sx + 7, sy - 9, 6, 5);
              c.fillStyle = '#ef997b';
              c.fillRect(sx + 9, sy - 8, 2, 2);
            }
          }
        }
      }
    // Vagalumes, exploradores e inimigos acima da sombra ambiental.
    for (const s of this.scene.mobs) {
      if (s.x + s.w + TILE < viewLeft || s.x - TILE > viewLeft + viewWidth ||
        s.y + s.h + TILE < viewTop || s.y - TILE > viewTop + viewHeight) continue;
      const asset = modularEntities[String(s.kind) as keyof typeof modularEntities];
      asset?.script.render?.(c, {
        ...s,
        x: s.x - this.cam.x,
        y: s.y - this.cam.y,
      });
    }
    for (const drop of this.scene.drops) {
      if (drop.x + TILE < viewLeft || drop.x - TILE > viewLeft + viewWidth ||
        drop.y + TILE < viewTop || drop.y - TILE > viewTop + viewHeight) continue;
      const x = Math.floor(drop.x - this.cam.x),
        y = Math.floor(drop.y - this.cam.y);
      const tile = placedTile(drop.item);
      c.save();
      c.translate(x, y + Math.sin(this.scene.elapsed * 4 + drop.x) * 1.5);
      c.rotate(-0.18 + Math.sin(this.scene.elapsed * 2 + drop.y) * 0.04);
      if (tile !== undefined) this.atlas.tile(c, tile, -12, -12);
      else {
        const asset = modularItems[drop.item as keyof typeof modularItems];
        if (asset?.script.renderDropped) {
          asset.script.renderDropped(c);
        } else {
          c.fillStyle = ITEMS[drop.item].color ?? '#c7bd91';
          c.fillRect(-6, -6, 12, 12);
        }
      }
      c.restore();
    }
    this.renderPlayer(c);
    for (const tile of waterTiles)
      drawWater(c, tile.x, tile.y, TILE, tile.level, tile.surface, tile.mode);
    for (const p of this.particles.visible) {
      c.globalAlpha = clamp(p.life / p.max, 0, 1);
      c.fillStyle = p.color;
      c.fillRect(Math.floor(p.x - this.cam.x), Math.floor(p.y - this.cam.y), p.size, p.size);
    }
    if (this.impactFlash) {
      c.globalAlpha = clamp(this.impactFlash.life / 0.12, 0, 1) * 0.38;
      c.fillStyle = '#fff1c2';
      c.fillRect(
        Math.floor(this.impactFlash.x - this.cam.x - 14),
        Math.floor(this.impactFlash.y - this.cam.y - 14),
        28,
        28,
      );
    }
    c.globalAlpha = 1;
    c.restore();
    c.save();
    drawLighting(c, this.lctx, scene, this.cam, lights);
    c.translate(this.width / 2, this.height / 2);
    c.scale(scene.zoom, scene.zoom);
    c.translate(-this.width / 2, -this.height / 2);
    this.drawTarget(c);
    c.restore();
    this.drawAtmosphere(c);
    drawRain(c, this.width, this.height, scene.elapsed, scene.rain, scene.world.h);
  }
  private renderPlayer(c: CanvasRenderingContext2D) {
    const p = this.scene.player,
      x = Math.floor(p.x - this.cam.x),
      y = Math.floor(p.y - this.cam.y);
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) c.globalAlpha = 0.5;
    // Sombra no chão.
    c.fillStyle = 'rgba(12,21,30,.25)';
    c.fillRect(x - 3, y + p.h - 1, 25, 4);
    c.save();
    c.translate(x, y);
    drawExplorer(c, p, this.scene.equipment);
    c.restore();
    const swing = this.scene.swing;
    if (swing) {
      const angle = swing.angle - Math.cos(swing.phase * Math.PI * 2) * 0.48 * p.face;
      c.save();
      c.translate(x + 9, y + 18);
      c.rotate(angle);
      const heldAsset = modularItems[swing.item as keyof typeof modularItems];
      if (heldAsset && 'renderHeld' in heldAsset.script && heldAsset.script.renderHeld) {
        heldAsset.script.renderHeld(c);
      } else if (!swing.item) {
        c.fillStyle = '#e6ab78';
        c.fillRect(7, -3, 9, 6);
      } else {
        c.fillStyle = '#b4a06c';
        c.fillRect(8, -6, 14, 12);
      }
      c.restore();
    }
    c.globalAlpha = 1;
  }
  private drawBlockCracks(c: CanvasRenderingContext2D, x: number, y: number, damage: number) {
    c.save();
    c.strokeStyle = 'rgba(24,31,35,.78)';
    c.lineWidth = clamp(0.7 + damage * 1.15, 0.7, 1.85);
    c.lineCap = 'square';
    // O comprimento total das fissuras representa a fração de dano efetivamente acumulada.
    c.beginPath();
    for (let i = 0; i < crackSegments.length; i++) {
      const fraction = clamp(damage * crackSegments.length - i, 0, 1);
      if (fraction <= 0) break;
      const [ax, ay, bx, by] = crackSegments[i];
      c.moveTo(x + ax, y + ay);
      c.lineTo(x + ax + (bx - ax) * fraction, y + ay + (by - ay) * fraction);
    }
    c.stroke();
    c.restore();
  }
  private drawTarget(c: CanvasRenderingContext2D) {
    const t = this.scene.target;
    if (this.paused) return;
    if (!this.scene.swing && t.reachable && t.block === B.AIR && t.tile !== undefined) {
      c.save();
      c.globalAlpha = t.canPlace ? 0.55 : 0.22;
      this.atlas.tile(c, t.tile, t.tx * TILE - this.cam.x, t.ty * TILE - this.cam.y);
      c.restore();
    }
    const target = this.scene.toolTarget;
    if (!target) return;
    const { bounds, secondsLeft } = target;
    let label =
      secondsLeft === null
        ? target.name
        : target.name +
          ' · ' +
          (Math.ceil(secondsLeft * 10) / 10).toFixed(1).replace('.', ',') +
          ' s';
    if (typeof target.hydration === 'number' && target.hydration < 0.62) label += ' · com sede';
    if (typeof target.nutrition === 'number' && target.nutrition < 0.65) label += ' · com fome';
    const x = Math.floor(bounds.x - this.cam.x),
      y = Math.floor(bounds.y - this.cam.y);
    c.save();
    c.strokeStyle = target.kind === 'entity' ? '#faad8e' : '#f4da98';
    c.lineWidth = 1;
    c.setLineDash([4, 3]);
    c.strokeRect(x + 0.5, y + 0.5, bounds.w - 1, bounds.h - 1);
    c.setLineDash([]);
    c.font = '11px monospace';
    const width = c.measureText(label).width + 12,
      px = x + (bounds.w - width) / 2;
    c.fillStyle = 'rgba(16,23,35,.83)';
    c.fillRect(px, y - 21, width, 17);
    c.fillStyle = '#f5edda';
    c.fillText(label, px + 6, y - 9);
    c.restore();
  }
  private drawAtmosphere(c: CanvasRenderingContext2D) {
    // Borda de vinheta para dar profundidade à exploração.
    const grad = c.createRadialGradient(
      this.width * 0.5,
      this.height * 0.46,
      this.height * 0.2,
      this.width * 0.5,
      this.height * 0.46,
      this.width * 0.72,
    );
    grad.addColorStop(0, 'rgba(12,21,37,0)');
    grad.addColorStop(1, 'rgba(9,13,28,.26)');
    c.fillStyle = grad;
    c.fillRect(0, 0, this.width, this.height);
  }
  drawMinimap(scene: Scene, expanded?: HTMLCanvasElement) {
    const canvas = expanded ?? this.mini,
      ctx = expanded ? expanded.getContext('2d')! : this.miniCtx;
    const { world, player } = scene,
      explored = world.exploredBounds();
    const px = (player.x + player.w / 2) / TILE,
      py = (player.y + player.h / 2) / TILE,
      generated = explored,
      cols = expanded ? Math.max(1, generated.right - generated.left + 1) : 52,
      rows = expanded ? Math.max(1, generated.bottom - generated.top + 1) : 42;
    const left = expanded ? generated.left : world.infinite ? Math.floor(px - cols / 2) :
      clamp(Math.floor(px - cols / 2), 0, world.width - cols);
    const top = expanded ? generated.top : clamp(Math.floor(py - rows / 2), 0, world.height - rows);
    const scale = Math.min(canvas.width / cols, canvas.height / rows),
      offsetX = (canvas.width - cols * scale) / 2,
      offsetY = (canvas.height - rows * scale) / 2;
    ctx.fillStyle = '#18263c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const stride = expanded ? 1 : 2,
      columnStride = expanded ? Math.max(1, Math.ceil(cols / canvas.width)) : 1;
    for (let col = 0; col < cols; col += columnStride)
      for (let row = 0; row < rows; row += stride) {
        const id = world.mapPeek(left + col, top + row);
        if (id === undefined || id === B.AIR) continue;
        ctx.fillStyle = BLOCKS[id].color;
        ctx.fillRect(
          Math.floor(offsetX + col * scale),
          Math.floor(offsetY + row * scale),
          Math.ceil(scale * columnStride),
          Math.ceil(scale * stride),
        );
      }
    const x = Math.floor(offsetX + (px - left) * scale),
      y = Math.floor(offsetY + (py - top) * scale);
    ctx.fillStyle = '#202a2a';
    ctx.fillRect(x - 3, y - 4, 7, 9);
    ctx.fillStyle = '#fff4b6';
    ctx.fillRect(x - 2, y - 3, 5, 7);
    ctx.strokeStyle = '#e1eee8';
    ctx.strokeRect(x - 5.5, y - 6.5, 11, 13);
  }
}
