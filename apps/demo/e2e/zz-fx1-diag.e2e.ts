// TEMPORARY FX-1 diagnostic (removed before review): what the Ventilator view's cockpit receives, and when, after a
// speed change and after "Return here". Prints `FX1 …` lines; never fails on the measured values.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const BUSY = Number(process.env.FX1_BUSY ?? 0);

async function instrument(page: Page): Promise<void> {
  if (BUSY) await page.addInitScript((b) => { setInterval(() => { const e = performance.now() + b; while (performance.now() < e); }, 50); }, BUSY);
  if (process.env.FX1_IFR_RAF_MS) await page.addInitScript((ms) => ((window as Any).__fx1IfrRafMs = ms), Number(process.env.FX1_IFR_RAF_MS));
  await page.addInitScript(() => {
    const w = window as Any;
    const top0 = (() => { try { return window.top as Any; } catch { return null; } })();
    const T0 = (top0 && top0.__fx1T0) || Date.now();
    w.__fx1T0 = T0;
    w.__fx1 = w.__fx1 || [];
    const L = (s: string) => { const root = (window.top as Any) ?? w; (root.__fx1 = root.__fx1 || []).push(`${Date.now() - T0} [${window === window.top ? 'top' : 'ifr'} ${location.pathname.split('/').pop()}] ${s}`); };
    w.__fx1L = L;
    const c = (w.__fx1c = { msgs: {} as Record<string, number>, lastClock: -1, lastTime: '', raf: 0, gapMax: 0, lastRaf: 0 });
    const count = (d: Any, via: string) => {
      if (!d || typeof d.kind !== 'string') return;
      c.msgs[d.kind] = (c.msgs[d.kind] ?? 0) + 1;
      if (d.kind === 'clock') c.lastClock = d.ventTick;
      if (d.kind === 'time' || d.kind === 'control') { c.lastTime = JSON.stringify(d); L(`recv(${via}) ${JSON.stringify(d)}`); }
    };
    const BC = window.BroadcastChannel;
    window.BroadcastChannel = class extends BC {
      constructor(n: string) {
        super(n);
        L(`BroadcastChannel ${n}`);
        this.addEventListener('message', (e: MessageEvent) => count(e.data, 'bc'));
      }
    } as Any;
    addEventListener('message', (e: MessageEvent) => { if (e.data && typeof e.data.ch === 'string') count(e.data.m, 'win'); });
    if (window !== window.top) w.__pmeVentRx = new Proxy({} as Record<string, (m: unknown) => void>, { set: (t, k, v) => ((t[k as string] = (m: unknown) => (count(m, 'rx'), v(m))), true) });
    const raf0 = window.requestAnimationFrame.bind(window);
    const slow = Number((window as Any).__fx1IfrRafMs ?? 0);
    const raf = window !== window.top && slow ? (cb: FrameRequestCallback) => setTimeout(() => raf0(cb), slow) as unknown as number : raf0;
    window.requestAnimationFrame = (cb) => raf((ts) => { c.raf++; const n = performance.now(); if (c.lastRaf) c.gapMax = Math.max(c.gapMax, n - c.lastRaf); c.lastRaf = n; cb(ts); });
    addEventListener('load', () => L('load'));
    document.addEventListener('visibilitychange', () => L(`visibility ${document.visibilityState}`));
    L('document start');
  });
}

const flush = async (page: Page, tag: string) => console.log((await page.evaluate(() => (window as Any).__fx1 as string[])).map((l) => `FX1 ${tag} ${l}`).join('\n'));
const cockpit = (page: Page) => page.frames().find((fr) => fr.url().includes('vent-hamilton'));

