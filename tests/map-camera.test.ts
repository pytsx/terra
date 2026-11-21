import test from 'node:test';
import assert from 'node:assert/strict';
import { MapCamera } from '../src/render/MapCamera';

test('zoom do mapa preserva o tile que está sob o cursor', () => {
  const camera = new MapCamera();
  const extent = { left: -500, right: 500, top: -500, bottom: 500 };
  camera.reset(0, 120, extent, 800, 500);
  const cursor = { x: 450, y: 170 };
  const before = camera.worldAt(cursor.x, cursor.y, 800, 500);
  camera.zoomAt(2, cursor.x, cursor.y, 800, 500, extent);
  const after = camera.worldAt(cursor.x, cursor.y, 800, 500);
  assert.ok(Math.abs(after.x - before.x) < 0.000001);
  assert.ok(Math.abs(after.y - before.y) < 0.000001);
});

test('arrastar move a câmera do mapa e respeita a região explorada', () => {
  const camera = new MapCamera();
  const extent = { left: -100, right: 100, top: 0, bottom: 200 };
  camera.reset(0, 100, extent, 400, 300);
  camera.zoomAt(4, 200, 150, 400, 300, extent);
  const before = camera.centerX;
  camera.pan(80, 0, 400, 300, extent);
  assert.ok(camera.centerX < before);
  camera.pan(100000, 100000, 400, 300, extent);
  const bounds = camera.bounds(400, 300);
  assert.ok(bounds.left >= extent.left && bounds.top >= extent.top);
});
