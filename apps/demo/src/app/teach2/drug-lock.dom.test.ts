// @vitest-environment happy-dom
// The same drug is not given twice within 10 s of sim time, from any device (the owner's ruling of 5 November 2026; the
// host refuses the second bolus, host-drug-lock.test.ts). Every device shows the lock on the drug's rows, read from the
// applied commands it received (ControllerSession.gives): Instructor v2's ACTION row and the Drug sheet's row, and
// today's Drugs & fluids tab, read "given 0:04 ago · 6 s left", counting down, and are live again after 10 s. A
// remote's rows are the same code on its own Link, so the phone shows what the laptop shows.
import { describe, expect, it } from 'vitest';
import { RecentGives, ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { drugsTab } from '../panel/drugs.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { Staging } from '../staging.ts';
import { mount } from './action.ts';
import { Cache } from './cache.ts';
import type { Teach2Ctx } from './ctx.ts';
import { drugSheet } from './drug-sheet.ts';
import { sheetFrame } from './sheet.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const TO_TRIGGER_OFF = [
  { t: 0, stateId: 'awake' },
  { t: 10, stateId: 'premedicated', transitionId: 'premed-air' },
  { t: 20, stateId: 'induced', transitionId: 'induce' },
  { t: 30, stateId: 'intubated', transitionId: 'intubate' },
  { t: 40, stateId: 'surgery', transitionId: 'surgery' },
  { t: 80, stateId: 'earlySigns', transitionId: 'early' },
  { t: 100, stateId: 'triggerOff', transitionId: 'crisis-earlySigns' },
];
const dantrolene = { id: 'x-1', issuedBy: 'remote', type: 'applyEvent', event: { kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' } };

function rig() {
  const sv = new ScenarioView();
  sv.doc = MH;
  sv.docVersion = 1;
  sv.stateId = 'triggerOff';
  sv.enteredT = 100;
  sv.history = TO_TRIGGER_OFF;
  const gives = new RecentGives();
  const ctl = { scenario: sv, bookmarks: [], simT: 120, state: null, hostPaused: false, gives };
  const link = {
    ctl, host: null, log: [], get simT() { return ctl.simT; },
    send: async () => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }), note: () => undefined,
  } as unknown as Link;
  // Instructor v2: ACTION and the Drug sheet
  const action = document.createElement('div');
  const slot = mount(action, { link, keys: { digit: () => undefined, letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx);
  const frame = sheetFrame({ id: 'drug', name: 'Drug', hint: '', onClose: () => undefined });
  const sheet = drugSheet(frame, { link, weightKg: () => 70, cache: new Cache(link) });
  frame.open();
  // today's Drugs & fluids tab, its repaint registered as the panel does (≤ 2 Hz)
  const repaints: Array<() => void> = [];
  const today = drugsTab({ link, staging: new Staging('t', () => link.send({} as never)), site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => void repaints.push(fn), goTab: () => undefined } as unknown as PanelCtx);
  document.body.replaceChildren(action, frame.el, today);
  const search = today.querySelector<HTMLInputElement>('input[type=search]') as HTMLInputElement;
  search.value = 'dantrolene';
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  const at = (t: number) => {
    ctl.simT = t;
    slot.refresh();
    sheet.refresh();
    repaints.forEach((fn) => fn());
  };
  const read = () => {
    const row = [...action.querySelectorAll<HTMLElement>('.ip2-rows .ip2-row')].find((r) => /dantrolene/i.test(r.querySelector('.ip2-row-title')?.textContent ?? '')) as HTMLElement;
    const pick = frame.left.querySelector<HTMLElement>('.ip2-pick[data-key="drug:dantrolene"]') as HTMLElement;
    const lock = today.querySelector<HTMLElement>('.card.dose .lock') as HTMLElement;
    return {
      action: row.querySelector('.ip2-row-right')?.textContent, actionLocked: row.dataset.locked === 'true',
      sheet: pick.querySelector('.ip2-pick-tag')?.textContent, sheetLocked: pick.dataset.locked === 'true',
      today: lock.hidden ? null : lock.textContent,
    };
  };
  return { gives, at, read };
}

describe('the lock on every row of the drug, counting down for 10 s', () => {
  it('given at 120 s: at 124 s "given 0:04 ago · 6 s left", at 127 s "0:07 … 3 s left", live again at 130 s', () => {
    const r = rig();
    r.at(121);
    const before = r.read();
    expect(before).toEqual({ action: 'due in 04:39', actionLocked: false, sheet: '', sheetLocked: false, today: null });
    r.gives.note(dantrolene as never, 120);
    r.at(124);
    expect(r.read()).toEqual({ action: 'given 0:04 ago · 6 s left', actionLocked: true, sheet: 'given 0:04 ago · 6 s left', sheetLocked: true, today: 'given 0:04 ago · 6 s left' });
    r.at(127.5);
    expect(r.read()).toMatchObject({ action: 'given 0:07 ago · 3 s left', sheet: 'given 0:07 ago · 3 s left', today: 'given 0:07 ago · 3 s left' });
    r.at(130);
    expect(r.read()).toEqual({ ...before, action: 'due in 04:30' }); // the row's own label again (its timer ran on)
  });

  it('an infusion of the drug does not lock its rows', () => {
    const r = rig();
    r.gives.note({ ...dantrolene, event: { ...dantrolene.event, infusion: true } } as never, 120);
    r.at(124);
    expect(r.read()).toMatchObject({ actionLocked: false, sheetLocked: false, today: null });
  });
});

describe('a refused press is answered on the device that pressed', () => {
  it("a /2 A press whose bolus the host refused `recent` says so in a toast (the phone's and the laptop's Instructor v2)", async () => {
    const { pressAction } = await import('./press.ts');
    document.body.replaceChildren();
    const link = { sendBatch: async () => [{ accepted: false, tick: 0, commandId: 'c', rttMs: 0, reason: 'given 3 s ago from the laptop' }] } as unknown as Link;
    await pressAction(link, { id: 'dant', label: 'Dantrolene 2.5 mg/kg', give: [dantrolene] } as never);
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toEqual(['Dantrolene 2.5 mg/kg: not given (given 3 s ago from the laptop)']);
  });
});

it('a /1 step press the host refused `recent` says why (not "the case has moved")', async () => {
  const { pressStep } = await import('./press.ts');
  document.body.replaceChildren();
  const sv = new ScenarioView();
  sv.doc = MH;
  sv.docVersion = 1;
  sv.stateId = 'triggerOff';
  const label = (MH.states.find((s) => s.id === 'triggerOff')?.transitions?.[0]?.when as { manual: { label: string } }).manual.label;
  const link = { ctl: { scenario: sv, send: async () => ({ accepted: false, tick: 0, commandId: 'c', rttMs: 0, code: 'recent', reason: 'given 4 s ago from the phone' }) }, note: () => undefined } as unknown as Link;
  await pressStep(link, label);
  expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toEqual([`${label}: not given (given 4 s ago from the phone). Press again after the lock.`]);
});
