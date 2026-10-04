// FU-7 gate screenshots (plan Task 20 Step 2; Chromium only). Usage:
//   (cd apps/demo && npx vite --port 4819 --strictPort &) then node apps/demo/scripts/fu7-shots.mjs http://localhost:4819 docs/gates/fu-7
// PW_SYSTEM_CHROME=1 uses the installed Google Chrome (the fu4-shots precedent); otherwise Playwright's bundled Chromium.
// One PNG per panel, viewport 1280 × 640 at deviceScaleFactor 0.7; each must be ≤ 60 KB (SHOT_SCALE re-takes smaller).
import { mkdirSync, statSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4819', out = 'docs/gates/fu-7'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: Number(process.env.SHOT_SCALE ?? 0.7) });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`${base}/fu7.html`);
await p.waitForFunction(() => window.__pme7?.done === true || window.__pme7?.error, null, { timeout: 3_600_000, polling: 1000 });
const err = await p.evaluate(() => window.__pme7.error);
if (err) throw new Error(err);
const names = { p1: '1-onset', p2: '2-potency-thiopental', p3: '3-beta-blockade', p4: '4-surge-and-shock' };
// a panel over 60 KB is re-taken at deviceScaleFactor 0.6 (the FU-4 / FU-8 G-FU8A-1 precedent; no quantiser on the
// machine), on a second page that reuses the first page's finished canvases, and the fact is printed for the gate note
let small = null;
for (const [id, name] of Object.entries(names)) {
  const path = `${out}/${name}.png`;
  await p.locator(`#${id}`).screenshot({ path, type: 'png' });
  let kb = statSync(path).size / 1024;
  if (kb > 60) {
    if (!small) {
      const c2 = await b.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 0.6 });
      small = await c2.newPage();
      await small.setContent(await p.content());
      await small.evaluate((imgs) => imgs.forEach(([pid, url]) => { const c = document.querySelector(`#${pid} canvas`); const g = c.getContext('2d'); const im = new Image(); im.onload = () => g.drawImage(im, 0, 0); im.src = url; }),
        await p.evaluate(() => [...document.querySelectorAll('.panel')].map((el) => [el.id, el.querySelector('canvas').toDataURL()])));
      await small.waitForTimeout(500);
    }
    await small.locator(`#${id}`).screenshot({ path, type: 'png' });
    console.log(name, `${kb.toFixed(1)} KB at 0.7 → re-taken at 0.6`);
    kb = statSync(path).size / 1024;
  }
  console.log(name, `${kb.toFixed(1)} KB`, kb <= 60 ? 'ok' : 'OVER 60 KB');
}
if (errors.length) console.error('page errors:', errors);
await b.close();
