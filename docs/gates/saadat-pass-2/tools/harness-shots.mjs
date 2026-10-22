// Deterministic monitor shots for the Saadat pass 2 evidence: the renderer mounted alone (worker off, engine seed 1)
// under Playwright's fake clock, so two trees can be compared pixel for pixel.
// usage: node harness-shots.mjs <worktree> <outDir> <engine chromium|webkit> <spec...>
//   spec = skin@WxH[@portrait][@runMs]
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const [wt, out, engine, ...specs] = process.argv.slice(2);
const req = createRequire(join(resolve(wt), 'package.json'));
const { createServer } = await import(req.resolve('vite'));
const pwm = await import(req.resolve("@playwright/test"));
const pw = pwm.chromium ? pwm : pwm.default;
mkdirSync(out, { recursive: true });
const demo = join(resolve(wt), 'apps/demo');
const harness = join(demo, 'zz-p2-harness.html');
copyFileSync(new URL('./zz-p2-harness.html', import.meta.url), harness);
const vite = await createServer({ root: demo, configFile: join(demo, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await vite.listen();
const port = vite.httpServer.address().port;
let browser;
try {
  browser = await pw[engine].launch();
  for (const spec of specs) {
    const [skin, wh, ...rest] = spec.split('@');
    const [w, h] = wh.split('x').map(Number);
    const portrait = rest.includes('portrait');
    const photo = rest.includes('photo');
    const runMs = Number(rest.find((r) => /^\d+$/.test(r)) ?? 20000);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-10-22T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-22T10:00:01Z')); // no time flows but what runFor gives
    await page.goto(`http://127.0.0.1:${port}/zz-p2-harness.html?skin=${skin}${portrait ? '&portrait=1' : ''}`);
    await page.waitForFunction(() => '__h' in window, null, { polling: 100 });
    if (photo) console.log(JSON.stringify(await page.evaluate(() => window.__h.photo().then((rs) => rs.filter((r) => !r.accepted)))));
    // let the module graph settle, then run the fake clock: rAF, timers and Date advance together
    for (let k = 0; k < runMs / 500; k++) await page.clock.runFor(500);
    const name = `${skin}-${engine}-${w}x${h}${portrait ? '-portrait' : ''}${photo ? '-photo' : ''}.png`;
    await page.screenshot({ path: join(out, name) });
    console.log('shot', name);
    await ctx.close();
  }
} finally {
  await browser?.close();
  await vite.close();
  rmSync(harness, { force: true });
}
