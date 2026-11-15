// Accessibility, the pump tablet (brief 219 split this out of app-accessibility.e2e.ts; where a new case goes: app-accessibility-support.ts).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit, expect, focusWalk, openApp, serveApp, startRelay, test } from './app-accessibility-support.ts';

let base = '';
serveApp((b) => (base = b));

// Plan pump-rack-tci.md A1: the pump tablet at a 10-inch tablet's landscape size (§5: 1280 px), dark and light, with
// the 44 px touch targets: the learner-PIN form, then the rack with A2's channel controls. The host signs the tablet in on
// the learner PIN (C2); the instructor's own command path (E1's `pump` event) loads a syringe and a drip channel, to audit
// the rack as the tablet draws it, with one flow open.
test('accessibility: the pump tablet\'s PIN form and its rack of syringe and drip channels at a tablet size', async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'a1-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  type HostW = { __pmeApp: { session: { code: string }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-induction#/teach2`, { warmMs: 1500, site: { schema: 'pme-site/1', pumpRack: ['syringe', 'drip', 'syringe', 'syringe'] } });
    const code = await host.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    const send = (event: Record<string, unknown>) => host.evaluate((e) => (window as unknown as HostW).__pmeApp.link.send({ type: 'applyEvent', event: e }), { kind: 'pump', ...event });
    for (const e of [
      { action: 'load', ch: 1, channel: 'syringe', contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 }, volumeMl: 50 }, syringeMl: 50 },
      { action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
      { action: 'rate', ch: 1, rate: 20, unit: 'mL/h' },
      { action: 'start', ch: 1 },
      { action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, volumeMl: 250 } },
      { action: 'program', ch: 2, drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, set: 20 },
      { action: 'rate', ch: 2, rate: 30, unit: 'drops/min' },
      { action: 'start', ch: 2 },
    ]) await expect.poll(async () => (await send(e)).accepted, { message: JSON.stringify(e), timeout: 10_000, intervals: [200] }).toBe(true); // each once the one before has applied
    for (const theme of ['dark', 'light'] as const) {
      const tablet = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
      if (theme === 'light') await tablet.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await tablet.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/pump`);
      await p.waitForSelector('.ip-peer-form');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `pump form ${theme} ${f.rule}: ${f.what}`));
      const typePin = async (x: string) => {
        for (const d of x) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
        await p.locator('.ip-peer-go').click();
      };
      // (the wrong-PIN state is mobile-learner.e2e.ts's; its words are pump/page.dom.test.ts's)
      if (theme === 'dark') found.push(...(await focusWalk(p, 16)).map((f) => `pump form focus: ${f}`));
      await typePin(pin); // the host grants it (C2)
      await expect(p.locator('.pump-face')).toHaveCount(4);
      await expect(p.locator('.pump-face[data-ch="2"]')).toHaveAttribute('data-state', 'running', { timeout: 20_000 });
      await expect(p.locator('.pump-face[data-ch="1"]')).toHaveAttribute('data-state', 'running', { timeout: 20_000 });
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `pump rack ${theme} ${f.rule}: ${f.what}`));
      // A2: a flow's form open on a face (TCI, the longest: the set, the mode, the target and the patient)
      await p.locator('.pump-face[data-ch="1"] .pf-btn[data-flow="tci"]').click();
      await expect(p.locator('.pump-face[data-ch="1"] .pf-flow[data-flow="tci"]')).toBeVisible();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `pump TCI form ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 12)).map((f) => `pump rack focus: ${f}`));
      await tablet.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});
