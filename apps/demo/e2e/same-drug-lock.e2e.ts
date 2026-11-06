// The same drug is not given twice within 10 s of simulated time, from any device (the owner's ruling of 5 November
// 2026: a guard against two hands entering one event). The laptop runs the session on a relay (on Instructor v2, the
// only laptop view since retire-instructor-v1 PR 3); a second device joins
// it over the relay as a Remote (today's instructor panel alone; the host files it as the phone). The laptop gives
// atropine; 3 s of sim later the phone's Drugs tab shows the lock and its Give is refused, said on the phone; the
// laptop's run record holds the one dose only.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type W = { __pmeApp: { session: { code: string; record: { data: { rows: Array<{ text: string; dose?: { drugId: string } }> } } }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> } } };
const simT = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.link.simT);

test('the laptop gives atropine; the phone presses it 3 s later and reads the refusal; one dose in the record', async ({ page, context }) => {
  test.setTimeout(90_000);
  relay = await startRelay({ port: 0, host: '127.0.0.1' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);

  const phone = await context.newPage();
  await phone.goto(`${base}/?relay=${encodeURIComponent(ws)}#/remote?code=${code}`);
  await expect(phone.locator('.status-pill')).toHaveText(`Connected to ${code}`, { timeout: 15_000 });
  await phone.click('[role=tab][data-tab=drugs]');
  const search = phone.getByLabel('Find a drug');
  await search.fill('atropine');
  await search.press('Enter');
  await expect(phone.locator('.card.dose h4')).toHaveText('Atropine');

  // the laptop gives it (the command its Drug sheet's Give sends)
  const ok = await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'atropine', dose: 0.5, unit: 'mg', route: 'iv' } }));
  expect(ok.accepted).toBe(true);
  const t0 = await simT(page);
  // the phone's row shows the lock, counting down
  await expect(phone.locator('.card.dose .lock')).toHaveText(/^given 0:0\d ago · \d+ s left$/, { timeout: 10_000 });
  await expect.poll(() => simT(page), { timeout: 15_000, intervals: [100] }).toBeGreaterThanOrEqual(t0 + 3);

  await phone.locator('.card.dose button', { hasText: 'Give now' }).click();
  await expect(phone.locator('.toast').last()).toHaveText(/^Atropine: not given \(given [3-9] s ago from the laptop\)$/, { timeout: 10_000 });

  // nothing of the refused press reaches the debrief: the record holds one atropine dose
  const doses = await page.evaluate(() => (window as unknown as W).__pmeApp.session.record.data.rows.filter((r) => r.dose?.drugId === 'atropine').length);
  expect(doses).toBe(1);

  // after 10 s the row is live again and the phone's press is applied
  await expect.poll(() => simT(page), { timeout: 20_000, intervals: [200] }).toBeGreaterThanOrEqual(t0 + 10.5);
  await expect(phone.locator('.card.dose .lock')).toBeHidden({ timeout: 5_000 });
  await phone.locator('.card.dose button', { hasText: 'Give now' }).click();
  await expect(phone.locator('.toast').last()).not.toHaveText(/not given/, { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.record.data.rows.filter((r) => r.dose?.drugId === 'atropine').length), { timeout: 10_000 }).toBe(2);
});
