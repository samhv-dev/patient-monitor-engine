// R56: every visible string in a clinical view comes from the glossary or the copy pass. This walks every view, every
// instructor tab, every Explore section and a Remote document (its join form and every tab) and fails on any raw
// engine id in the text, aria-labels, titles or placeholders (the monitor interior, iframes, Explore's collapsed
// "Model internals", Developer and titles that quote the monitor's own alarm text are exempt).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { EXPLORE, go, openApp, scanEngineIds, startVite, TABS, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const STATE_VARS = ['hr', 'sbp', 'dbp', 'cvp', 'papSys', 'papDia', 'pawp', 'spo2', 'etco2', 'fio2', 'tempCore', 'volumeStatus', 'paceThresholdMa', 'svr', 'qtc'];

test('no engine id reaches a clinical view', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 4000 });
  // camelCase or digit-bearing ids only: a lowercase drug id is also the drug's English name ("propofol")
  const engineIds = await page.evaluate(() => (window as unknown as { __pmeApp: { engineIds: string[] } }).__pmeApp.engineIds);
  const IDS = [...STATE_VARS, ...engineIds].filter((id) => /[A-Z0-9]/.test(id) || STATE_VARS.includes(id));
  const hits: string[] = [];
  const scan = async (where: string) => hits.push(...(await scanEngineIds(page, IDS)).map((h) => `${where} → ${h}`));
  for (const t of TABS) {
    await tab(page, t);
    await scan(`#/teach ${t}`);
  }
  for (const s of EXPLORE) {
    await go(page, `#/explore/${s}`, 900);
    await scan(`#/explore/${s}`);
  }
  for (const r of ['#/', '#/monitor', '#/remote', '#/settings', '#/validate', '#/vent']) {
    await go(page, r);
    await scan(r);
  }
  // a Remote document (R50 review F10): the join form, then every tab of a remote joined by code
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const join = await page.context().newPage();
  await join.goto(`${base}/#/remote`);
  await join.waitForFunction(() => '__pmeApp' in window);
  hits.push(...(await scanEngineIds(join, IDS)).map((h) => `remote join form → ${h}`));
  await join.close();
  // pair the way an instructor does: the host shows its Remote view (its code) while the remote joins
  await go(page, '#/remote');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`host: ${e.message}`));
  page.on('crash', () => errors.push('host: page crashed'));
  const remote = await page.context().newPage();
  remote.on('pageerror', (e) => errors.push(`remote: ${e.message}`));
  remote.on('crash', () => errors.push('remote: page crashed'));
  await remote.goto(`${base}/#/remote?code=${code}`);
  try {
    await expect(remote.locator('.status-pill')).toContainText('Connected', { timeout: 20_000 });
  } catch (err) {
    // CI WebKit (2-vCPU runner) failed here repeatedly while macOS WebKit passes: name what each side saw
    const host = await page.evaluate(() => {
      const a = (window as unknown as { __pmeApp: { session: { diag: unknown; host: { stats: unknown }; simNow(): number } } }).__pmeApp.session;
      return JSON.stringify({ simNow: a.simNow(), received: a.diag, stats: a.host.stats, hidden: document.hidden });
    }).catch((e: Error) => `host unreachable: ${e.message}`);
    const rem = await remote.evaluate(() => {
      const r = (window as unknown as { __pmeRemote?: { diag: { sent: number; received: unknown; transport(): string } } }).__pmeRemote;
      return JSON.stringify(r ? { sent: r.diag.sent, received: r.diag.received, transport: r.diag.transport(), hidden: document.hidden } : 'no remote hook');
    }).catch((e: Error) => `remote unreachable: ${e.message}`);
    console.log(`[remote-join] host ${host}\n[remote-join] remote ${rem}\n[remote-join] errors ${JSON.stringify(errors)}`);
    throw err;
  }
  for (const t of TABS) {
    await tab(remote, t);
    hits.push(...(await scanEngineIds(remote, IDS)).map((h) => `remote ${t} → ${h}`));
  }
  expect(hits).toEqual([]);
});
