// FU-5 monitor-fidelity suite on the LIVE monitor (research/10 §13 items 1, 5, 6 marked 📷): the stage 4b demo page
// with the DeviceUI tiles and alarm header, per skin (philips-like, saadat-like), at time × 4. DOM assertions on the
// tiles and `.pme-bar`, plus one screenshot per state and skin for docs/gates/fu-5 (PNG ≤ 60 KB).
// Chromium only: minutes of simulated time per skin (G7g rule).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu5-fidelity.e2e.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-5' : '../../../test-results/gate-shots/fu-5'); // FU-11 K1: evidence only on request
test.use({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 0.7 }); // saadat-like's busier screen is 64–66 KB at 0.8
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Status = { type: string; t: number; active?: Array<{ id: string; latched: boolean; acked: boolean }> };
type Hook = { pm: { setTimeScale(k: number): void }; send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Status[] };
const hook = (page: Page) => page.evaluate(() => Boolean((window as unknown as { __pme4b?: { ready: boolean } }).__pme4b?.ready));
const send = (page: Page, c: Record<string, unknown>) => page.evaluate((c) => (window as unknown as { __pme4b: Hook }).__pme4b.send(c), c);
const status = (page: Page) => page.evaluate(() => {
  const ev = (window as unknown as { __pme4b: Hook }).__pme4b.events.filter((e) => e.type === 'alarmStatus');
  return ev.length ? ev[ev.length - 1]! : null;
});
const simT = async (page: Page) => (await status(page))?.t ?? -1;
const until = async (page: Page, t: number) => {
  await expect.poll(() => simT(page), { timeout: 300_000, intervals: [500] }).toBeGreaterThanOrEqual(t);
};
const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
const VENT = ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
const tile = (page: Page, p: string, k: 'v' | 's' | 'lbl') => page.locator(`.pme-stile[data-param="${p}"] [data-pme="${k}"]`);
const shot = async (page: Page, name: string) => page.locator('#monitor').screenshot({ path: resolve(out, name) });

async function open(page: Page, skin: string) {
  await page.goto(`${base}/stage4b-device.html?skin=${skin}`);
  await expect.poll(() => hook(page), { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => (window as unknown as { __pme4b: Hook }).__pme4b.pm.setTimeScale(4));
  await send(page, ev({ kind: 'airwayDevice', device: 'ett' }));
  await send(page, VENT);
  await send(page, { type: 'attachSensor', sensor: 'co2', state: 'on' });
}

for (const skin of ['philips-like', 'saadat-like']) {
  test.describe(`FU-5 fidelity on the live monitor (${skin})`, () => {
    test.skip(({ browserName }) => browserName === 'webkit', 'heavy evidence run: Chromium only (G7g rule)');

    test('suite 1 — low flow: after a 3 L bleed the SpO2 tile is never a plain number and an SpO2 INOP stands', async ({ page }) => {
      test.setTimeout(420_000);
      await open(page, skin);
      await send(page, { type: 'setMode', mode: 'modeled' });
      await until(page, 20);
      await send(page, ev({ kind: 'bleed', volumeMl: 3000, overS: 180 }));
      await until(page, 330);
      await expect(tile(page, 'SpO2', 'v')).not.toHaveText(/^\d+$/);
      expect((await status(page))?.active?.some((a) => a.id === 'spo2LowPerf' || a.id === 'spo2NonPulsatile')).toBe(true);
      await shot(page, `fu5-lowflow-${skin}.png`);
    });

    test('suite 6 — a 60 s apnoea, then the ventilator: one APNEA; philips-like keeps it LATCHED in the message rotation (framed, no red lamp) until acknowledged, saadat-like clears it', async ({ page }) => {
      test.setTimeout(300_000);
      await open(page, skin);
      await until(page, 30);
      await send(page, ev({ kind: 'ventilation', source: 'none' }));
      await until(page, 90);
      expect((await status(page))?.active?.filter((a) => a.id.startsWith('apnoea')).length).toBe(1);
      await send(page, VENT);
      await until(page, 160);
      const bar = page.locator('.pme-bar');
      // philips-like rotates every unacknowledged message every 2 s (review ruling 4, [S2] IFU p. 29–30): sample the bar
      // for 8 s (sim ≈ 32 s at × 4) and read text, latching and lamp together
      const sample = async (ms: number) => {
        const out: Array<{ text: string; latched: string | null; lamp: string | null }> = [];
        for (let w = 0; w < ms; w += 250) {
          out.push(await page.evaluate(() => ({
            text: document.querySelector('.pme-bar')?.textContent ?? '',
            latched: document.querySelector('.pme-bar')?.getAttribute('data-latched') ?? null,
            lamp: document.querySelector('.pme-lamp')?.getAttribute('data-lamp') ?? null,
          })));
          await page.waitForTimeout(250);
        }
        return out;
      };
      if (skin === 'philips-like') {
        const before = (await sample(8000)).filter((x) => /APNEA/.test(x.text));
        expect(before.length).toBeGreaterThan(0); // in the rotation
        expect(before.every((x) => x.latched === 'true' && x.lamp !== 'red-flash')).toBe(true); // latched, no red lamp
        await expect(bar).toContainText('APNEA', { timeout: 10_000 });
        await shot(page, `fu5-latched-apnoea-${skin}.png`);
        await send(page, { type: 'device', action: { device: 'alarm', action: 'ack' } });
        await page.waitForTimeout(1000);
        expect((await sample(4000)).filter((x) => /APNEA/.test(x.text))).toEqual([]);
      } else {
        await expect(bar).not.toContainText('APNEA');
        await shot(page, `fu5-latched-apnoea-${skin}.png`);
      }
    });

    test('suite 5 — ECG leads off under a red APNEA: LEADS OFF is shown in the bar; HR "-?-" (philips-like) or relabelled PR (saadat-like), never "0"', async ({ page }) => {
      test.setTimeout(300_000);
      await open(page, skin);
      await until(page, 20);
      await send(page, ev({ kind: 'ventilation', source: 'none' }));
      await until(page, 50);
      await send(page, { type: 'attachSensor', sensor: 'ecg', state: 'off' });
      await until(page, 58);
      const leads = skin === 'philips-like' ? 'ECG LEADS OFF' : 'ECG CHECK LA/RA/LL';
      await expect(page.locator('.pme-bar')).toContainText(leads, { timeout: 20_000 });
      if (skin === 'philips-like') await expect(tile(page, 'HR', 'v')).toHaveText('-?-');
      else {
        await expect(tile(page, 'HR', 'lbl')).toHaveText('PR');
        await expect(tile(page, 'HR', 'v')).toHaveText(/^\d+$/);
      }
      await expect(tile(page, 'HR', 'v')).not.toHaveText('0');
      await shot(page, `fu5-leadsoff-${skin}.png`);
    });
  });
}
