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
  const remote = await page.context().newPage();
  await remote.goto(`${base}/#/remote?code=${code}`);
  await expect(remote.locator('.status-pill')).toContainText('Connected', { timeout: 10_000 });
  for (const t of TABS) {
    await tab(remote, t);
    hits.push(...(await scanEngineIds(remote, IDS)).map((h) => `remote ${t} → ${h}`));
  }
  expect(hits).toEqual([]);
});
