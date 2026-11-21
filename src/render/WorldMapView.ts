import type { Materials } from '../business/content/Materials';
import { TILE, type Scene } from '../business';
import { MapCamera, type MapExtent } from './MapCamera';

const MAX_MAP_SAMPLES = 120_000;

export class WorldMapView {
  private readonly context: CanvasRenderingContext2D;
  private readonly camera = new MapCamera();
  private scene?: Scene;
  private world?: Scene['world'];
  private dragging?: { pointer: number; x: number; y: number };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly zoomLabel: HTMLOutputElement,
    private readonly viewLabel: HTMLElement,
    private readonly materials: Materials,
  ) {
    this.context = canvas.getContext('2d')!;
    canvas.addEventListener('wheel', event => {
      if (!this.scene) return;
      event.preventDefault();
      const point = this.point(event.clientX, event.clientY);
      this.camera.zoomAt(Math.exp(-event.deltaY * 0.0015), point.x, point.y,
        point.width, point.height, this.extent());
      this.draw(this.scene);
    }, { passive: false });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      this.dragging = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', event => {
      if (!this.scene || this.dragging?.pointer !== event.pointerId) return;
      const rect = canvas.getBoundingClientRect();
      this.camera.pan(event.clientX - this.dragging.x, event.clientY - this.dragging.y,
        rect.width, rect.height, this.extent());
      this.dragging = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
      this.draw(this.scene);
    });
    const release = (event: PointerEvent) => {
      if (this.dragging?.pointer !== event.pointerId) return;
      this.dragging = undefined;
      canvas.classList.remove('dragging');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('dblclick', () => this.focusPlayer());
  }

  open(scene: Scene) {
    this.scene = scene;
    const rect = this.canvas.getBoundingClientRect();
    if (this.world !== scene.world) {
      this.world = scene.world;
      const player = this.playerPosition(scene);
      this.camera.reset(player.x, player.y, this.extent(), rect.width || 900, rect.height || 600);
    }
    this.draw(scene);
  }

  focusPlayer() {
    if (!this.scene) return;
    const rect = this.canvas.getBoundingClientRect();
    const player = this.playerPosition(this.scene);
    this.camera.centerX = player.x;
    this.camera.centerY = player.y;
    this.camera.constrain(this.extent(), rect.width, rect.height);
    this.draw(this.scene);
  }

  zoomBy(factor: number) {
    if (!this.scene) return;
    const rect = this.canvas.getBoundingClientRect();
    this.camera.zoomAt(factor, rect.width / 2, rect.height / 2,
      rect.width, rect.height, this.extent());
    this.draw(this.scene);
  }

  draw(scene: Scene) {
    this.scene = scene;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const c = this.context;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#18263c';
    c.fillRect(0, 0, rect.width, rect.height);
    const bounds = this.camera.bounds(rect.width, rect.height), extent = this.extent();
    const left = Math.max(extent.left, Math.floor(bounds.left) - 1);
    const right = Math.min(extent.right, Math.ceil(bounds.right) + 1);
    const top = Math.max(extent.top, Math.floor(bounds.top) - 1);
    const bottom = Math.min(extent.bottom, Math.ceil(bounds.bottom) + 1);
    const visibleCells = Math.max(1, right - left + 1) * Math.max(1, bottom - top + 1);
    const stride = Math.max(1, Math.ceil(1 / this.camera.zoom),
      Math.ceil(Math.sqrt(visibleCells / MAX_MAP_SAMPLES)));
    for (let x = left; x <= right; x += stride)
      for (let y = top; y <= bottom; y += stride) {
        const id = scene.world.mapPeek(x, y);
        if (id === undefined || id === this.materials.keys.AIR) continue;
        c.fillStyle = this.materials.blocks[id].color;
        const screen = this.screen(x, y, rect.width, rect.height);
        c.fillRect(Math.floor(screen.x), Math.floor(screen.y),
          Math.ceil(this.camera.zoom * stride), Math.ceil(this.camera.zoom * stride));
      }
    const frame = this.screen(extent.left, extent.top, rect.width, rect.height);
    c.strokeStyle = 'rgba(213,225,235,.32)';
    c.lineWidth = 1;
    c.strokeRect(frame.x + .5, frame.y + .5,
      (extent.right - extent.left + 1) * this.camera.zoom,
      (extent.bottom - extent.top + 1) * this.camera.zoom);
    const player = this.playerPosition(scene);
    const marker = this.screen(player.x, player.y, rect.width, rect.height);
    c.fillStyle = '#202a2a'; c.fillRect(marker.x - 4, marker.y - 5, 9, 11);
    c.fillStyle = '#fff4b6'; c.fillRect(marker.x - 3, marker.y - 4, 7, 9);
    c.strokeStyle = '#fff'; c.strokeRect(marker.x - 5.5, marker.y - 6.5, 12, 14);
    this.zoomLabel.value = `${Math.round(this.camera.zoom * 100)}%`;
    this.viewLabel.textContent = `Centro ${Math.floor(this.camera.centerX)} / ${Math.floor(this.camera.centerY)}`;
    this.canvas.dataset.zoom = String(this.camera.zoom);
    this.canvas.dataset.centerX = String(this.camera.centerX);
    this.canvas.dataset.centerY = String(this.camera.centerY);
  }

  private extent(): MapExtent {
    return this.scene!.world.exploredBounds();
  }
  private playerPosition(scene: Scene) {
    return { x: (scene.player.x + scene.player.w / 2) / TILE,
      y: (scene.player.y + scene.player.h / 2) / TILE };
  }
  private screen(x: number, y: number, width: number, height: number) {
    return { x: width / 2 + (x - this.camera.centerX) * this.camera.zoom,
      y: height / 2 + (y - this.camera.centerY) * this.camera.zoom };
  }
  private point(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top,
      width: rect.width, height: rect.height };
  }
}