for (let rep = 0; rep < 2; rep++) {
  test(`FX1 diag speed ${rep}`, async ({ page }) => {
    test.setTimeout(60_000);
    await instrument(page);
    await openApp(page, base, '#/vent', { warmMs: 1000 });
    await page.evaluate(() => {
      const w = window as Any;
      const s = w.__pmeApp.session;
      const orig = s.setTimeScale.bind(s);
      s.setTimeScale = (k: number) => { w.__fx1L(`session.setTimeScale ${k}`); orig(k); };
    });
    await page.frameLocator('iframe.vent').locator('body').waitFor();
    const scale = async () => (await cockpit(page)?.evaluate(() => (window as Any).__vent?.scale).catch(() => undefined)) as number | undefined;
    let t = Date.now();
    while (Date.now() - t < 10_000 && (await scale()) !== 1) await page.waitForTimeout(100);
    await page.evaluate(() => (window as Any).__fx1L('test: scale 1 seen; -> #/teach'));
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
    await page.evaluate(() => (window as Any).__fx1L('test: clicked ×4'));
    t = Date.now();
    let got: number | undefined;
    while (Date.now() - t < 8_000 && (got = await scale()) !== 4) await page.waitForTimeout(100);
    const ms = Date.now() - t;
    const c = await cockpit(page)?.evaluate(() => ({ c: (window as Any).__fx1c, vis: document.visibilityState, simT: (window as Any).__vent?.simT() }));
    const sess = await page.evaluate(() => ({ ts: (window as Any).__pmeApp.session.timeScale, frames: document.querySelectorAll('iframe').length, src: document.querySelector('iframe.vent')?.getAttribute('src') }));
    console.log(`FX1 SPEED rep=${rep} result=${got === 4 ? 'ok' : 'MISS'} scale=${got} after=${ms}ms session=${JSON.stringify(sess)} cockpit=${JSON.stringify(c)}`);
    await flush(page, `speed${rep}`);
    // S12-F1 / FU-11 H6: does the hidden cockpit keep driving the patient? (age of its last frame at the engine, ms)
    const ages: number[] = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000);
      ages.push(await page.evaluate(() => {
        const w = window as Any;
        const cw = (document.querySelector('iframe.vent') as HTMLIFrameElement).contentWindow as Any;
        return `${Math.round(performance.now() - w.__pmeApp.session.ventFrameAt)}ms raf=${cw.__fx1c.raf} vsim=${cw.__vent.simT().toFixed(2)} clk=${cw.__fx1c.lastClock} sim=${w.__pmeApp.session.simNow().toFixed(1)} vis=${cw.document.visibilityState}`;
      }) as unknown as number);
    }
    console.log(`FX1 HIDDEN rep=${rep} ${JSON.stringify(ages)}`);
    expect(got, 'the cockpit took the speed change').toBe(4);
  });
}

for (let rep = 0; rep < 0; rep++) {
  test(`FX1 diag restore ${rep}`, async ({ page }) => {
    test.setTimeout(240_000);
    await instrument(page);
    await openApp(page, base, '?scenario=showcase-bronchospasm', { warmMs: 1500 });
    await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
    await page.evaluate(() => (location.hash = '#/vent'));
    const t0 = Date.now();
    let prevRaf = 0;
    let prevCmdsAt = 0;
    const sample = async (tag: string) => {
      const m = await page.evaluate(() => {
        const w = window as Any;
        const s = w.__pmeApp.session;
        const tile = (x: string) => Number(document.querySelector(`.pme-stile[data-param="${x}"] [data-pme="v"]`)?.textContent);
        return { sim: +s.simNow().toFixed(1), ts: s.timeScale, ventAge: Math.round(performance.now() - s.ventFrameAt), co2: tile('CO2'), spo2: tile('SpO2'), route: location.hash };
      });
      const v = await cockpit(page)?.evaluate(() => { const w = window as Any; return { vsim: +w.__vent.simT().toFixed(1), scale: w.__vent.scale, paused: w.__vent.paused, raf: w.__fx1c.raf, gap: Math.round(w.__fx1c.gapMax), clock: w.__fx1c.lastClock, msgs: w.__fx1c.msgs }; }).catch((e) => ({ err: String(e).slice(0, 80) }));
      const raf = (v as Any)?.raf ?? 0;
      console.log(`FX1 RESTORE rep=${rep} ${tag} wall=${((Date.now() - t0) / 1000).toFixed(1)} ${JSON.stringify(m)} cockpit=${JSON.stringify(v)} rafΔ=${raf - prevRaf} cmdsΔ=${((v as Any)?.msgs?.cmds ?? 0) - prevCmdsAt}`);
      prevRaf = raf;
      prevCmdsAt = (v as Any)?.msgs?.cmds ?? 0;
      return m;
    };
    const simNow = () => page.evaluate(() => (window as Any).__pmeApp.session.simNow() as number);
    const until = async (t: number) => { while ((await simNow()) < t) { await page.waitForTimeout(2000); await sample(`→${t}`); } };
    await until(40);
    const b = Math.ceil(await simNow());
    await page.evaluate(() => (window as Any).__pmeApp.link.send({ type: 'scenario', action: 'bookmark', target: 'vent' }));
    await sample(`bookmark b=${b}`);
    await until(b + 70);
    await page.evaluate(() => (window as Any).__pmeApp.link.send({ type: 'scenario', action: 'restoreBookmark', target: 'vent' }));
    const tr = Date.now();
    for (let i = 0; i < 10; i++) { await page.waitForTimeout(300); await sample(`restore+${Date.now() - tr}ms`); }
    await until(b + 70);
    await flush(page, `restore${rep}`).catch(() => {});
  });
}

