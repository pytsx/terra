import { clamp } from '../shared/math';

export interface MapExtent { left: number; right: number; top: number; bottom: number }

export class MapCamera {
  centerX = 0;
  centerY = 0;
  zoom = 1;

  reset(centerX: number, centerY: number, extent: MapExtent, width: number, height: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    const fit = Math.min(width / Math.max(1, extent.right - extent.left + 1),
      height / Math.max(1, extent.bottom - extent.top + 1));
    this.zoom = clamp(fit, 0.5, 12);
    this.constrain(extent, width, height);
  }

  worldAt(screenX: number, screenY: number, width: number, height: number) {
    return {
      x: this.centerX + (screenX - width / 2) / this.zoom,
      y: this.centerY + (screenY - height / 2) / this.zoom,
    };
  }

  zoomAt(factor: number, screenX: number, screenY: number,
    width: number, height: number, extent: MapExtent) {
    const anchor = this.worldAt(screenX, screenY, width, height);
    this.zoom = clamp(this.zoom * factor, 0.35, 32);
    this.centerX = anchor.x - (screenX - width / 2) / this.zoom;
    this.centerY = anchor.y - (screenY - height / 2) / this.zoom;
    this.constrain(extent, width, height);
  }

  pan(screenDx: number, screenDy: number, width: number, height: number, extent: MapExtent) {
    this.centerX -= screenDx / this.zoom;
    this.centerY -= screenDy / this.zoom;
    this.constrain(extent, width, height);
  }

  bounds(width: number, height: number) {
    const halfWidth = width / this.zoom / 2, halfHeight = height / this.zoom / 2;
    return {
      left: this.centerX - halfWidth,
      right: this.centerX + halfWidth,
      top: this.centerY - halfHeight,
      bottom: this.centerY + halfHeight,
    };
  }

  constrain(extent: MapExtent, width: number, height: number) {
    const halfWidth = width / this.zoom / 2, halfHeight = height / this.zoom / 2;
    const middleX = (extent.left + extent.right + 1) / 2;
    const middleY = (extent.top + extent.bottom + 1) / 2;
    this.centerX = extent.right - extent.left + 1 <= halfWidth * 2
      ? middleX : clamp(this.centerX, extent.left + halfWidth, extent.right + 1 - halfWidth);
    this.centerY = extent.bottom - extent.top + 1 <= halfHeight * 2
      ? middleY : clamp(this.centerY, extent.top + halfHeight, extent.bottom + 1 - halfHeight);
  }
}
