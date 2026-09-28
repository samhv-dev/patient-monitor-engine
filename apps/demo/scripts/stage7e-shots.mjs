// Gate 7e screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//   node apps/demo/scripts/stage7e-shots.mjs http://localhost:4817 docs/gates/stage-7e
// Every scenario runs at ×4 to its teaching moment (≈ 50 min wall in total).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-7e'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`${base}/stage7e.html`);
await p.waitForFunction(() => window.__pme7e?.ready === true);
const simT = () => p.evaluate(() => window.__pme7e.simT());
const endo = () => p.evaluate(() => window.__pme7e.endo());
const waitSim = (t) => p.waitForFunction((t) => window.__pme7e.simT() >= t, t, { timeout: 3_600_000, polling: 1000 });
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, type: 'png' });
async function scenario(id, simS, name) {
  await p.click(`#${id}`);
  await p.waitForTimeout(500);
  await waitSim(simS);
  await shot(name);
  console.log(name, JSON.stringify(await endo()));
}
await scenario('mh', 60 + 20 * 60, 'mh-20min'); // EtCO2 > 100, core > 38.5, HR ↑
await p.click('#dant');
await waitSim((await simT()) + 20 * 60);
await shot('mh-dantrolene-20min'); // EtCO2 falling; HR still ≈ 120 (no active cooling: the it.fails of Q-7e-5)
await scenario('hypo', 3600, 'hypothermia-60min'); // core ≈ 35.5 — above the GA vasoconstriction threshold (34.8 °C), so NOT yet constricted; Tp shown
await scenario('sepsis', 3600, 'sepsis-cold'); // cold phase: low CO/ABP, narrow PP
await scenario('gluc', 3600, 'hypoglycaemia-60min'); // HR ↑, GLU amber below 3.5 mmol/L, red below 3.0
if (errors.length) console.error('page errors:', errors);
await b.close();
