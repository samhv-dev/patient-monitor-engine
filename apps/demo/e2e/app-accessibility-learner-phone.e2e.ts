// Accessibility, the learner remote on a phone and the Room's learner PIN (brief 219 split this out of app-accessibility.e2e.ts;
// where a new case goes: app-accessibility-support.ts).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit, expect, focusWalk, openApp, serveApp, startRelay, test } from './app-accessibility-support.ts';

let base = '';
serveApp((b) => (base = b));

// Plan learner-action-remote.md L6: the learner remote on a phone — its learner-PIN form, a wrong learner PIN, and the
// page signed in (the monitor strip, the three tabs, the connection line) — and the Room's learner PIN panel on the
// laptop and the iPad. 44 px targets on touch, names, contrast, one h1, no sideways scroll, a focus walk on the phone.
// A classroom relay on this machine (PME_E2E_RELAY_PORT + the worker's index when set, else any free port).
test("accessibility: the learner remote's PIN form and signed-in page, and the Room's learner PIN", async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'l6-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    for (const [name, vp, touch] of [['laptop', { width: 1280, height: 800 }, false], ['iPad', { width: 820, height: 1180 }, true]] as const) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
      const page = await ctx.newPage();
      await openApp(page, base, `?relay=${ws}#/room`);
      await page.waitForSelector('#room-learner .ip-peer-hold');
      const pin = await page.evaluate(() => localStorage.getItem('pme.learnerPin'));
      expect(await page.locator('#room-learner').innerText()).not.toContain(pin as string);
      found.push(...(await audit(page, { touchPanel: touch })).map((f) => `room ${name} ${f.rule}: ${f.what}`));
      await ctx.close();
    }
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-induction#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      // the light screen is the site's projector-light theme (Settings' Screen), kept on the phone as on the laptop
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      await p.waitForSelector('.ip-peer-form');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `learner form ${theme} ${f.rule}: ${f.what}`));
      const typePin = async (x: string) => {
        for (const d of x) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
        await p.locator('.ip-peer-go').click();
      };
      if (theme === 'dark') {
        found.push(...(await focusWalk(p, 16)).map((f) => `learner form focus: ${f}`));
        await typePin(pin === '1111' ? '2222' : '1111');
        await expect(p.locator('.ip-peer-error')).toHaveText(/^Wrong learner PIN/);
        found.push(...(await audit(p, { touchPanel: true })).map((f) => `learner wrong PIN ${f.rule}: ${f.what}`));
      }
      await typePin(pin);
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await expect(p.getByRole('tab')).toHaveCount(3);
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `learner signed in ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 12)).map((f) => `learner signed in focus: ${f}`));
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L7: the learner remote's Drugs tab on a phone, dark and light: the bench open on a
// product (the vial, the diluent with its groups, the volume, the container, the preview and the time), then a tray of
// two (a ready syringe and a preparing one). 44 px targets on touch, names, contrast, one h1, no sideways scroll, and a
// focus walk through the bench and the tray.
test("accessibility: the learner remote's Drugs tab with the bench open and a tray of two", async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'l7-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await p.locator('.ip-peer-go').click();
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
      // the bench open: Agilus, one vial, water
      await p.locator('.lr-search').fill('dantrolene');
      await p.locator('.lr-pick[data-drug="dantrolene"]').click();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `drugs products ${theme} ${f.rule}: ${f.what}`));
      await p.locator('.lr-product[data-product="agilus-120mg"]').click();
      await expect(p.locator('.lr-time')).toHaveText('Takes 0:50 to prepare');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `drugs bench ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 20)).map((f) => `drugs bench focus: ${f}`));
      await p.locator('.lr-stage').click();
      // a second: fentanyl 2 mL with no sourced time, ready at once (LQ7)
      await p.locator('.lr-search').fill('fentanyl');
      await p.locator('.lr-pick[data-drug="fentanyl"]').click();
      await p.locator('.lr-product[data-product="fentanyl-50mcg-ml"]').click();
      await p.locator('.lr-stage').click();
      await expect(p.locator('.lr-item')).toHaveCount(2);
      await expect(p.locator('.lr-item .lr-state[data-state="preparing"]')).toHaveCount(1, { timeout: 10_000 });
      await expect(p.locator('.lr-item .lr-state[data-state="ready"]')).toHaveCount(1);
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `drugs tray ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 30)).map((f) => `drugs tray focus: ${f}`));
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L8: the learner remote's Infusions tab on a phone, dark and light: a ready syringe to
// start (its mL/h and the dose rate beside it) over a running infusion this phone started (its rate, dose rate, "set by",
// Change and Stop) and the instructor's, started before the phone signed in. 44 px targets on touch, names, contrast, one h1, no sideways scroll, a focus walk.
test("accessibility: the learner remote's Infusions tab with a syringe to start and two running infusions", async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'l8-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    const sent = await host.evaluate(() => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }> } } }).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' } }));
    expect(sent.accepted).toBe(true);
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await p.locator('.ip-peer-go').click();
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
      // two fentanyl syringes, ready at once (LQ7): one started, one left to start
      for (let i = 0; i < 2; i++) {
        await p.locator('.lr-search').fill('fentanyl');
        await p.locator('.lr-pick[data-drug="fentanyl"]').click();
        await p.locator('.lr-product[data-product="fentanyl-50mcg-ml"]').click();
        await p.locator('.lr-stage').click();
      }
      await expect(p.locator('.lr-item .lr-state[data-state="ready"]')).toHaveCount(2, { timeout: 10_000 });
      await p.getByRole('tab', { name: 'Infusions' }).click();
      await expect(p.locator('.lr-inf-prep .lr-start')).toHaveCount(2);
      await p.locator('.lr-inf-prep .lr-start').first().click();
      await expect(p.locator('.lr-inf[data-drug="fentanyl"] .lr-setby')).toHaveText(/^set by this phone at /, { timeout: 15_000 });
      // the instructor's started before this phone signed in: the phone says so instead of naming anyone
      await expect(p.locator('.lr-inf[data-drug="remifentanil"] .lr-setby')).toHaveText('set before this phone signed in');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `infusions ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 30)).map((f) => `infusions focus: ${f}`));
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L11: the learner remote's Labs tab on a phone, dark and light: a gas pending (its expected
// time and analyser), then its result table with flagged values (the MH card), a chemistry sample still pending beside it.
// 44 px targets on touch, names, contrast, one h1, no sideways scroll, a focus walk. PME_L11_SHOTS=<dir> also saves the
// screenshots the brief asks for (the pending row, the result, a flagged value; dark and light).
test("accessibility: the learner remote's Labs tab with a pending sample and a flagged result", async ({ browser }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'l11-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const shots = process.env.PME_L11_SHOTS;
  const found: string[] = [];
  type L = { __pmeApp: { session: { code: string }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as L).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await p.locator('.ip-peer-go').click();
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await p.getByRole('tab', { name: 'Labs' }).click();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `labs empty ${theme} ${f.rule}: ${f.what}`));
      // sodium bicarbonate 200 mmol and calcium chloride 3 g on the laptop first, two minutes of the case before the draw (×8),
      // so the gas has flagged values (HCO3, BE, pH, Na) and a critical one (iCa) to show and to check for contrast; the
      // light pass draws from the same patient
      if (theme === 'dark') {
        for (const event of [{ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 200, unit: 'mmol', route: 'iv' }, { kind: 'drug', drugId: 'calciumChloride', dose: 3, unit: 'g', route: 'iv' }]) {
          expect((await host.evaluate((ev) => (window as unknown as L).__pmeApp.link.send({ type: 'applyEvent', event: ev }), event)).accepted).toBe(true);
        }
        expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
        await p.waitForTimeout(15_000);
        expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 1 }))).accepted).toBe(true);
      }
      await p.locator('.lr-lab-send[data-panel="abg"]').click();
      await expect(p.locator('.lr-lab .lr-lab-state[data-state="pending"]')).toHaveCount(1, { timeout: 10_000 });
      await p.locator('.lr-lab').first().scrollIntoViewIfNeeded();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `labs pending ${theme} ${f.rule}: ${f.what}`));
      if (shots) await p.screenshot({ path: join(shots, `labs-pending-${theme}.png`) });
      expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
      await expect(p.locator('.lr-lab .lr-lab-state[data-state="resulted"]')).toHaveCount(1, { timeout: 30_000 });
      expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 1 }))).accepted).toBe(true);
      await p.locator('.lr-lab-send[data-panel="chem"]').click();
      await expect(p.locator('.lr-lab')).toHaveCount(2, { timeout: 10_000 });
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `labs result ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 16)).map((f) => `labs focus: ${f}`));
      await expect(p.locator('.lr-lab[data-panel="abg"] tr.high').first()).toBeVisible();
      if (theme === 'dark') await expect(p.locator('.lr-lab[data-panel="abg"] tr.crit').first()).toBeVisible();
      if (shots) {
        await p.locator('.lr-lab[data-panel="abg"]').screenshot({ path: join(shots, `labs-result-${theme}.png`) });
        await p.locator('.lr-lab[data-panel="abg"] tr.crit, .lr-lab[data-panel="abg"] tr.high').last().scrollIntoViewIfNeeded();
        await p.screenshot({ path: join(shots, `labs-flagged-${theme}.png`) });
      }
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});
