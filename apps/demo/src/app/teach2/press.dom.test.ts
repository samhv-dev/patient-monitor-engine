// @vitest-environment happy-dom
// Instructor v2's presses against today's Scenario tab on the same fake Link (the panel/scenario.dom.test.ts rig): a
// step sends what today's state button sends and writes the same note; a stale or refused press gets the same toast and
// no note; a judged objective writes what ticking today's checkbox writes.
import { beforeEach, describe, expect, it } from 'vitest';
import { ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { scenarioTab } from '../panel/scenario.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { judge, pressStep } from './press.ts';

const MH = showcaseDoc('showcase-mh');
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };

function rig(stateId: string, reply: AckResult = OK, during: (sv: ScenarioView) => void = () => undefined) {
  const sv = new ScenarioView();
  sv.doc = MH as ScenarioDoc;
  sv.docVersion = 1;
  sv.stateId = stateId;
  const sent: CommandInput[] = [];
  const notes: Array<[string, string]> = [];
  const send = async (c: CommandInput) => (sent.push(c), during(sv), reply);
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 0, send },
    host: null,
    simT: 0,
    send: async (c: CommandInput, kind = 'instructor') => (notes.push([kind, 'sent']), send(c)),
    note: (text: string, kind = 'note') => void notes.push([kind, text]),
  } as unknown as Link;
  let refresh = () => undefined as void;
  const ctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
  const el = scenarioTab(ctx);
  document.body.append(el);
  refresh();
  const button = (label: string) => [...el.querySelectorAll('ul.next button')].find((b) => b.textContent === label) as HTMLButtonElement;
  const reset = () => (sent.splice(0), notes.splice(0), document.querySelectorAll('.toast').forEach((t) => t.remove()));
  return { sv, el, sent, notes, link, button, reset };
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

describe('teach2/press.ts against today\'s Scenario tab', () => {
  beforeEach(() => document.body.replaceChildren());

  it('every manual button of MH treating: pressStep sends the same command and writes the same instructor note', async () => {
    const r = rig('treating');
    const labels = [...r.el.querySelectorAll('ul.next button')].map((b) => b.textContent as string);
    expect(labels).toHaveLength(4);
    for (const label of labels) {
      const today = await outcome(r, () => r.button(label).click());
      const v2 = await outcome(r, () => void pressStep(r.link, label));
      expect(v2, label).toEqual(today);
      expect(today.sent).toHaveLength(1);
      expect(today.notes.map(([k]) => k)).toEqual(['instructor']);
    }
  });

  it('a label the case has moved past: the same toast, nothing sent, nothing logged', async () => {
    const r = rig('triggerOff');
    const stale = r.button('Dantrolene 2.5 mg/kg');
    r.sv.stateId = 'arrest';
    const today = await outcome(r, () => stale.click());
    const v2 = await outcome(r, () => void pressStep(r.link, 'Dantrolene 2.5 mg/kg'));
    expect(v2).toEqual(today);
    expect(v2).toEqual({ sent: [], notes: [], toasts: ['Not available now: the case has moved to Cardiac arrest.'] });
  });

  it('a refusal from the runner: the same toast, nothing logged', async () => {
    const r = rig('triggerOff', { ...OK, accepted: false, reason: 'no transition dant in state arrest' }, (sv) => (sv.stateId = 'arrest'));
    const today = await outcome(r, () => r.button('Dantrolene 2.5 mg/kg').click());
    r.sv.stateId = 'triggerOff';
    const v2 = await outcome(r, () => void pressStep(r.link, 'Dantrolene 2.5 mg/kg'));
    expect(v2).toEqual(today);
    expect(v2.notes).toEqual([]);
    expect(v2.toasts).toEqual(['Not available now: the case has moved to Cardiac arrest.']);
  });

  it('judge writes the note that ticking the objective\'s checkbox writes', async () => {
    const r = rig('earlySigns');
    const box = r.el.querySelector('#obj-0') as HTMLInputElement;
    const today = await outcome(r, () => {
      box.checked = true;
      box.dispatchEvent(new Event('change'));
    });
    const text = (MH.objectives?.[0] as { text: string }).text;
    const v2 = await outcome(r, () => judge(r.link, text));
    expect(v2).toEqual(today);
    expect(v2.notes).toEqual([['marker', `Objective met: ${text}`]]);
  });
});
