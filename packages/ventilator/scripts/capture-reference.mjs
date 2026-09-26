// Captures reference traces from the ORIGINAL single-file simulator (reference/ventilator-sim-hamilton.v1.9.html,
// ventilator-simulator repo commit 65d80b6) in headless Chrome: for each scenario in reference/scenarios.json the
// page's own engine is stepped by hand (its rAF loop is disabled), 50 Hz rows [Paw, Q L/s, V mL, Pmus, phase,
// displayed Paw] and the final numerics are written to test/fixtures/reference-traces.json.
// Run: node packages/ventilator/scripts/capture-reference.mjs   (needs Google Chrome; Playwright channel 'chrome')
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const pkg = resolve(import.meta.dirname, '..');
const html = pathToFileURL(resolve(pkg, 'reference/ventilator-sim-hamilton.v1.9.html')).href;
const scenarios = JSON.parse(readFileSync(resolve(pkg, 'reference/scenarios.json'), 'utf8'));
const browser = await chromium.launch({ channel: 'chrome' });
const out = { source: 'ventilator-sim-hamilton.html v1.9 (ventilator-simulator 65d80b6)', rateHz: 50, traces: [] };
for (const sc of scenarios) {
  const page = await browser.newPage();
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; }); // no free-running loop
  await page.goto(html);
  const tr = await page.evaluate(({ setup, durS }) => {
    /* global S, P, stepPhysics, resetPhysics, DT */
    // eslint-disable-next-line no-eval
    (0, eval)(setup);
    resetPhysics();
    (0, eval)('_seed = 12345');
    const ph = { insp: 0, pause: 1, exp: 2 };
    const rows = [];
    const n = Math.round(durS / DT);
    for (let i = 1; i <= n; i++) {
      stepPhysics();
      if (i % 4 === 0) rows.push([P.Paw, P.Q, P.V, P.Pmus, ph[P.phase], P.dPaw].map((x) => Math.round(x * 1000) / 1000));
    }
    const m = P.measured;
    return { settings: JSON.parse(JSON.stringify(S)), rows, measured: { PIP: m.PIP, PLAT: m.PLAT, RR: m.RR, VTE: m.VTE, MV: m.MV, autoPEEP: m.autoPEEP, Pmean: m.Pmean }, breaths: P.breathCount };
  }, sc);
  out.traces.push({ id: sc.id, durS: sc.durS, setup: sc.setup, ...tr });
  await page.close();
}
await browser.close();
mkdirSync(resolve(pkg, 'test/fixtures'), { recursive: true });
writeFileSync(resolve(pkg, 'test/fixtures/reference-traces.json'), JSON.stringify(out));
console.log(out.traces.map((t) => `${t.id}: ${t.rows.length} rows, breaths ${t.breaths}, PIP ${t.measured.PIP.toFixed(1)}, autoPEEP ${t.measured.autoPEEP.toFixed(2)}, VTE ${t.measured.VTE.toFixed(0)}`).join('\n'));
