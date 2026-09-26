// Gate 7b screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 5216 --strictPort &) then
//   node apps/demo/scripts/stage7b-shots.mjs http://localhost:5216 docs/gates/stage-7b
// The engine's time scale is 0.25–4, so the demonstrations run at ×4 and each wait below is wall seconds.
import { chromium } from '@playwright/test';

const [base = 'http://localhost:5216', out = 'docs/gates/stage-7b'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 1100 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const wait = (s) => p.waitForTimeout(s * 1000);
// monitor + lung icons + panels; the click on a demo button scrolls the page, so scroll back first (≤ 60 KB: JPEG q 45)
const shot = async (name) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 45, clip: { x: 0, y: 0, width: 1000, height: 1000 } }); };
const demo = async (name, secs) => { await p.goto(`${base}/stage7b.html`); await wait(3); await p.click(`button[data-demo="${name}"]`); await wait(secs); await shot(name); };
await p.goto(`${base}/stage7b.html`);
await wait(8);
await shot('healthy');
await demo('copd', 65); // RR 10 → 14 → 20 → 26, one sim-minute each
await demo('ards', 85); // PEEP 5 → 15 → RM 40 × 30 s → PEEP 5
await demo('olv', 140); // ≈ 8 sim-min after isolation: near the SpO2 nadir
await demo('endo', 190); // 10 min endobronchial → withdrawn → RM
await demo('absorb', 150); // ≈ 10 sim-min of FiO2 1.0 at ZEEP under GA
console.log('page errors:', errors);
await b.close();
