// Gate 3 screenshots (headless system Chrome; a hidden desktop pane throttles rAF — Gate 1 lesson).
// Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//        node apps/demo/scripts/stage3-shots.mjs http://localhost:4817 docs/gates/stage-3
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-3'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 900, height: 900 } }); // small enough for ≤ 60 KB PNGs
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
// the monitor only; `full` adds the SaO2-truth-vs-displayed plot and the diagnostics line below it
async function shot(name, full = false) {
  // full: hide the controls for the shot so the plot sits under the monitor (keeps the PNG ≤ 60 KB)
  if (full) await p.evaluate(() => (document.querySelector('.controls').style.display = 'none'));
  await p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 900, height: full ? 836 : 718 } });
  if (full) await p.evaluate(() => (document.querySelector('.controls').style.display = ''));
}
const wait = (s) => p.waitForTimeout(s * 1000);
await p.goto(`${base}/stage3.html`);
await p.addStyleTag({ content: '#monitor { height: 700px; } body { margin: 8px; }' });
await wait(14);
await shot('spontaneous');
await p.selectOption('#source', 'ventilator');
await p.fill('#rr', '12');
await p.fill('#fio2', '0.5');
await p.click('#applyVent');
await wait(30);
await shot('ventilated'); // normal capnogram; compare with 'spontaneous' (ventilator vs spontaneous)
await p.selectOption('#airway', 'bronchospasm');
await wait(30);
await shot('shark-fin');
await p.selectOption('#airway', 'patent');
await p.click('#cleft');
await wait(30);
await shot('curare-cleft');
await p.click('#cleft');
await p.fill('#rr', '12');
await p.click('#applyVent');
await p.click('#rebreathe');
await wait(30);
await shot('rebreathing');
await p.click('#rebreathe');
await p.selectOption('#airway', 'oesophageal');
await wait(40);
await shot('oesophageal');
await p.selectOption('#airway', 'patent');
await p.selectOption('#co2', 'off');
await p.click('#sSpo2');
await wait(10);
await shot('sensor-off'); // CO2 line and SpO2 probe off: no trace, dashes
await p.selectOption('#co2', 'sidestream');
await p.click('#sSpo2');
await p.selectOption('#source', 'spontaneous');
await p.fill('#rr', '15');
await p.fill('#fio2', '0.21');
await p.click('#applyVent');
await wait(15);
await p.click('#story'); // preoxygenate 3 min → apnoea → rescue at SaO2 85 %, at ×4
const truthSa = async () => Number((/truth SaO2 ([0-9.]+)/.exec(await p.textContent('#diag')) ?? [0, 100])[1]);
let desat = false;
for (let i = 0; i < 1600; i++) {
  await wait(0.25);
  const d = await p.textContent('#diag');
  if (!desat && d.includes('story: apnoea') && (await truthSa()) <= 93) {
    await shot('r8-desaturating', true); // 1/3: apnoea after preoxygenation, SaO2 falling
    desat = true;
  }
  if (d.includes('story: rescue')) break;
}
await wait(2.5); // ≈ 10 s sim at ×4: the truth is rising, the displayed SpO2 is still falling (R8)
await shot('r8-still-falling', true); // 2/3
await wait(30);
await shot('r8-recovered', true); // 3/3
console.log(await p.textContent('#diag'));
await p.selectOption('#source', 'ventilator');
await p.fill('#rr', '12');
await p.fill('#fio2', '0.5');
await p.click('#applyVent');
await p.click('#mh'); // malignant hyperthermia at fixed ventilation, ×4
await wait(120);
await shot('mh', true);
console.log(await p.textContent('#diag'));
console.log('page errors:', JSON.stringify(errors));
await b.close();
