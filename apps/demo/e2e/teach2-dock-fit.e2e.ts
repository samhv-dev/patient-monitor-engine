// Brief 208 (the owner's rulings of 12 November): Instructor v2's dock at the four laptop sizes, with a learner's staging
// card (one preparation with a finding, one without) and something staged in the cache: the tools read Drug, Airway, CPR,
// Patient, Devices, Log, Labs; with no sheet and with each sheet open in turn (the Patient sheet on each of its two tabs), every
// dock control and every footer control of the open sheet is the element at its own centre, no two dock controls
// overlap, the sheet's tray row is drawn above the dock, and the Onset select shows its whole text.
// The cause of the 1280 px overlap (brief 185, prototype 207): the marks group shrank below its three buttons and slid
// under "Recognised"; the marks now keep their width and the note field gives up width first (200 px down to 96 px).
// The learner's card comes through the Link's own path for the host's `prep` news (`link.preps.apply`, as link.ts does on
// the event): the real phone-to-host path is learner-remote.e2e.ts's. PR 459's pump mismatch card (`.ip2-pm`) is not on
// main when this was written; the helper counts its buttons once it is. The dock has seven tools on the laptop (the host):
// Labs (PR 451, brief 232) is the seventh, after Log, and its sheet is measured like the others.
// PME_208_SHOTS=<folder> writes a picture of each step there for the owner.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { DOCK_SIZES, dockBlocked, dockOverlaps, sheetFootBlocked, sheetFootCount, sheetRows } from './dock-fit-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number; preps: { apply(n: unknown, t: number): void }; changed(): void } } };

/** Two learner preparations as the host's `prep` news gives them to the instructor: one with an incompatibility, one clean. */
async function learnerCard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const link = (window as unknown as W).__pmeApp.link;
    const prep = (id: string, findings: unknown[]) => ({
      news: 'made',
      prep: {
        id, by: 'bed2remote01', name: 'Bed 2', t: link.simT, actives: [{ drugId: findings.length ? 'sodiumBicarbonate' : 'ephedrine', amount: 10, unit: 'mmol', perMl: 10 / 11, rows: [] }],
        volumeMl: 11, leftMl: 11, diluent: null, container: 'syringe-pp', notice: null, givenAt: null, ready: { atS: link.simT, src: [], gap: null }, findings,
      },
    });
    link.preps.apply(prep('fit-flagged', [{ kind: 'incompatible', drugId: 'sodiumBicarbonate', against: 'admixture', other: 'epinephrine', statement: 'Precipitates when mixed (the fit check\'s own words).', src: null }]), link.simT);
    link.preps.apply(prep('fit-clean', []), link.simT);
    link.changed(); // as link.ts does after a `prep` event
  });
}

const tool = (page: Page, id: string) => page.locator(`.ip2-dock-tools button.ip2-tool[data-sheet=${id}]`);
const openSheet = () => '.ip2-sheets .ip2-sheet:not([hidden])';

for (const size of DOCK_SIZES) {
  test(`brief 208: the dock and each open sheet fit at ${size.width} × ${size.height}, with the learner's card and something staged`, async ({ page, browserName }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    await openApp(page, base, '#/teach2', { warmMs: 1500 });
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    await expect(page.locator('.ip2-dock-tools button.ip2-tool')).toHaveText(['Drug', 'Airway', 'CPR', 'Patient', 'Devices', 'Log', 'Labs']);
    // something staged: propofol into the cache from the Drug sheet
    await tool(page, 'drug').click();
    const drug = page.locator(openSheet());
    await drug.locator('[data-group="induction"]').click();
    await drug.locator('.ip2-pick[data-key="drug:propofol"]').click();
    await drug.locator('.ip2-add').click();
    await expect(page.locator('.ip2-dock .ip2-staged')).toHaveText('Staged · 1');
    await drug.locator('.ip2-sheet-close').click();
    await learnerCard(page);
    await expect(page.locator('.ip2-dock .ip2-lp-card .ip2-lp-show')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.ip2-dock .ip2-lp-clean')).toBeVisible();

    const tag = `${size.width}x${size.height}-${browserName}`;
    const dir = process.env.PME_208_SHOTS;
    const found: string[] = [];
    const check = async (where: string, sheet: boolean) => {
      await page.waitForTimeout(300); // the sheet's slide-in (180 ms) has ended
      found.push(...(await dockBlocked(page)).map((f) => `${where}: dock ${f}`));
      found.push(...(await dockOverlaps(page)).map((f) => `${where}: overlap ${f}`));
      if (sheet) {
        expect(await sheetFootCount(page), `${where}: the footer has controls`).toBeGreaterThan(0);
        found.push(...(await sheetFootBlocked(page)).map((f) => `${where}: footer ${f}`));
        const rows = await sheetRows(page);
        if (!rows.trayInView) found.push(`${where}: the tray row is not drawn above the dock (${JSON.stringify(rows)})`);
        if (rows.onsetCut) found.push(`${where}: the Onset select is cut (${rows.onsetW} px)`);
      }
      if (dir) await page.screenshot({ path: `${dir}/fit-${where.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${tag}.png` });
    };
    await check('no sheet', false);
    for (const id of ['drug', 'airway', 'defib', 'patient', 'devices', 'log', 'labs']) {
      await tool(page, id).click();
      await expect(page.locator(openSheet())).toHaveAttribute('data-sheet', id);
      await check(id, true);
      if (id === 'patient') {
        await page.locator(openSheet()).getByRole('tab', { name: 'Patient & events', exact: true }).click();
        await check('patient-events', true);
      }
    }
    // the seventh tool (ruling 3: Labs after Log, PR 451) is the real one: with six tools the marks' overlap of brief
    // 185 does not show at 1280 px
    await page.locator('.ip2-sheets .ip2-sheet:not([hidden]) .ip2-sheet-close').click();
    await check('seven tools', false);
    await tool(page, 'patient').click();
    await check('seven tools, patient', true);
    expect(found).toEqual([]);
  });
}
