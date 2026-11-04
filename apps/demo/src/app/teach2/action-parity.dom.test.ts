// @vitest-environment happy-dom
// Instructor v2's ACTION list against today's Scenario tab on one fake Link (the panel/scenario.dom.test.ts rig; plan
// IP6): for every manual transition of both demo cards, a press of the new row (and of its digit) sends the same
// CommandInput and writes the same log entries as today's state button; a stale press gets the same toast; a judged row
// writes what ticking the objective's checkbox writes; the list has one step row per manual (or mixed) transition of
// the state; and no step or judged row is ever disabled.
import { beforeEach, describe, expect, it } from 'vitest';
import { manualLabel, ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import type { ClinicalLogEntry, Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { scenarioTab } from '../panel/scenario.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { isHop } from '../card-read.ts';
import { mount } from './action.ts';
import type { Teach2Ctx } from './ctx.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const HAEM = showcaseDoc('showcase-haemorrhage') as ScenarioDoc;
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };

function rig(doc: ScenarioDoc, stateId: string, reply: AckResult = OK, during: (sv: ScenarioView) => void = () => undefined) {
  const sv = new ScenarioView();
  sv.doc = doc;
  sv.docVersion = 1;
  sv.stateId = stateId;
  const sent: CommandInput[] = [];
  const notes: Array<[string, string]> = [];
  const log: ClinicalLogEntry[] = [];
  const send = async (c: CommandInput) => (sent.push(structuredClone(c)), during(sv), reply);
  // the real Link.send logs every command it sends (a refusal too) and Link.note logs a line: the fake does the same
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 0, send, state: null, hostPaused: false },
    host: null,
    simT: 0,
    log,
    send: async (c: CommandInput, kind = 'instructor') => (notes.push([kind, 'sent']), send(c)),
    note: (text: string, kind = 'note') => void (notes.push([kind, text]), log.push({ simT: 0, kind: kind as ClinicalLogEntry['kind'], text })),
  } as unknown as Link;
  // today's tab
  let refreshToday = () => undefined as void;
  const pctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refreshToday = fn), goTab: () => undefined } as unknown as PanelCtx;
  const today = scenarioTab(pctx);
  // the new list
  const digits = new Map<number, () => void>();
  const keys = { digit: (n: number, fn: (() => void) | null) => void (fn ? digits.set(n, fn) : digits.delete(n)), letter: () => undefined, escape: () => () => undefined };
  const v2el = document.createElement('div');
  const slot = mount(v2el, { link, keys, site: {}, weightKg: () => 70, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx);
  document.body.append(today, v2el);
  const refresh = () => (refreshToday(), slot.refresh());
  refresh();
  const button = (label: string) => [...today.querySelectorAll('ul.next button')].find((b) => b.textContent === label) as HTMLButtonElement;
  const pill = (label: string) => [...v2el.querySelectorAll<HTMLElement>('.ip2-rows:not(.ip2-finished-list) .ip2-row')].find((p) => p.querySelector('.ip2-row-title')?.textContent === label) as HTMLButtonElement;
  const reset = () => (sent.splice(0), notes.splice(0), log.splice(0), document.querySelectorAll('.toast').forEach((t) => t.remove()));
  return { sv, today, v2el, sent, notes, link, button, pill, digits, refresh, reset };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);

/** What a press did: the commands sent, the log notes and the toasts. */
async function outcome(r: ReturnType<typeof rig>, act: () => unknown) {
  r.reset();
  act();
  await settle();
  return { sent: [...r.sent], notes: [...r.notes], toasts: toasts() };
}

/** Every state of the card with a manual (or mixed) transition: the states the parity runs over. */
const pressable = (doc: ScenarioDoc) => doc.states.filter((s) => !isHop(s) && (s.transitions ?? []).some((t) => manualLabel(t.when) !== null));

