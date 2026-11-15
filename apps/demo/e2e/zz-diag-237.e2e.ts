// DIAG 237 (diagnostic branch only): does a click survive the text node under the pointer being replaced between
// mousedown and mouseup?
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: Number(process.env.PME_E2E_PORT ?? 0), strictPort: !!process.env.PME_E2E_PORT, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const a = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`;
});
test.afterAll(async () => vite?.close());

for (const mode of ['none', 'sameTextContent', 'nodeData', 'replaceSpan'] as const) {
  test(`bare page: ${mode} between down and up`, async ({ page }) => {
    await page.setContent(`<button id=b style="font-size:40px;width:200px;height:100px"><span id=s>40</span></button><script>window.clicks=0;b.onclick=()=>window.clicks++</script>`);
    const box = (await page.locator('#s').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.evaluate((m) => {
      const s = document.getElementById('s')!;
      if (m === 'sameTextContent') s.textContent = '40';
      if (m === 'nodeData') (s.firstChild as Text).data = '40';
      if (m === 'replaceSpan') { const n = document.createElement('span'); n.id = 's'; n.textContent = '40'; s.replaceWith(n); }
    }, mode);
    await page.mouse.up();
    console.log(`D237BARE ${test.info().project.name} ${mode} clicks=${await page.evaluate(() => (window as any).clicks)}`);
  });
}

test('face: the limit key held across one repaint', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  const box = (await page.locator('[data-ctl="tag:pmax"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const n0 = await page.evaluate(() => (window as any).__d237.renders.length);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => (window as any).__d237.renders.length)).toBeGreaterThan(n0);
  await page.mouse.up();
  console.log(`D237FACE ${test.info().project.name} key=${await page.evaluate(() => (window as any).__d237.knob.pending.key)}`);
});

for (const what of ['tile', 'tileUnit', 'windowRow'] as const) {
  test(`face: ${what} held across one repaint`, async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
    await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
    if (what === 'windowRow') { await page.locator('[data-ctl="side:mode"]').click(); await expect(page.locator('.edp-win')).toBeVisible(); }
    const loc = what === 'tile' ? page.locator('[data-ctl="key:peep"] .v') : what === 'tileUnit' ? page.locator('[data-ctl="key:peep"] .u') : page.locator('.edp-win .edp-entry').nth(1).locator('.lbl');
    const box = (await loc.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const n0 = await page.evaluate(() => (window as any).__d237.renders.length);
    await page.mouse.down();
    await expect.poll(() => page.evaluate(() => (window as any).__d237.renders.length)).toBeGreaterThan(n0);
    await page.mouse.up();
    const calls = await page.evaluate(() => (window as any).__d237.log.filter((e: any) => e.call === 'press' || e.call === 'touchRow').map((e: any) => `${e.call}:${JSON.stringify(e.a)}`));
    console.log(`D237FACE ${test.info().project.name} ${what} key=${await page.evaluate(() => (window as any).__d237.knob.pending.key)} calls=${calls.join(',')}`);
  });
}
