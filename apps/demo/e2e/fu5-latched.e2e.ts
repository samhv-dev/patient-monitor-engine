// FU-5: the FU-3 gate screenshot reproduced and fixed (G-FU3 ruling 7; research/10 §0 item 2). FU-3's evidence run
// (apps/demo/scripts/fu3-neuro-tiles-shots.mjs: the 7f page, the induction script, sim ≈ 460 s) showed a red,
// live-looking, audible "APNEA (RESP)" on philips-like while the ventilator breathed. After FU-5: one apnoea raised one
// "***APNEA" (the capnograph is the RR source), and once ventilation resumed it is shown LATCHED — framed, lamp off,
// silent — per the IntelliVue #H30 setting (research/05 §6 [S1] p. 135–136, [S2] p. 40); saadat-like does not latch.
// Chromium only (≈ 2 min of wall time per skin at × 4).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-5' : '../../../test-results/gate-shots/fu-5'); // FU-11 K1: evidence only on request
test.use({ viewport: { width: 1000, height: 660 }, deviceScaleFactor: 0.8 });
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

/** FU-8 (F4): the bag's start in the induction script, sim s after the click (stage7f.ts `?bvmAt=`). */
const BVM_AT = 210;
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __simT?: number }).__simT ?? 0);

for (const skin of ['philips-like', 'saadat-like']) {
  test(`FU-3 screenshot, fixed (${skin}): the induction apnoea raises one APNEA, never "APNEA (RESP)"; after ventilation it is latched and stays in the message rotation (philips-like) or cleared, per vendor`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'heavy evidence run: Chromium only (G7g rule)');
    // E-FU4-20 (FU-4 × FU-5): FU-4's propofol distribution (G10) and dead-space root (18d) delay the induction apnoea by
    // ≈ 4 s, so the capnograph's apnoea delay no longer elapsed before the script's BVM at +180 s (no APNEA at all,
    // pinned `test.fail`). FU-8 (F4, E-FU8-5): the SCENARIO's timing is the fix — the page's `?bvmAt=210` starts the bag
    // 30 s later (a 90 s apnoeic interval after propofol, rocuronium still at +180 s); the alarm rules are unchanged.
    test.setTimeout(420_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/stage7f.html?skin=${skin}&bvmAt=${BVM_AT}`);
    await expect.poll(() => simT(page), { timeout: 30_000 }).toBeGreaterThan(1);
    const tClick = await simT(page); // the script's times are relative to the click (≈ 1–5 s: later on a loaded machine)
    await page.click('#induction'); // propofol at sim +120 s (apnoea), BVM at +BVM_AT s (FU-8), ventilator at +330 s (× 4)
    const seen: Array<{ t: number; text: string; latched: string | null; lamp: string | null }> = [];
    // FU-8 (gate, E-FU8-5): one sample = ONE page read. The four values were read in four round-trips, so on a loaded
    // runner the bar's 2 s message rotation could fall between them and pair the latched APNEA's text with the next
    // (live yellow) message's `data-latched` — the gate run's first philips-like attempt read "APNEA live" up to 308 s
    // with the latched APNEA in the rotation throughout (it passed on retry)
    while ((await simT(page)) < 460) {
      seen.push(
        await page.evaluate(() => {
          const bar = document.querySelector<HTMLElement>('.pme-bar');
          return {
            t: (window as unknown as { __simT?: number }).__simT ?? 0,
            text: bar?.innerText ?? '',
            latched: bar?.getAttribute('data-latched') ?? null,
            lamp: document.querySelector('.pme-lamp')?.getAttribute('data-lamp') ?? null,
          };
        }),
      );
      await page.waitForTimeout(400);
    }
    // the gate note quotes these spans (sim s; logged before the assertions so a failing run records them too): when the APNEA was live, when latched, and the bar at the end
    const span = (f: (s: (typeof seen)[number]) => boolean) => {
      const x = seen.filter(f).map((s) => s.t);
      return x.length ? `${x[0]!.toFixed(0)}–${x[x.length - 1]!.toFixed(0)} s` : 'none';
    };
    console.log(`[fu5-latched ${skin}] click at sim ${tClick.toFixed(1)} s; APNEA live ${span((s) => /APNEA/.test(s.text) && s.latched !== 'true')}; latched ${span((s) => /APNEA/.test(s.text) && s.latched === 'true')}; bar at the end "${seen[seen.length - 1]?.text ?? ''}"`);
    expect(seen.filter((s) => /APNEA \(RESP\)/.test(s.text)).map((s) => s.t)).toEqual([]);
    expect(new Set(seen.filter((s) => /APNEA/.test(s.text)).map((s) => s.text)).size).toBeLessThanOrEqual(1);
    expect(seen.some((s) => /APNEA/.test(s.text) && s.latched !== 'true')).toBe(true); // the induction apnoea did alarm
    // once the bag breathes (from sim 180 s; the capnograph sees breaths by ≈ 186 s), an APNEA on the bar is the latched
    // one — framed, never with the red lamp; philips-like rotates every unacknowledged message every 2 s (review ruling 4,
    // [S2] IFU p. 29–30), so the latched APNEA stays in the rotation beside a live yellow ABP limit alarm until the end of
    // the run (before the fix the live yellow took the single bar from ≈ 195 s); saadat-like does not latch (live
    // ≈ 182–187 s, then nothing)
    // anchored on the click: the bag from tClick + 180 s, so "from sim 190 s" is tClick + 189 s (the executor's first run,
    // two workers on a loaded machine, failed the fixed 190 on philips-like; the same tree passed alone)
    const tBag = tClick + BVM_AT;
    const after = seen.filter((s) => s.t >= tBag + 9 && /APNEA/.test(s.text));
    if (skin === 'philips-like') {
      expect(after.length).toBeGreaterThan(0);
      expect(after.every((s) => s.latched === 'true' && s.lamp !== 'red-flash')).toBe(true);
      expect(after.some((s) => s.t >= 440)).toBe(true); // still in the rotation at the end of the run
    } else expect(after).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(out, `fu5-fu3-latched-${skin}.png`), clip: { x: 0, y: 0, width: 1000, height: 650 } });
    expect(errors).toEqual([]);
  });
}
