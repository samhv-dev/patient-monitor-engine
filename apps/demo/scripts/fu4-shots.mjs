// FU-4 gate screenshots (plan Task 23; headless system Chrome, like stage7e-shots.mjs). Usage:
//   (cd apps/demo && npx vite --port 4818 --strictPort &) then node apps/demo/scripts/fu4-shots.mjs http://localhost:4818 docs/gates/fu-4
// Every scenario runs at ×4 to its teaching moment; PNGs must be ≤ 60 KB (taken at deviceScaleFactor 0.6).
import { mkdirSync, statSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4818', out = 'docs/gates/fu-4', onlyArg] = process.argv.slice(2);
const only = onlyArg ? new Set(onlyArg.split(',')) : null; // optional: re-take only these scenarios (1…7)
const want = (k) => only === null || only.has(k);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
// deviceScaleFactor 0.6 (the stage7f-shots precedent): at 1.0 the first shots were 83–88 KB, at 0.7 62 KB (> 60 KB)
// FU-8 (G-FU8A-1): SHOT_SCALE re-takes a shot that lands over 60 KB at a smaller scale (default 0.6, unchanged)
const ctx = await b.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: Number(process.env.SHOT_SCALE ?? 0.6) });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('crash', () => console.error('PAGE CRASHED'));
b.on('disconnected', () => console.error('BROWSER DISCONNECTED'));
await p.goto(`${base}/fu4.html`);
await p.waitForFunction(() => window.__pmeFu4?.ready === true);
const simT = () => p.evaluate(() => window.__pmeFu4.simT());
const st = () => p.evaluate(() => window.__pmeFu4.state());
const waitSim = (t) => p.waitForFunction((t) => window.__pmeFu4.simT() >= t, t, { timeout: 3_600_000, polling: 500 });
const waitPulseless = (maxT) => p.waitForFunction((m) => window.__pmeFu4.state().pulseless || window.__pmeFu4.simT() >= m, maxT, { timeout: 3_600_000, polling: 500 });
const waitPulse = (maxT) => p.waitForFunction((m) => !window.__pmeFu4.state().pulseless || window.__pmeFu4.simT() >= m, maxT, { timeout: 3_600_000, polling: 500 });
async function shot(name) {
  const path = `${out}/${name}.png`;
  await p.screenshot({ path, type: 'png' });
  const kb = statSync(path).size / 1024;
  console.log(name, `t=${(await simT()).toFixed(0)} s`, JSON.stringify(await st()), `${kb.toFixed(0)} KB`);
  return kb;
}
async function start(id) {
  await p.click(`#${id}`);
  await p.waitForTimeout(500);
}
if (want('1')) { await start('induction'); await waitSim(300 + 180); await shot('1-induction-3min'); }
if (want('2')) { await start('tamponade'); await waitPulseless(18 * 60); await p.waitForTimeout(1500); await shot('2-ali-tamponade-pea'); }
if (want('3')) {
  await start('bleed'); await waitPulseless(25 * 60); const tA = await simT(); await waitSim(tA + 60); await shot('3a-classIV-pea');
  await p.click('#resus'); await waitPulse(tA + 60 + 600); await waitSim((await simT()) + 20); await shot('3b-classIV-rosc');
}
if (want('4')) { await start('ptx'); await waitPulseless(20 * 60); await p.waitForTimeout(1500); await shot('4-tension-ptx-pea'); }
// FU-8 (Task G, E-FU8-8; I-08): the sine-wave shot waits to +215 s after the sux — 10 s before the measured VF at +225 s,
// when K has passed 8.5 and the ECG is a sine wave (at +200 s it still showed sinus at MAP 90)
if (want('5')) { await start('burns'); await waitSim(300 + 215); await shot('5a-burns-sux-sine'); await waitPulseless(20 * 60); await waitSim((await simT()) + 10); await shot('5b-burns-sux-vf'); }
if (want('6')) { await start('vf'); await waitSim(150); await shot('6-vf-cpr'); }
if (want('7')) { await start('pe'); await waitPulseless(25 * 60); await p.waitForTimeout(1500); await shot('7-pe-propofol-pea'); }
if (errors.length) console.error('page errors:', errors);
await b.close();
