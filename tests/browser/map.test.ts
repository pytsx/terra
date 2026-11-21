import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('mapa ampliado navega por arraste e aplica zoom ancorado no cursor', async (t) => {
  const server = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  const address = server.httpServer!.address();
  assert.ok(address && typeof address === 'object');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.waitForSelector('#coordinate:not(:empty)');
  await page.keyboard.press('g');
  const canvas = page.locator('#worldMapCanvas');
  await canvas.waitFor({ state: 'visible' });
  await page.waitForTimeout(250);
  const box = await canvas.boundingBox();
  assert.ok(box);
  const cursor = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
  const state = async () => canvas.evaluate((node: HTMLCanvasElement) => ({
    zoom: Number(node.dataset.zoom), centerX: Number(node.dataset.centerX),
    centerY: Number(node.dataset.centerY), width: node.clientWidth, height: node.clientHeight,
  }));
  const before = await state();
  const anchorBefore = {
    x: before.centerX + (box.width * 0.5 - before.width / 2) / before.zoom,
    y: before.centerY + (box.height * 0.5 - before.height / 2) / before.zoom,
  };
  await page.mouse.move(cursor.x, cursor.y);
  await page.mouse.wheel(0, -700);
  const zoomed = await state();
  assert.ok(zoomed.zoom > before.zoom);
  const anchorAfter = {
    x: zoomed.centerX + (box.width * 0.5 - zoomed.width / 2) / zoomed.zoom,
    y: zoomed.centerY + (box.height * 0.5 - zoomed.height / 2) / zoomed.zoom,
  };
  assert.ok(Math.abs(anchorAfter.x - anchorBefore.x) < 0.2,
    JSON.stringify({ before, zoomed, anchorBefore, anchorAfter }));
  assert.ok(Math.abs(anchorAfter.y - anchorBefore.y) < 0.2,
    JSON.stringify({ before, zoomed, anchorBefore, anchorAfter }));

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const dragged = await state();
  assert.ok(dragged.centerX < zoomed.centerX);
  assert.deepEqual(errors, []);
});
