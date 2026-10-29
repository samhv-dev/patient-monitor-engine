// @vitest-environment happy-dom
// The Drug sheet against today's Drugs & fluids tab on one fake Link (plan IP7): Give sends exactly what `drugsTab`'s
// Give sends (a bolus, an infusion, a fluid), with the same toast; a pinned card step presses the step exactly as
// `pressStep` does (answer 10's uncontested half); and the INTERIM rule for a typed dose that differs from the pinned
// step's: two buttons, "Give the card's step (2.5 mg/kg)" = pressStep and "Give <dose> off the card" = today's bolus,
// with "the card's dose is 2.5 mg/kg", and Enter never picks between them.
import { ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClinicalLogEntry, Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { drugsTab } from '../panel/drugs.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { Staging } from '../staging.ts';
import { Cache } from './cache.ts';
import { drugSheet, pinnedGiveRule, pinnedSteps } from './drug-sheet.ts';
import { pressStep } from './press.ts';
import { sheetFrame } from './sheet.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);

function rig(stateId = 'treating') {
  const sv = new ScenarioView();
  sv.doc = MH;
  sv.docVersion = 1;
  sv.stateId = stateId;
  const sent: CommandInput[] = [];
  const log: ClinicalLogEntry[] = [];
  const send = async (c: CommandInput) => (sent.push(structuredClone(c)), OK);
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 0, send, state: null, hostPaused: false },
    host: null, simT: 0, log,
    send: async (c: CommandInput, kind = 'instructor') => (log.push({ simT: 0, kind: kind as ClinicalLogEntry['kind'], text: 'sent' }), send(c)),
    note: (text: string, kind = 'note') => void log.push({ simT: 0, kind: kind as ClinicalLogEntry['kind'], text }),
  } as unknown as Link;
  // today's tab
  const pctx = { link, staging: new Staging('t', (c) => link.send(c)), site: {}, weightKg: () => 70, onRefresh: () => undefined, goTab: () => undefined } as unknown as PanelCtx;
  const today = drugsTab(pctx);
  // the sheet
  const frame = sheetFrame({ id: 'drug', name: 'Drug', hint: '', onClose: () => undefined });
  const cache = new Cache(link);
  const sheet = drugSheet(frame, { link, weightKg: () => 70, cache });
  frame.open();
  sheet.refresh();
  document.body.append(today, frame.el);
  const reset = () => (sent.splice(0), log.splice(0), document.querySelectorAll('.toast').forEach((t) => t.remove()));
  const group = (id: string) => frame.el.querySelector<HTMLButtonElement>(`[data-group="${id}"]`)?.click();
  /** The item's button, from the All group unless it is a pinned card step (always at the top). */
  const pick = (key: string) => {
    if (!key.startsWith('step:')) group('all');
    return frame.left.querySelector<HTMLButtonElement>(`.ip2-pick[data-key="${key}"]`) as HTMLButtonElement;
  };
  const gives = () => [...frame.primary.querySelectorAll<HTMLButtonElement>('.ip2-give')];
  const dose = () => frame.right.querySelector<HTMLInputElement>('.ip2-stepper input') as HTMLInputElement;
  const typeDose = (v: string) => {
    dose().value = v;
    dose().dispatchEvent(new Event('input'));
  };
  // today's tab: find, pick the first match, press a preset, press Give now / Start infusion / the fluid's Give
  const todayGive = async (q: string, preset?: string) => {
    const inp = today.querySelector<HTMLInputElement>('input[type=search]') as HTMLInputElement;
    inp.value = q;
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    if (preset) [...today.querySelectorAll<HTMLButtonElement>('.card.dose .chips button')].find((b) => b.textContent === preset)?.click();
    [...today.querySelectorAll<HTMLButtonElement>('.card.dose button')].find((b) => b.textContent === 'Give now' || b.textContent === 'Start infusion')?.click();
    await settle();
  };
  return { sv, link, sent, log, today, frame, sheet, cache, reset, group, pick, gives, dose, typeDose, todayGive };
}

beforeEach(() => document.body.replaceChildren());

/** What a press did: the commands, the log lines and the toasts. */
const after = async (r: ReturnType<typeof rig>, act: () => unknown) => {
  r.reset();
  await act();
  await settle();
  return { sent: structuredClone(r.sent), log: structuredClone(r.log), toasts: toasts() };
};

