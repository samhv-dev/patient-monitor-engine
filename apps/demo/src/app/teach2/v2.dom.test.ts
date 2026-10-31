// @vitest-environment happy-dom
// Plan F6: Instructor v2 reads a pme-scenario/2 card (the MH card in phases, F8). The strip lists the PHASES (entry times
// from the scenario history; a future phase does not jump: no goto, Q5); the cue box names the phase, "entered by its own
// rule", the learners' cue and the phase's Say line; ACTION lists the open actions (the current phase's) and the judged
// row, numbered, and the A rows are the rules out of the phase with their 60-s hold's bar (vitalHolds, leaf 'hold'); an A
// press sends the action's `give` as ONE staged batch, each command stamped with the action's id, and moves nothing.
import { describe, expect, it } from 'vitest';
import { ScenarioView, type AnyScenarioDoc, type CommandInput } from '@pme/controller';
import type { PhaseHold } from '@pme/controller/scenario';
import type { Link } from '../link.ts';
import { anyShowcaseDoc } from '../showcase/harness.ts';
import { mount as mountAction } from './action.ts';
import { mount as mountCue } from './cue.ts';
import { mount as mountStrip } from './strip.ts';
import type { Teach2Ctx } from './ctx.ts';

const MH2 = anyShowcaseDoc('showcase-mh-v2') as AnyScenarioDoc;

function rig(o: { holds?: PhaseHold[]; takings?: Record<string, number> } = {}) {
  const sv = new ScenarioView();
  sv.doc = MH2;
  sv.docVersion = 1;
  sv.stateId = 'latent';
  sv.enteredT = 377;
  sv.history = [{ t: 0, stateId: 'baseline' }, { t: 377, stateId: 'latent', transitionId: 'enter:latent' }];
  const sent: CommandInput[][] = [];
  const single: CommandInput[] = [];
  const digits = new Map<number, (() => void) | null>();
  const phaseRunner = { takings: o.takings ?? {}, vitalHolds: () => o.holds ?? [] };
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 400, state: { values: { etco2: 44 } }, hostPaused: false },
    host: { driver: { vitalHolds: () => o.holds ?? [], phaseRunner, stageMarks: () => [] }, record: { data: null } },
    simT: 400, log: [],
    send: async (c: CommandInput) => (single.push(c), { accepted: true, tick: 0, commandId: 'c', rttMs: 0 }),
    sendBatch: async (cs: CommandInput[]) => (sent.push(cs), cs.map(() => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }))),
    note: () => undefined,
  } as unknown as Link;
  const ctx = { link, keys: { digit: (n: number, fn: (() => void) | null) => digits.set(n, fn), letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined, site: {}, weightKg: () => 80 } as unknown as Teach2Ctx;
  return { sv, link, ctx, sent, single, digits };
}

describe('Instructor v2 reads a pme-scenario/2 card (F6)', () => {
  it('the strip: the phases, the current one with its entry time; a future phase is "auto" and its click sends no goto', () => {
    const { ctx, single } = rig();
    const el = document.createElement('nav');
    document.body.append(el);
    mountStrip(el, ctx).refresh();
    const names = [...el.querySelectorAll('.ip2-chip .ip2-chip-name')].map((x) => x.textContent);
    expect(names.slice(0, 3)).toEqual(['Baseline', 'Latent', 'Early signs']);
    expect(el.querySelector('.ip2-current .ip2-chip-t')?.textContent).toMatch(/^06:17/);
    const future = el.querySelector('.ip2-future') as HTMLButtonElement | null;
    expect(future?.querySelector('.ip2-auto')?.textContent).toBe('auto');
    future?.click();
    expect(single).toEqual([]);
    el.remove();
  });

  it('the cue box: the phase, "entered by its own rule", the learners\' cue and the Say line', () => {
    const { ctx } = rig();
    const el = document.createElement('div');
    mountCue(el, ctx).refresh();
    expect(el.querySelector('.ip2-cue-name')?.textContent).toBe('Latent');
    expect(el.textContent).toContain('entered by its own rule');
    expect(el.textContent).toContain('Learners see: the monitor looks normal');
    expect(el.textContent).toContain('masseter rigidity');
  });

  it('ACTION: the phase\'s actions and the judged row, numbered; the A rows are the rules out of the phase, with the hold\'s bar', () => {
    const hold: PhaseHold = { transitionId: 'enter:earlySigns', key: 'phase:earlySigns:hold', leaf: 'hold', variable: 'earlySigns', op: '>=', threshold: 60, value: 30, met: true, heldS: 30, forS: 60, fraction: 0.5 };
    const { ctx } = rig({ holds: [hold], takings: { intubate: 1 } });
    const el = document.createElement('div');
    mountAction(el, ctx).refresh();
    const rows = [...el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row')] as HTMLElement[];
    const titles = rows.map((r) => r.querySelector('.ip2-row-title')?.textContent);
    expect(titles).toContain('MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate');
    expect(titles).toContain('Start surgery: rocuronium 0.6 mg/kg');
    expect(titles.some((t) => /^Name malignant hyperthermia/.test(t ?? ''))).toBe(true);
    expect(titles).not.toContain('Premedicate: midazolam 2 mg, fentanyl 100 µg'); // a Baseline action
    const intubate = rows.find((r) => r.querySelector('.ip2-row-title')?.textContent?.startsWith('Intubate'));
    expect(intubate?.dataset.look).toBe('taken');
    const autos = rows.filter((r) => r.dataset.kind === 'auto');
    expect(autos.map((r) => r.querySelector('.ip2-row-title')?.textContent)).toEqual(['Early signs', 'Treated', 'Arrest']);
    expect((autos[0]?.querySelector('.ip2-bar-fill') as HTMLElement).style.width).toBe('50%');
    expect(autos[0]?.querySelector('.ip2-row-right')?.textContent).toBe('held 0:30 of 1:00');
    expect(autos[0]?.querySelector('.ip2-row-sub')?.textContent).toContain('EtCO₂ climbing, HR up');
  });

  it('an A press sends the action\'s give as one batch, every command stamped with the action\'s id; digits press the numbered rows', async () => {
    const { ctx, sent, digits } = rig();
    const el = document.createElement('div');
    mountAction(el, ctx).refresh();
    const btn = [...el.querySelectorAll('button.ip2-row')].find((b) => b.querySelector('.ip2-row-title')?.textContent?.startsWith('MH crisis')) as HTMLButtonElement;
    btn.click();
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.map((c) => (c as { actionId?: string }).actionId)).toEqual(['callCrisis', 'callCrisis', 'callCrisis']);
    expect(sent[0]!.map((c) => (c as { event?: { kind: string } }).event?.kind)).toEqual(['vaporiser', 'infusion', 'ventilation']);
    expect(sent[0]!.every((c) => !('$comment' in c))).toBe(true);
    const n = Number(btn.querySelector('.ip2-key')?.textContent);
    digits.get(n)?.();
    await Promise.resolve();
    expect(sent).toHaveLength(2);
  });
});
