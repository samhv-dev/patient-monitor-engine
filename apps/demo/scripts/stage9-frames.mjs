// Stage 9 gate: the Stage 8a frame-interval gate with the whole app shell mounted and the instructor panel open, on the
// brief's load — the 8-lane `validation-perf` layout (`?load=perf8`, review F6) — at p95 < 25 ms (60 fps) and < 50 ms
// (30 fps). Same method as validation-perf.html: main-thread requestAnimationFrame intervals, 10 s warm-up, then a
// window. The metric is the MAIN thread's frame intervals, as in 8a: the renderer draws the sweep in its worker and
// exposes no worker frame statistics, so the site's 30 fps cap (which acts on the worker's drawing) does not show here —
// the 30 fps rows prove the shell stays inside the 30 fps budget, not that the worker drew at 30 (gate note, review F6).
// Run: node apps/demo/scripts/stage9-frames.mjs http://127.0.0.1:<port> [seconds]        four rows (1920×1080, 1280×800 × 60, 30 fps)
//      node apps/demo/scripts/stage9-frames.mjs http://127.0.0.1:<port> --soak 1200      the 20-min soak, 1920×1080 at 60 fps
// A Vite dev server on apps/demo; system Chrome with PW_SYSTEM_CHROME=1, else Playwright's bundled Chromium.
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const base = args[0];
if (!base) throw new Error('usage: stage9-frames.mjs <base url> [seconds] | --soak <seconds>');
const soakAt = args.indexOf('--soak');
const soak = soakAt > 0 ? Number(args[soakAt + 1] ?? 1200) : 0;
const secs = soak || Number(args[1] ?? 60);
const b = await chromium.launch(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' } : {});
const rows = [];
const runs = soak ? [[1920, 1080, 60]] : [[1920, 1080, 60], [1920, 1080, 30], [1280, 800, 60], [1280, 800, 30]];
for (const [w, h, fps] of runs) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.addInitScript((fps) => localStorage.setItem('pme.site', JSON.stringify({ fps })), fps);
  await p.goto(`${base}/?load=perf8#/teach`);
  await p.waitForFunction(() => '__pmeApp' in window);
  await p.evaluate(() => window.__pmeApp.teach.panel.select('vitals'));
  await p.waitForTimeout(10_000);
  await p.evaluate(() => window.__pmeApp.frames.splice(0));
  await p.waitForTimeout(secs * 1000);
  const r = await p.evaluate(() => {
    const all = [...window.__pmeApp.frames];
    const q = (arr, x) => {
      const f = [...arr].sort((a, b) => a - b);
      return +(f[Math.floor(x * (f.length - 1))] ?? 0).toFixed(1);
    };
    // the worst 60 s window (a soak must not degrade): split the intervals by their running sum
    let acc = 0;
    let win = [];
    let worst = 0;
    for (const d of all) {
      win.push(d);
      acc += d;
      if (acc >= 60_000) {
        worst = Math.max(worst, q(win, 0.95));
        win = [];
        acc = 0;
      }
    }
    return { n: all.length, p50: q(all, 0.5), p95: q(all, 0.95), p99: q(all, 0.99), max: +Math.max(...all).toFixed(1), worstMinuteP95: worst || q(all, 0.95) };
  });
  const path = await p.evaluate(() => window.__pmeApp.session.monitor.renderPath);
  const row = { load: 'perf8', viewport: `${w}×${h}`, fps, secs, path, ...r, gate: fps === 60 ? r.p95 < 25 && r.worstMinuteP95 < 25 : r.p95 < 50 && r.worstMinuteP95 < 50 };
  rows.push(row);
  console.log(JSON.stringify(row));
  await ctx.close();
}
await b.close();
if (rows.some((r) => !r.gate)) process.exitCode = 1;
