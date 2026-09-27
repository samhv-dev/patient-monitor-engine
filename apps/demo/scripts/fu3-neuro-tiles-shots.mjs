// FU-3 item 11 (R-7f-6) screenshots: the renderer's own NMT and BFA tiles on philips-like and saadat-like, on the 7f
// demo page after the induction script's rocuronium (TOF 0/4, PTC shown) with the depth monitor on. Headless system
// Chrome. Usage: (cd apps/demo && npx vite --port 4818 --strictPort &) then
//   node apps/demo/scripts/fu3-neuro-tiles-shots.mjs http://localhost:4818 docs/gates/fu-3
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4818', out = 'docs/gates/fu-3'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const skin of ['philips-like', 'saadat-like']) {
  const p = await b.newPage({ viewport: { width: 1000, height: 660 }, deviceScaleFactor: 0.8 });
  p.on('pageerror', (e) => errors.push(`${skin}: ${e}`));
  const untilSim = (s) => p.waitForFunction((x) => (window.__simT ?? 0) >= x, s, { timeout: 600_000, polling: 500 });
  const tile = (param) => p.locator(`.pme-stile[data-param="${param}"]`);
  await p.goto(`${base}/stage7f.html?skin=${skin}`);
  await p.waitForTimeout(2000);
  await p.click('#induction'); // TOF every 15 s + depth on at once; rocuronium at sim 180 s (×4)
  await untilSim(420); // 4 sim-min after rocuronium: TOF 0/4, the laryngoscopy stimulus over
  await p.click('#ptc'); // the PTC result is reported 23 s after the command
  await untilSim(460);
  await p.waitForFunction(() => /PTC/.test(document.querySelector('.pme-stile[data-param="NMT"] [data-pme="s"]')?.textContent ?? ''), null, { timeout: 60_000, polling: 500 });
  const nmt = await tile('NMT').innerText();
  const bfa = await tile('BFA').innerText();
  console.log(skin, JSON.stringify({ simT: await p.evaluate(() => window.__simT), nmt, bfa }));
  await p.evaluate(() => window.scrollTo(0, 0)); // the button clicks scrolled the page
  await p.screenshot({ path: `${out}/fu3-neuro-tiles-${skin}.png`, clip: { x: 0, y: 0, width: 1000, height: 650 } });
  await p.close();
}
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
