// Scenario builder B5 (docs/plans/scenario-builder.md §5.2), on both engines: an author opens a copy of the MH card and,
// by keyboard (a select's option chosen with Playwright's selectOption on the focused select), adds a handout question (its count read live against 92; a 93rd character refused by the validator
// with its own line and Export waiting; back to 92), times it from one of this card's phases, adds an opener and a line
// of what the case is built to show, and moves the script's entry to the second taking of Induce; reloads and finds
// every edit; exports a card whose bytes are the library card with exactly those edits. The last sections opened and
// left alone export as the card's own bytes.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const MH_FILE = readFileSync(resolve(import.meta.dirname, '../src/app/showcase/showcase-mh-v2.json'), 'utf8');
type Rec = Record<string, unknown>;
const saved = (p: Page) => expect(p.locator('.sb-save')).toHaveText(/^This browser · saved \d\d:\d\d:\d\d$/);
const label = (p: Page, l: string) => p.locator(`[aria-label="${l}"]`);
const reach = async (p: Page, l: string) => {
  await label(p, l).focus();
  await expect(label(p, l)).toBeFocused();
};
const press = async (p: Page, name: string) => {
  const b = p.getByRole('button', { name, exact: true });
  await b.focus();
  await expect(b).toBeFocused();
  await p.keyboard.press('Enter');
};
const choose = async (p: Page, l: string, value: string) => {
  await reach(p, l);
  await label(p, l).selectOption(value); // the focused select's option set directly: the engines' own select keys differ
};
const section = async (p: Page, name: RegExp) => {
  await p.locator('.sb-outline .sb-out', { hasText: name }).focus();
  await p.keyboard.press('Enter');
};
const exported = async (p: Page, name: string, info: { outputPath(n: string): string }) => {
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Export file' }).click()]);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return readFileSync(out, 'utf8');
};

test('builder B5: a handout question, an opener, a line to show and the script edited by keyboard, kept across a reload, exported', async ({ page, browserName }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/scenarios/builder');
  await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);

  // left alone: the four sections opened, the export is the library card's bytes with the copy's id
  for (const s of [/^Script/, /^Outcomes/, /^Debrief hints/, /^Handout questions/]) await section(page, s);
  await saved(page);
  const untouched = { ...(JSON.parse(MH_FILE) as Rec), id: 'showcase-mh-v2-copy' };
  expect(await exported(page, 'untouched.json', info)).toBe(`${JSON.stringify(untouched, null, 2)}\n`);

  // a handout question: counted live, refused at 93 with the validator's words, Export waiting; then 92
  await press(page, 'Add a question');
  await expect(label(page, 'Question 1: its words')).toBeFocused();
  await page.keyboard.type('x'.repeat(93));
  await expect(page.locator('[data-section="handout"] .sb-count')).toHaveText('93 of 92 characters: 1 over; the validator refuses a question longer than one handout line');
  await expect(page.locator('[data-section="handout"] .sb-refuse')).toContainText('at most 92 characters, about 90 characters — one line of the A4 handout');
  await expect(page.getByRole('button', { name: 'Export file' })).toBeDisabled();
  await page.keyboard.press('Backspace');
  await expect(page.locator('[data-section="handout"] .sb-count')).toHaveText('92 of 92 characters');
  await expect(page.locator('[data-section="handout"] .sb-refuse')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export file' })).toBeEnabled();
  await choose(page, 'Question 1: timed from: when', 'phase');
  await choose(page, 'Question 1: timed from: which phase', 'earlySigns');
  await expect(page.locator('[data-section="handout"] .sb-endrow')).toContainText('Timed from Early signs entered.');

  // the debrief hints: an opener at Dantrolene, a line to show
  await section(page, /^Debrief hints/);
  await press(page, 'Add a built-to-show line');
  await expect(label(page, 'Built to show, line 1')).toBeFocused();
  await page.keyboard.type('A rising EtCO₂ at the same ventilation.');
  await page.locator('[data-add="openers"]').focus();
  await page.keyboard.press('Enter');
  await expect(label(page, 'Opener 1: its words')).toBeFocused();
  await page.keyboard.type('How long to dantrolene?');
  await choose(page, 'Opener 1: timed from: when', 'action');
  await choose(page, 'Opener 1: timed from: which action', 'dantrolene');

  // the script: its entry moved to the second taking of Induce
  await section(page, /^Script/);
  await expect(page.locator('[data-section="script"] h2')).toHaveText('Script card-set, never graded: what the card does itself at an anchor');
  await reach(page, 'Entry 1: fires at: which taking (1 is the first)');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('2');
  await expect(page.locator('[data-section="script"] .sb-endrow')).toContainText('Fires at the 2nd taking of');
  await saved(page);

  // a reload finds every edit; the export is the expected card
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await section(page, /^Handout questions/);
  await expect(label(page, 'Question 1: its words')).toHaveValue('x'.repeat(92));
  await section(page, /^Script/);
  await expect(label(page, 'Entry 1: fires at: which taking (1 is the first)')).toHaveValue('2');
  const want = JSON.parse(JSON.stringify(untouched)) as Rec;
  (want.script as Rec[])[0]!.on = 'action:induce#2';
  want.debriefHints = {
    show: ['A rising EtCO₂ at the same ventilation.'],
    openers: [{ at: 'action:dantrolene', text: 'How long to dantrolene?' }],
    handoutQuestions: [{ at: 'phase:earlySigns', text: 'x'.repeat(92) }],
  };
  const bytes = await exported(page, 'edited.json', info);
  // debriefHints is a block the card did not have: written after the card's own blocks, its lists in the order added
  const got = JSON.parse(bytes) as Rec;
  expect(got).toEqual(want);
  expect(Object.keys(got.debriefHints as Rec)).toEqual(['handoutQuestions', 'show', 'openers']);
  await expect(page.locator('.sb-checks li').first()).toHaveText(/^The validator accepts this draft/);
  console.log(`builder-b5 ${browserName}: exported ${bytes.length} bytes, the library card with the four edits`);
});
