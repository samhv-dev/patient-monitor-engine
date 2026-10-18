// README screenshots (Stage 8b), each ≤ 60 KB, from file:// pages only (no dev server): the release IIFE mounted
// with the philips-like skin, and the ventilator + monitor embed. Run after `pnpm build`, from the repo root:
//   node apps/demo/scripts/readme-shots.mjs      (system Chrome)
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const demo = resolve(import.meta.dirname, '..');
const out = resolve(demo, '../../docs/images');
mkdirSync(out, { recursive: true });
const page0 = resolve(demo, 'dist/readme-monitor.html'); // dist/ is git-ignored build output
writeFileSync(page0, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">
<div id="pm" style="height:560px"></div>
<script src="../../../packages/renderer/dist/patient-monitor.iife.js"></script>
<script>PatientMonitor.mountMonitor(document.getElementById('pm'), { skin: 'philips-like', lanes: ['ecgII', 'V5'], waves: ['abp', 'pleth', 'co2'], nibp: true,
  engine: { seed: 3, patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M', sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } } } });</script>`);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1100, height: 560 } });
const shot = async (name) => {
  const path = resolve(out, `${name}.jpg`);
  for (const quality of [70, 55, 45, 35, 25]) {
    await page.screenshot({ path, type: 'jpeg', quality });
    if (statSync(path).size <= 60_000) break;
  }
  const size = statSync(path).size;
  if (size > 60_000) throw new Error(`readme-shots: ${name}.jpg is ${size} B, over the 60 KB cap for committed images`);
  console.log(name, size, 'bytes');
};
await page.goto(pathToFileURL(page0).href);
await page.waitForTimeout(25_000); // HR, SpO2 and awRR averaging windows filled (12 s left SpO2 and awRR at "---" on this tree)
await shot('monitor-philips-like');
await page.setViewportSize({ width: 1400, height: 800 });
await page.goto(pathToFileURL(resolve(demo, 'dist/embed/ventilator-monitor.html')).href);
await page.waitForTimeout(15_000);
await shot('ventilator-embed');
await browser.close();
