import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Locator } from 'playwright';
import { createServer } from 'vite';
import { Expedition } from '../../src/business/Expedition';
import { B, TILE } from '../../src/business/catalog';

async function center(cell: Locator) {
  const box = await cell.boundingBox();
  assert.ok(box);
  return [box.x + box.width / 2, box.y + box.height / 2] as const;
}

test('bancada com zoom, prévia de arrasto, recolha, cancelamento e recarga no navegador', async (t) => {
  const server = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  const address = server.httpServer!.address();
  assert.ok(address && typeof address === 'object');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const save = new Expedition('BANCADA').save(), x = -5320, y = 65;
  save.player = { ...save.player, x: x * TILE, y: (y + 1) * TILE - 30 };
  save.slots.fill(null);
  save.slots[3] = { item: 'wood', amount: 13 };
  for (let col = x - 4; col < x + 8; col++)
    for (let row = y - 2; row <= y + 1; row++)
      save.edits.push([col, row, row === y + 1 ? B.STONE : B.AIR]);
  save.edits.push([x + 1, y, B.WORKBENCH]);
  await page.addInitScript((initial) => {
    const key = 'terra-matriz-save-v4';
    if (!localStorage.getItem(key)) localStorage.setItem(key, initial);
  }, JSON.stringify(save));
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.waitForFunction(() => document.querySelector('#coordinate')?.textContent?.includes('-5320'));
  await page.keyboard.press('Equal');
  await page.waitForFunction(() => document.querySelector('#zoomLabel')?.textContent === '110%');
  const canvas = page.locator('#game');
  const target = await canvas.evaluate((node: HTMLCanvasElement) => {
    const rect = node.getBoundingClientRect();
    return {
      x: rect.width / 2 + 27 * 1.1 * rect.width / node.width,
      y: rect.height / 2 + 3 * 1.1 * rect.height / node.height,
    };
  });
  await canvas.click({ button: 'right', position: target });
  assert.equal(await page.locator('#craftSize').innerText(), '3 × 3');

  const cell = (index: number) => page.locator(`[data-cell="bag-${index}"]`);
  await cell(3).click();
  await page.mouse.move(...await center(cell(9)));
  await page.mouse.down();
  const preview = cell(9).locator('.distribution-preview');
  assert.deepEqual(await preview.locator('b').allInnerTexts(), ['13']);
  assert.ok(await preview.locator('canvas').evaluate((c: HTMLCanvasElement) =>
    c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some((byte) => byte !== 0)));
  await page.mouse.move(...await center(cell(10)), { steps: 5 });
  assert.equal(await preview.locator('b').innerText(), '6');
  assert.equal(await cell(9).getAttribute('data-item'), null);
  await page.mouse.up();
  assert.equal(await cell(9).locator('b').innerText(), '6');
  assert.equal(await page.locator('#cursorStack b').innerText(), '1');
  await cell(11).click();
  assert.equal(await cell(11).locator('b').innerText(), '1');

  await page.locator('[data-recipe="0"]').click();
  await page.locator('#craftResult').click();
  assert.equal(await cell(0).getAttribute('data-item'), 'plank');
  assert.equal(await cell(0).locator('b').innerText(), '6');

  await cell(9).click();
  await page.mouse.move(...await center(cell(13)));
  await page.mouse.down();
  await page.mouse.move(...await center(cell(14)));
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.keyboard.press('e');
  assert.equal(await cell(13).getAttribute('data-item'), null);
  assert.equal(await cell(14).getAttribute('data-item'), null);
  assert.equal(await cell(9).locator('b').innerText(), '4');
  assert.ok(await page.locator('#cursorStack').isHidden());
  await page.keyboard.press('Escape');
  assert.ok(await canvas.evaluate((node) => node === document.activeElement));
  await page.keyboard.press('p');
  await page.locator('[data-action="save"]').click();
  await page.waitForFunction(() => document.querySelector('#saveStatus')?.textContent?.includes('salvo'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#coordinate')?.textContent?.includes('-5320'));
  assert.equal(await page.locator('#hotbar [data-slot="0"] b').innerText(), '6');
  assert.deepEqual(errors, []);
});