describe('ACTION list parity with today\'s Scenario tab', () => {
  beforeEach(() => document.body.replaceChildren());

  for (const [name, doc] of [['MH', MH], ['haemorrhage', HAEM]] as const) {
    it(`${name}: every manual transition, by click and by its digit, sends today's command and writes today's log entries`, async () => {
      let n = 0;
      for (const s of pressable(doc)) {
        const r = rig(doc, s.id);
        const labels = (s.transitions ?? []).map((t) => manualLabel(t.when)).filter((l): l is string => l !== null);
        // row count: one step row per manual or mixed transition of the state, numbered 1… in the card's order
        const steps = [...r.v2el.querySelectorAll<HTMLElement>('.ip2-rows:not(.ip2-finished-list) .ip2-row[data-kind="step"]')];
        expect(steps.map((p) => p.querySelector('.ip2-row-title')?.textContent), s.id).toEqual(labels);
        expect(steps.map((p) => p.querySelector('.ip2-key')?.textContent), s.id).toEqual(labels.map((_, i) => String(i + 1)));
        for (const [i, label] of labels.entries()) {
          const today = await outcome(r, () => r.button(label).click());
          const byClick = await outcome(r, () => r.pill(label).click());
          expect(byClick, `${s.id}: ${label}`).toEqual(today);
          expect(today.sent, `${s.id}: ${label}`).toHaveLength(1);
          expect(today.notes.map(([k]) => k)).toEqual(['instructor']);
          if (i < 9 && labels.indexOf(label) === i) {
            const byKey = await outcome(r, () => r.digits.get(i + 1)?.());
            expect(byKey, `${s.id}: key ${i + 1}`).toEqual(today);
          }
          n++;
        }
        document.body.replaceChildren();
      }
      expect(n).toBe(doc.states.flatMap((s) => (isHop(s) ? [] : s.transitions ?? [])).filter((t) => manualLabel(t.when) !== null).length);
    });
  }

  it('a row drawn for a state the case has left: the same toast as today\'s stale button, nothing sent, nothing logged', async () => {
    const r = rig(MH, 'triggerOff');
    const stale = r.button('Dantrolene 2.5 mg/kg');
    const stalePill = r.pill('Dantrolene 2.5 mg/kg');
    r.sv.stateId = 'arrest'; // the case moves on before the next repaint
    const today = await outcome(r, () => stale.click());
    const v2 = await outcome(r, () => stalePill.click());
    expect(v2).toEqual(today);
    expect(v2).toEqual({ sent: [], notes: [], toasts: ['Not available now: the case has moved to Cardiac arrest.'] });
  });

  it('a refusal from the runner: the same toast as today, nothing logged', async () => {
    const r = rig(MH, 'triggerOff', { ...OK, accepted: false, reason: 'no transition dant in state arrest' }, (sv) => (sv.stateId = 'arrest'));
    const today = await outcome(r, () => r.button('Dantrolene 2.5 mg/kg').click());
    r.sv.stateId = 'triggerOff';
    const v2 = await outcome(r, () => r.pill('Dantrolene 2.5 mg/kg').click());
    expect(v2).toEqual(today);
    expect(v2.notes).toEqual([]);
  });

  it('a judged row writes the note that ticking the objective\'s checkbox writes, and moves to Finished as met', async () => {
    for (const [doc, stateId] of [[MH, 'earlySigns'], [HAEM, 'pea']] as const) {
      const r = rig(doc, stateId);
      const judged = [...r.v2el.querySelectorAll<HTMLButtonElement>('.ip2-rows:not(.ip2-finished-list) .ip2-row[data-kind="judged"]')];
      expect(judged).toHaveLength(1); // both cards have one rule-less objective, the first
      expect(judged[0]?.tagName).toBe('BUTTON');
      const box = r.today.querySelector('#obj-0') as HTMLInputElement;
      const today = await outcome(r, () => {
        box.checked = true;
        box.dispatchEvent(new Event('change'));
      });
      const v2 = await outcome(r, () => judged[0]?.click());
      expect(v2).toEqual(today);
      expect(v2.notes).toHaveLength(1);
      expect(v2.notes[0]?.[0]).toBe('marker');
      r.refresh();
      expect(r.v2el.querySelector('.ip2-finished-list .ip2-row[data-kind="judged"]')?.getAttribute('data-look')).toBe('met');
      expect(r.v2el.querySelector('.ip2-finished summary')?.textContent).toBe('Finished steps · 1');
      document.body.replaceChildren();
    }
  });

  it('no step or judged row is ever disabled, in any state of either card; Finished is closed by default; the foot line is there', () => {
    for (const doc of [MH, HAEM]) {
      for (const s of doc.states) {
        const r = rig(doc, s.id);
        expect(r.v2el.querySelectorAll('[disabled], [aria-disabled]'), s.id).toHaveLength(0);
        for (const p of r.v2el.querySelectorAll('.ip2-row:is([data-kind="step"], [data-kind="judged"])')) {
          if (p.closest('.ip2-finished-list')) continue;
          expect(p.tagName, s.id).toBe('BUTTON');
        }
        expect((r.v2el.querySelector('details.ip2-finished') as HTMLDetailsElement).open).toBe(false);
        expect(r.v2el.querySelector('.ip2-foot')?.textContent).toMatch(/^No penalty comes from the panel/);
        document.body.replaceChildren();
      }
    }
  });

  it('an automatic row is not pressable: no button, no digit', () => {
    const r = rig(MH, 'surgery');
    const autos = [...r.v2el.querySelectorAll('.ip2-row[data-kind="auto"]')];
    expect(autos.map((a) => [a.tagName, a.querySelector('.ip2-key')?.textContent, a.getAttribute('data-look')])).toEqual([['DIV', 'A', 'pending']]);
    expect([...r.digits.keys()]).toEqual([1]); // the crisis step; the judged recognition row is offered from Early signs (judged-offer.dom.test.ts)
  });

  it('rows keep their element across repaints (a press is never lost to a redraw)', () => {
    const r = rig(MH, 'treating');
    const before = r.pill('Dantrolene 2.5 mg/kg');
    r.refresh();
    r.refresh();
    expect(r.pill('Dantrolene 2.5 mg/kg')).toBe(before);
  });
});
