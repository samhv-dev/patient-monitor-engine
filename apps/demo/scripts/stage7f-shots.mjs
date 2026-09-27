// Gate 7f screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//   node apps/demo/scripts/stage7f-shots.mjs http://localhost:4817 docs/gates/stage-7f
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-7f'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
// deviceScaleFactor 0.6 keeps every PNG ≤ 60 KB (at 1.0 they were 92–107 KB; plan Step 5: reduce the viewport)
const p = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 0.6 });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const wait = (s) => p.waitForTimeout(s * 1000);
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1000, height: 880 } });
await p.goto(`${base}/stage7f.html`);
await wait(3);
await p.click('#induction'); // ×4: 1 sim-min = 15 s
await wait(40);
await shot('7f-induction-propofol'); // DI falling, apnoea mark, TOF 4/4
await wait(35);
await shot('7f-rocuronium-tof0'); // TOF 0/4 after rocuronium, laryngoscopy stress blunted
await wait(120);
await shot('7f-sevo-maintenance'); // ~1 MAC, DI 40–45, TOF 0, cleft-free capnogram on the ventilator
await p.click('#ptc');
await wait(8);
await shot('7f-ptc');
// sugammadex 2 mg/kg is the label dose at TOF 2 (4 mg/kg at PTC): wait for the second twitch on the page's TOF tile
// (≈ 26 sim-min after rocuronium on 7g's PK), then give it and shoot 3.5 sim-min later on the page's sim clock
await p.waitForFunction(() => /TOF count [2-4]/.test(document.getElementById('tofSub')?.textContent ?? ''), null, { timeout: 900_000, polling: 1000 });
const tRev = await p.evaluate(() => window.__simT ?? 0);
await p.click('#reverse');
await p.waitForFunction((x) => (window.__simT ?? 0) >= x, tRev + 210, { timeout: 300_000, polling: 1000 });
await shot('7f-sugammadex'); // TOFR ≥ 90 % within ~3 sim-min
await p.goto(`${base}/stage7f.html`);
await wait(3);
await p.click('#remi');
await wait(60);
await shot('7f-remifentanil-apnoea'); // RR falls then apnoea; EtCO2 trace flat; RESP flat
// Residual block: the induction script gives rocuronium at sim 180 s; extubate at least 30 sim-min after it (a faded
// TOF on 7g's PK), waiting on the page's sim clock rather than on wall time.
const untilSim = (s) => p.waitForFunction((x) => (window.__simT ?? 0) >= x, s, { timeout: 900_000, polling: 1000 });
await p.goto(`${base}/stage7f.html`);
await wait(3);
await p.click('#induction'); // TOF every 15 s, depth on, rocuronium at sim 180 s
await untilSim(180 + 30 * 60); // ≥ 30 sim-min after rocuronium (×4: ≈ 7.5 real minutes)
await p.click('#residual');
await untilSim(180 + 30 * 60 + 90);
await shot('7f-residual-block'); // faded TOF (count 1–3 on 7g's PK), weak shallow breaths, obstruction in the panel
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