describe('Drug sheet: Give is today\'s Give', () => {
  it('a bolus (propofol 1 mg/kg, the first preset): the same command, log and toast as drugsTab', async () => {
    const r = rig();
    const today = await after(r, () => r.todayGive('propofol'));
    r.pick('drug:propofol').click();
    expect(r.gives().map((b) => b.textContent)).toEqual(['Give propofol 1 mg/kg now']);
    const ours = await after(r, () => r.gives()[0]?.click());
    expect(ours).toEqual(today);
    expect(ours.sent).toEqual([{ type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' } }]);
  });

  it('a bolus at another preset and an infusion: the same commands as drugsTab', async () => {
    const r = rig();
    const today = await after(r, () => r.todayGive('rocuronium', '1.2 mg/kg'));
    r.pick('drug:rocuronium').click();
    [...r.frame.right.querySelectorAll<HTMLButtonElement>('.ip2-preset')].find((b) => b.textContent === '1.2 mg/kg')?.click();
    expect((await after(r, () => r.gives()[0]?.click())).sent).toEqual(today.sent);

    const todayInf = await after(r, () => r.todayGive('noradrenaline'));
    r.pick('drug:norepinephrine').click();
    const ours = await after(r, () => r.gives()[0]?.click());
    expect(ours).toEqual(todayInf);
    expect(r.frame.left.querySelector('[aria-label="Running infusions"]')?.textContent).toContain('running 0.05 µg/kg/min');
  });

  it('a fluid: the same command and toast as the tab\'s fluid Give (crystalloid 500 mL over 10 min)', async () => {
    const r = rig();
    const fluidGive = [...r.today.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Give') as HTMLButtonElement;
    const today = await after(r, () => fluidGive.click());
    r.group('fluids');
    (r.frame.left.querySelector('.ip2-pick[data-key="fluid:crystalloid"]') as HTMLButtonElement).click();
    const ours = await after(r, () => r.gives()[0]?.click());
    expect(ours).toEqual(today);
  });

  it('Enter (the sheet\'s give) gives now; the line on what the model will do shows only where the docs measure it', async () => {
    const r = rig();
    r.pick('drug:propofol').click();
    expect((r.frame.right.querySelector('.ip2-model') as HTMLElement).hidden).toBe(true);
    const ours = await after(r, () => r.sheet.give());
    expect(ours.sent).toHaveLength(1);
    r.pick('drug:dantrolene').click();
    expect((r.frame.right.querySelector('.ip2-model') as HTMLElement).hidden).toBe(false);
    expect(r.frame.right.querySelector('.ip2-model')?.textContent).toContain('docs/model/endocrine-thermal.md');
  });
});

describe('Drug sheet: the card\'s open steps, pinned', () => {
  it('pins every drug of the open steps in the ACTION numbering (MH treating: dantrolene 1, calcium and insulin 3, bicarbonate 4)', () => {
    const r = rig();
    expect(pinnedSteps(r.link).map((p) => `${p.n} ${p.drugId} ${p.dose} ${p.unit}`)).toEqual([
      '1 dantrolene 2.5 mg/kg', '3 calciumChloride 10 mg/kg', '3 insulinDextrose 10 units', '4 sodiumBicarbonate 1 mmol/kg',
    ]);
    const tags = [...r.frame.left.querySelectorAll('[aria-label="Card steps"] .ip2-pick-tag')].map((t) => t.textContent);
    expect(tags).toEqual(['card step 1', 'card step 3', 'card step 3', 'card step 4']);
  });

  it('a pinned step at the card\'s dose: one Give, which presses the step exactly as pressStep does', async () => {
    const r = rig();
    const viaPress = await after(r, () => pressStep(r.link, 'Dantrolene 2.5 mg/kg'));
    r.pick('step:1:dantrolene').click();
    expect(r.gives().map((b) => b.textContent)).toEqual(['Give Dantrolene 2.5 mg/kg now']);
    expect(r.frame.primary.textContent).toContain('card step 1: Give also moves the card to “Dantrolene 2.5 mg/kg given”');
    const ours = await after(r, () => r.gives()[0]?.click());
    expect(ours).toEqual(viaPress);
    expect(ours.sent).toEqual([{ type: 'scenario', action: 'trigger', target: 'dant-treating' }]);
    // Enter does the same
    expect((await after(r, () => r.sheet.give())).sent).toEqual(viaPress.sent);
  });

  it('INTERIM: a typed dose that differs gives two buttons, the card\'s step (= pressStep) and the dose off the card (= today\'s bolus)', async () => {
    const r = rig();
    r.pick('step:1:dantrolene').click();
    r.typeDose('1');
    expect(r.gives().map((b) => b.textContent)).toEqual(['Give the card\'s step (2.5 mg/kg)', 'Give 1 mg/kg off the card']);
    expect(r.frame.primary.textContent).toContain('the card\'s dose is 2.5 mg/kg');
    const viaPress = await after(r, () => pressStep(r.link, 'Dantrolene 2.5 mg/kg'));
    expect(await after(r, () => r.gives()[0]?.click())).toEqual(viaPress);
    // today's tab: dantrolene found, its dose typed as 1 mg/kg, Give now
    const find = r.today.querySelector<HTMLInputElement>('input[type=search]') as HTMLInputElement;
    find.value = 'dantrolene';
    find.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const inp = r.today.querySelector<HTMLInputElement>('.card.dose input[type=number]') as HTMLInputElement;
    inp.value = '1';
    inp.dispatchEvent(new Event('change'));
    const todayOne = await after(r, () => [...r.today.querySelectorAll<HTMLButtonElement>('.card.dose button')].find((b) => b.textContent === 'Give now')?.click());
    const off = await after(r, () => r.gives()[1]?.click());
    expect(off).toEqual(todayOne);
    expect(off.sent).toEqual([{ type: 'applyEvent', event: { kind: 'drug', drugId: 'dantrolene', dose: 1, unit: 'mg/kg', route: 'iv' } }]);
    // Enter never picks between the two
    expect((await after(r, () => r.sheet.give())).sent).toEqual([]);
    // the rule is one function: the same answers from it directly
    const step = pinnedSteps(r.link)[0];
    if (!step) throw new Error('no pinned step');
    expect(pinnedGiveRule(step, { dose: 2.5, unit: 'mg/kg' }).buttons.map((b) => b.does)).toEqual(['step']);
    expect(pinnedGiveRule(step, { dose: 2.5, unit: 'mg' }).buttons.map((b) => b.does)).toEqual(['step', 'bolus']);
  });

  it('a pinned step cannot be added to the cache: the button is disabled with "card steps are given from ACTION"', () => {
    const r = rig();
    r.pick('step:1:dantrolene').click();
    const add = r.frame.right.querySelector<HTMLButtonElement>('.ip2-add') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(r.frame.right.querySelector('.ip2-add-wrap')?.textContent).toContain('card steps are given from ACTION');
    r.sheet.stage();
    expect(r.cache.size).toBe(0);
    expect(toasts()).toContain('Card steps are given from ACTION');
  });
});
