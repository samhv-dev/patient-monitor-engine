// Accessibility, the instructor's phone and the Room's instructor-side cards (brief 219 split this out of app-accessibility.e2e.ts;
// where a new case goes: app-accessibility-support.ts).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit, expect, focusWalk, openApp, serveApp, startRelay, test } from './app-accessibility-support.ts';

let base = '';
serveApp((b) => (base = b));

// Plan instructor-peer-role.md P7: the instructor phone's way in. The PIN form at a phone's size (the address the Room's
// instructor QR code carries; its relay need not answer for the form to be audited) and the Room page's instructor card
// on the laptop and the iPad (a host page that names a relay: the card shows its PIN panel and the phone's QR fold).
// Labels, 44 px targets on touch, contrast, and a focus walk through the form; the PIN is not in the Room until held.
test("accessibility: the instructor phone's PIN form and the Room's instructor card", async ({ browser }) => {
  test.setTimeout(120_000);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await phone.newPage();
  await p.goto(`${base}/?relay=ws%3A%2F%2F127.0.0.1%3A9299%2F#/remote?code=AB2CD3`);
  await p.waitForSelector('.ip-peer-form');
  const found = (await audit(p, { touchPanel: true })).map((f) => `phone form ${f.rule}: ${f.what}`);
  expect(await p.locator('.ip-peer-key').count()).toBe(12);
  await p.locator('.ip-peer-pin').focus();
  for (const d of '4729') await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await expect(p.locator('.ip-peer-pin')).toHaveValue('4729');
  await p.locator('.ip-peer-go').click();
  await expect(p.locator('.ip-peer-pin')).toHaveValue('');
  expect(p.url()).not.toContain('4729');
  found.push(...(await focusWalk(p, 16)).map((f) => `phone form focus: ${f}`));
  await phone.close();

  for (const [name, vp, touch] of [['laptop', { width: 1280, height: 800 }, false], ['iPad', { width: 820, height: 1180 }, true]] as const) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, '?relay=ws%3A%2F%2F127.0.0.1%3A9299%2F#/room');
    await page.waitForSelector('.ip-peer-room .ip-peer-hold');
    const pin = await page.evaluate(() => localStorage.getItem('pme.instructorPin'));
    expect(pin).toMatch(/^[0-9]{4}$/);
    expect(await page.locator('.ip-peer-room').innerText()).not.toContain(pin as string);
    found.push(...(await audit(page, { touchPanel: touch })).map((f) => `room ${name} ${f.rule}: ${f.what}`));
    await ctx.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L9: the learner preparations card on the laptop's dock (Instructor v2 at 1280 × 800)
// and on the instructor's phone (390 × 844, touch: 44 px targets), with a finding and its one control, in the dark and
// the light theme on the phone; names, contrast, no sideways scroll, one h1, and a focus walk that reaches the control.
test('accessibility: the learner preparations card on the laptop dock and on the instructor phone', async ({ browser }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'l9-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await hostCtx.addInitScript(() => localStorage.setItem('pme.roomLayout', JSON.stringify({ bed2remote01: { name: 'Bed 2', show: 'remote', lastSeen: Date.now() } })));
    const host = await hostCtx.newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const learnerPin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    const instructorPin = (await host.evaluate(() => localStorage.getItem('pme.instructorPin'))) as string;
    // a learner phone stages sodium bicarbonate + epinephrine in one syringe (incompatible, Stabilis)
    const lctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await lctx.addInitScript(() => localStorage.setItem('pme.device', 'bed2remote01'));
    const lp = await lctx.newPage();
    await lp.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
    for (const d of learnerPin) await lp.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
    await lp.locator('.ip-peer-go').click();
    await expect(lp.locator('.lr-bench')).toBeVisible({ timeout: 20_000 });
    const parts = [['sodium bic', 'sodiumBicarbonate', 'sodium-bicarbonate-84mg-ml', 10], ['epinephrine', 'epinephrine', 'adrenalin-1mg-ml', 1]] as const;
    for (const [n, [search, drug, product, amount]] of parts.entries()) {
      if (n > 0) await lp.locator('.lr-another').click();
      await lp.locator('.lr-search').fill(search);
      await lp.locator(`.lr-pick[data-drug="${drug}"]`).click();
      await lp.locator(`.lr-product[data-product="${product}"]`).click();
      const field = lp.locator(`.lr-drawn-row[data-product="${product}"] .stepper input`);
      await field.fill(String(amount));
      await field.dispatchEvent('change');
    }
    await lp.locator('.lr-diluent select').selectOption('');
    await lp.locator('.lr-stage').click();
    // the laptop: the card over the dock
    await expect(host.locator('.ip2-dock .ip2-lp-card .ip2-lp-show')).toBeVisible({ timeout: 15_000 });
    found.push(...(await audit(host, { touchPanel: false })).map((f) => `card laptop ${f.rule}: ${f.what}`));
    // the instructor's phone, dark then light: the card above the panel
    for (const theme of ['dark', 'light'] as const) {
      const ictx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await ictx.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const ip = await ictx.newPage();
      await ip.goto(`${base}/?relay=${ws}#/remote?code=${code}`);
      for (const d of instructorPin) await ip.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await ip.locator('.ip-peer-go').click();
      await expect(ip.locator('.ip2-lp-inline .ip2-lp-card .ip2-lp-show')).toBeVisible({ timeout: 20_000 });
      // the session bar's mode badge is empty (a button with no name) until the host's first state reaches the phone: a
      // gap that predates this card (sessionbar.ts), so the audit runs once the state has arrived
      await expect(ip.locator('.mode-badge')).not.toHaveText('', { timeout: 10_000 });
      found.push(...(await audit(ip, { touchPanel: true })).map((f) => `card phone ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(ip, 12)).map((f) => `card phone focus: ${f}`));
      await ictx.close();
    }
    await lctx.close();
    await hostCtx.close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});