// The exact fu11-vent-restore flow, with an in-page recorder (no extra round trips): every 500 ms of wall time the
// session's sim time, the age of the cockpit's last frame at the engine, the cockpit's own time and clock, and the tiles.
const W2 = (p: Page) => p.evaluate(() => (window as Any).__pmeApp.session.simNow() as number);
const tile2 = (p: Page, param: string) => p.evaluate((x) => Number(document.querySelector(`.pme-stile[data-param="${x}"] [data-pme="v"]`)?.textContent), param);
for (let rep = 0; rep < 6; rep++) {
  test(`FX1 diag exact restore ${rep}`, async ({ page }) => {
    test.setTimeout(180_000);
    await instrument(page);
    await openApp(page, base, '?scenario=showcase-bronchospasm', { warmMs: 1500 });
    await page.evaluate(() => {
      const w = window as Any;
      const s = w.__pmeApp.session;
      const t0 = performance.now();
      w.__rec = [] as string[];
      let last = '';
      setInterval(() => {
        const tile = (x: string) => document.querySelector(`.pme-stile[data-param="${x}"] [data-pme="v"]`)?.textContent ?? '-';
        const cw = (document.querySelector('iframe.vent') as HTMLIFrameElement | null)?.contentWindow as Any;
        const v = cw?.__vent;
        const c = cw?.__fx1c;
        const row = `${((performance.now() - t0) / 1000).toFixed(1)} sim=${s.simNow().toFixed(1)} age=${Math.round(performance.now() - s.ventFrameAt)} vsim=${v ? v.simT().toFixed(1) : '-'} clk=${c?.lastClock ?? '-'} raf=${c?.raf ?? '-'} co2=${tile('CO2')} spo2=${tile('SpO2')} ${location.hash}`;
        if (row !== last) w.__rec.push(row);
        last = row;
      }, 500);
      s.onMount(() => w.__rec.push('mount'));
    });
    const at = async (t: number) => {
      while ((await W2(page)) < t) await page.waitForTimeout(250);
      return { spo2: await tile2(page, 'SpO2'), co2: await tile2(page, 'CO2') };
    };
    const ventilating = async () => {
      let run = 0;
      const t = Date.now();
      while (run < 2 && Date.now() - t < 60_000) { run = (await tile2(page, 'CO2')) > 20 ? run + 1 : 0; await page.waitForTimeout(250); }
      return W2(page);
    };
    const mark = (m: string) => page.evaluate((x) => (window as Any).__rec.push(`>> ${x}`), m);
    // stream the recorder every 5 s, so a run that ends in a page crash still shows what came before it
    let sent = 0;
    const stream = setInterval(() => void page.evaluate((n) => ((window as Any).__rec as string[]).slice(n), sent).then((rows) => {
      sent += rows.length;
      if (rows.length) console.log(rows.map((l) => `FX1 EXACT rep=${rep} | ${l}`).join('\n'));
    }, () => {}), 5000);
    page.on('crash', () => console.log(`FX1 EXACT rep=${rep} PAGE CRASH`));
    page.on('close', () => console.log(`FX1 EXACT rep=${rep} PAGE CLOSE`));
    await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
    await page.evaluate(() => (location.hash = '#/vent'));
    await at(30);
    const b = Math.ceil(await ventilating());
    await at(b);
    await page.evaluate(() => (window as Any).__pmeApp.link.send({ type: 'scenario', action: 'bookmark', target: 'vent' }));
    await mark(`bookmark b=${b}`);
    const first = [await at(b + 40), await at(b + 70)];
    await page.evaluate(() => (window as Any).__pmeApp.link.send({ type: 'scenario', action: 'restoreBookmark', target: 'vent' }));
    await mark('restore');
    const v2 = await ventilating();
    await mark(`ventilating again at ${v2.toFixed(1)}`);
    const again = [await at(b + 40), await at(b + 70)];
    let ok = true;
    for (let i = 0; i < 2; i++) ok &&= Math.abs((again[i]?.spo2 ?? 0) - (first[i]?.spo2 ?? 0)) <= 3 && Math.abs((again[i]?.co2 ?? 0) - (first[i]?.co2 ?? 0)) <= 4;
    console.log(`FX1 EXACT rep=${rep} ok=${ok} ${JSON.stringify({ b, first, again, v2 })}`);
    clearInterval(stream);
    expect(ok, 'replay within the bands').toBe(true);
  });
}
