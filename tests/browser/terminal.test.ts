import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('terminal abre com T, executa command pattern e persiste o clima', async (t) => {
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

  await page.keyboard.press('t');
  await expectVisible(page.locator('#gameTerminal'));
  assert.equal(await page.locator('#terminalInput').evaluate(node => node === document.activeElement), true);
  await page.locator('#terminalInput').fill('/weather rain');
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#terminalOutput').innerText(), /Chuva ativada/);

  await page.locator('#terminalInput').fill('/weather storm');
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#terminalOutput .error').last().innerText(), /Uso: \/weather/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#gameTerminal').isHidden(), true);
  assert.equal(await page.locator('#game').evaluate(node => node === document.activeElement), true);

  await page.keyboard.press('m');
  await page.locator('#toast').filter({ hasText: 'Modo de colocação livre.' }).waitFor();
  assert.equal(await page.locator('#menu').evaluate(node => !(node as HTMLDialogElement).open), true);

  await page.keyboard.press('p');
  await page.locator('[data-action="save"]').click();
  await page.waitForFunction(() => document.querySelector('#saveStatus')?.textContent?.includes('salvo'));
  const savedModes = await page.evaluate(() => {
    const saved = localStorage.getItem('terra-matriz-save-v4');
    return saved ? JSON.parse(saved) : undefined;
  });
  assert.equal(savedModes.weatherMode, 'rain');
  assert.equal(savedModes.placementMode, 'free');
  assert.deepEqual(errors, []);
});

async function expectVisible(locator: import('playwright').Locator) {
  await locator.waitFor({ state: 'visible' });
  assert.equal(await locator.isVisible(), true);
}
