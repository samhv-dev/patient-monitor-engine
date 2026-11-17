// @vitest-environment happy-dom
// Plan learner-action-remote.md L8 ("Tests first"): starting sends `prep infuse`; changing and stopping send `infusion
// set`, on the instructor's infusion and another remote's alike (LQ4); every running infusion is listed from the engine's
// state with "set by <device or the instructor> at mm:ss"; a refusal is the host's words; and the dose-rate line beside
// the mL/h is the HOST's arithmetic: the line shown before Start (mL/h × the host's concentration from its `prep` news, per
// kg of the weight in this phone's engine) equals the line the engine shows once the host has applied the infusion
// (the host's own translation, preparations.ts infusePrep, dispatched into a real engine). The record row's device and
// replaced rate are the host's (L4, host-learner.test.ts) and the laptop's record (learner-remote.e2e.ts).
import { createStamper, type Formulary, type LearnerPrepNews, type LearnerPrepView, type WireBody, type WireCommand, type WireMessage } from '@pme/controller';
import { createEngine, TICK_S, type Command, type DrugsEvent, type EngineEvent, type PatientSnapshot } from '@pme/engine-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { infusePrep, learnerView, stagePrep } from '../../../../../packages/controller/src/session/preparations.ts';
import { rateRange, rateRefusal, type RateRange } from '../../../../../packages/controller/src/session/pump-host.ts';
import { shippedPumpDevices } from '../pump/devices.ts';
import { loadShippedFormulary } from '../formulary.ts';
import type { FollowerCommand } from '../views/follower.ts';
import { doseRateText, doseUnitOf, infusionsView, INFUSION_ML_H, INFUSION_WORDS, weightOfSnapshot } from './infusions.ts';

let f: Formulary;
beforeAll(async () => void (f = (await loadShippedFormulary()) as Formulary));

const ME = 'view-phone01';
const DEVICE = 'mephone00001';
const OTHER = 'otherkey0002';

/** A snapshot whose drug model holds a patient of `kg` (as the engine's own, weightOfSnapshot's path). */
const snap = (kg: number): PatientSnapshot => ({ schema: 'pme-snapshot/1', engineVersion: 'x', seed: 1, tick: 0, state: { st: { pk: { patient: { weightKg: kg } } } } });

function mount(kg: number | null = 64) {
  let now: number | null = 100;
  const sent: Array<FollowerCommand & { id: string }> = [];
  const fns = new Set<(m: WireMessage) => void>();
  const eng = new Set<(e: EngineEvent) => void>();
  const v = infusionsView({ now: () => now, devices: shippedPumpDevices });
  document.body.replaceChildren(v.el);
  let c = 0;
  let resolveSnap: (s: PatientSnapshot) => void = () => undefined;
  const snapP = new Promise<PatientSnapshot>((r) => (resolveSnap = r));
  const off = v.attach({
    command: (b) => (sent.push({ ...b, id: `cmd${++c}` }), `cmd${c}`),
    onMessage: (fn) => (fns.add(fn), () => void fns.delete(fn)),
    onEngine: (fn) => (eng.add(fn), () => void eng.delete(fn)),
    snapshot: () => snapP,
    peerId: ME, device: DEVICE,
  });
  if (kg !== null) resolveSnap(snap(kg));
  const stamp = createStamper('GP3P4G', 'host-aaaaaa', () => Date.now());
  const from = (b: WireBody) => [...fns].forEach((fn) => fn(stamp(b)));
  const news = (news: LearnerPrepNews['news'], prep: LearnerPrepView, to = ME) => from({ kind: 'event', body: [{ type: 'prep', t: now ?? 0, to, body: { news, prep } satisfies LearnerPrepNews }] });
  const applied = (tick: number, command: Record<string, unknown>) => from({ kind: 'event', body: [{ type: 'commandApplied', commandId: String(command.id), tick, resolved: { command } }] });
  const ack = (commandId: string, accepted: boolean, reason?: string) => from({ kind: 'ack', commandId, accepted, tick: 0, ...(reason ? { reason } : {}) });
  const engine = (e: EngineEvent) => [...eng].forEach((fn) => fn(e));
  const q = <T extends Element = HTMLElement>(s: string) => v.el.querySelector<T>(s) as T;
  const text = (s: string) => v.el.querySelector(s)?.textContent ?? null;
  return { v, sent, off, news, applied, ack, engine, from, q, text, setNow: (x: number) => void (now = x), settle: () => snapP.then(() => undefined) };
}

/** The host's propofol 1 % drawn neat, 20 mL, ready at once (as preparations.ts learnerView would say it). */
const propofol = (o: Partial<LearnerPrepView> = {}): LearnerPrepView => ({
  id: 'prop0001', actives: [{ drugId: 'propofol', amount: 200, unit: 'mg', perMl: 10, rows: [] }], volumeMl: 20, leftMl: 20,
  diluent: null, container: 'syringe-pp', ready: { atS: 100, gap: 'LQ7' }, ...o,
});
/** The engine's 1 Hz panel with these drugs running at `rate` amount/min (types-pk.ts DrugPanelRow). */
const drugs = (rows: Array<{ id: string; rate: number | null; amountUnit: string; tci?: true }>): DrugsEvent => ({
  type: 'drugs', t: 120, volatile: null, macTotal: 0,
  drugs: rows.map((r) => ({ id: r.id, name: r.id, unit: 'µg/mL', cp: 0, ce: 0, rate: r.rate, rateUnit: r.rate === null ? null : `${r.amountUnit}/min`, tci: r.tci ? { mode: 'effect', target: 3, model: 'Eleveld' } : null, totalAmount: 0, amountUnit: r.amountUnit, decrement50Min: null })),
});

describe('the dose-rate line (L8)', () => {
  it('reads in the unit the drug is prescribed in, per kg of the weight; without a weight it says so and drops the kg', () => {
    expect(doseUnitOf('propofol', 'mg')).toBe('mcg/kg/min'); // the library's infusion preset (drugs.ts)
    expect(doseUnitOf('vasopressin', 'units')).toBe('units/min');
    expect(doseUnitOf('dantrolene', 'mg')).toBe('mg/kg/h'); // no preset: mg drugs per kg per hour
    expect(doseUnitOf('fentanyl', 'mcg')).toBe('mcg/kg/min');
    // 10 mL/h × 10 mg/mL = 100 mg/h = 1666.7 µg/min; ÷ 64 kg = 26.0 µg/kg/min
    expect(doseRateText('propofol', (10 * 10) / 60, 'mg', 64)).toBe('26 µg/kg/min for 64 kg');
    expect(doseRateText('propofol', (10 * 10) / 60, 'mg', null)).toBe(`1667 µg/min (${INFUSION_WORDS.noWeight})`); // the pump face's number form
    // epinephrine: the formulary's mg, the engine's µg, prescribed µg/kg/min
    expect(doseRateText('epinephrine', (6 * 0.016) / 60, 'mg', 80)).toBe('0.02 µg/kg/min for 80 kg');
  });

  it('a rate is never written in exponent form, however small', () => {
    expect(INFUSION_WORDS.mlH(3.9e-12)).toBe('0.0000000000039 mL/h');
    expect(INFUSION_WORDS.started(0.05)).toBe('Started at 0.05 mL/h');
  });

  it("reads the weight from the engine's own snapshot (the drug model's patient)", () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { weightKg: 64 } });
    expect(weightOfSnapshot(e.snapshot())).toBe(64);
    expect(weightOfSnapshot(null)).toBeNull();
  });

  it("the line before Start (the host's concentration, the engine's weight) equals the line the engine shows once the host applied it", async () => {
    // the host's side: the preparation staged from the shipped formulary, then `prep infuse` at 10 mL/h, as host-session.ts does
    const staged = stagePrep(f, { id: 'p1', issuedBy: 'learner', type: 'prep', action: 'stage', prep: { id: 'prop0001', components: [{ productId: 'propofol-1pct-aspen', amount: 20, unit: 'mL' }], container: 'syringe-pp' } } as unknown as Extract<WireCommand, { type: 'prep'; action: 'stage' }>, DEVICE, ME, 0);
    if (!staged.ok) throw new Error(staged.why);
    const view = learnerView(staged.prep);
    const out = infusePrep(f, staged.prep, { id: 'cmd1', issuedBy: 'learner', type: 'prep', action: 'infuse', prepId: 'prop0001', rateMlH: 10 } as Extract<WireCommand, { type: 'prep'; action: 'infuse' }>, { id: 'cmd1', issuedBy: 'learner', by: DEVICE } as unknown as WireCommand, 1);
    if (!out.ok) throw new Error(out.why);
    const cmd = out.cmds[0] as unknown as Record<string, unknown>;
    // the engine (the host's and this phone's are the same build): the patient of 64 kg, the host's applyEvent
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { weightKg: 64 } });
    let panel: DrugsEvent | null = null;
    e.on((x) => void (x.type === 'drugs' && (panel = x)));
    e.advanceTo(1);
    expect(e.dispatch({ ...cmd, atTick: undefined } as unknown as Command)).toMatchObject({ accepted: true });
    e.advanceTo(3);
    // the phone: the host's `made` news, the rate typed, the line read; then the host's commandApplied and the engine's panel
    const m = mount(null);
    m.from({ kind: 'snapshot', body: e.snapshot() });
    m.news('made', view);
    m.q<HTMLInputElement>('.lr-inf-prep .stepper input').value = '10';
    m.q<HTMLInputElement>('.lr-inf-prep .stepper input').dispatchEvent(new Event('change'));
    const before = m.text('.lr-inf-prep .lr-dose');
    expect(before).toBe(`${INFUSION_WORDS.doseAtRate}: 26 µg/kg/min for 64 kg`);
    m.q<HTMLButtonElement>('.lr-start').click();
    expect(m.sent.at(-1)).toEqual({ id: 'cmd1', type: 'prep', action: 'infuse', prepId: 'prop0001', rateMlH: 10 });
    m.applied(50, cmd);
    m.engine(panel as unknown as DrugsEvent);
    expect(m.v.running).toEqual(['propofol']);
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-dose')).toBe(`${INFUSION_WORDS.doseRunning}: 26 µg/kg/min for 64 kg`);
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-dose')?.split(': ')[1]).toBe(before?.split(': ')[1]);
    // and both are the host's arithmetic: mL/h × its concentration (× r) ÷ 60, per kg
    const conc = (cmd.event as { concentration: { amount: number; perMl: number } }).concentration;
    expect((panel as unknown as DrugsEvent).drugs.find((d) => d.id === 'propofol')?.rate).toBeCloseTo((10 * conc.amount) / conc.perMl / 60, 9);
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-rate')).toBe('10 mL/h');
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-setby')).toBe(`set by this phone at ${'00:01'}`);
  });
});

describe('the infusions menu (L8)', () => {
  it('a ready preparation on the tray can be started at a rate in mL/h: `prep infuse`; one still preparing shows its countdown and no Start', async () => {
    const m = mount();
    await m.settle();
    expect(m.text('.lr-inf-start-empty')).toBe(INFUSION_WORDS.startEmpty);
    m.news('made', propofol({ ready: { atS: 130, gap: null } }));
    expect(m.text('.lr-inf-prep .lr-state')).toBe('Preparing · ready in 0:30');
    expect(m.q('.lr-inf-prep .lr-give').hidden).toBe(true);
    expect(m.q('.lr-inf-start-empty').hidden).toBe(false);
    m.setNow(130);
    m.from({ kind: 'event', body: [] });
    expect(m.q('.lr-inf-prep .lr-give').hidden).toBe(false);
    expect(m.q('.lr-inf-start-empty').hidden).toBe(true);
    expect(m.text('.lr-inf-prep .lr-item-title')).toBe('Propofol 10 mg/mL · 20 mL');
    // the default 5 mL/h: 50 mg/h = 833 µg/min ÷ 64 kg = 13 µg/kg/min
    expect(m.text('.lr-inf-prep .lr-dose')).toBe(`${INFUSION_WORDS.doseAtRate}: 13 µg/kg/min for 64 kg`);
    m.q<HTMLInputElement>('.lr-inf-prep .stepper input').value = '12';
    m.q<HTMLInputElement>('.lr-inf-prep .stepper input').dispatchEvent(new Event('change'));
    expect(m.text('.lr-inf-prep .lr-dose')).toBe(`${INFUSION_WORDS.doseAtRate}: 31.3 µg/kg/min for 64 kg`);
    m.q<HTMLButtonElement>('.lr-start').click();
    expect(m.sent).toEqual([{ id: 'cmd1', type: 'prep', action: 'infuse', prepId: 'prop0001', rateMlH: 12 }]);
    expect(m.text('.lr-inf-prep .lr-said')).toBe(INFUSION_WORDS.sending);
    m.ack('cmd1', true);
    expect(m.text('.lr-inf-prep .lr-said')).toBe('Started at 12 mL/h');
    // another remote's news is not this phone's
    m.news('made', propofol({ id: 'xxxx0009' }), 'view-other99');
    expect(m.v.el.querySelectorAll('.lr-inf-prep')).toHaveLength(1);
  });

  it("a refusal to start is the host's words", async () => {
    const m = mount();
    await m.settle();
    m.news('made', propofol());
    m.q<HTMLButtonElement>('.lr-start').click();
    m.ack('cmd1', false, 'not ready yet (0:12)');
    expect(m.text('.lr-inf-prep .lr-said')).toBe('Not started: not ready yet (0:12)');
  });

  it("every running infusion is listed from the engine's state, whoever started it, with who set it and when", async () => {
    const m = mount();
    await m.settle();
    expect(m.text('.lr-inf-running-empty')).toBe(INFUSION_WORDS.runningEmpty);
    // the instructor's remifentanil in µg/kg/min (no syringe: the engine row's own 50 µg/mL), another remote's propofol at 8 mL/h
    m.applied(Math.round(100 / TICK_S), { id: 'i1', issuedBy: 'instructor', type: 'applyEvent', event: { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' } });
    m.applied(Math.round(130 / TICK_S), { id: 'o1', issuedBy: 'learner', by: OTHER, prepId: 'z', type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 8, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } } });
    // the card's phenylephrine, and a norepinephrine that ran before this phone signed in
    m.applied(Math.round(65 / TICK_S), { id: 's1', issuedBy: 'scenario', type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 0.5, unit: 'mcg/kg/min', infusion: true } });
    m.engine(drugs([
      { id: 'remifentanil', rate: 6.4, amountUnit: 'mcg' }, { id: 'propofol', rate: (8 * 10) / 60, amountUnit: 'mg' },
      { id: 'phenylephrine', rate: 32, amountUnit: 'mcg' }, { id: 'norepinephrine', rate: 6.4, amountUnit: 'mcg' }, { id: 'fentanyl', rate: null, amountUnit: 'mcg' },
    ]));
    expect(m.v.running).toEqual(['remifentanil', 'propofol', 'phenylephrine', 'norepinephrine']);
    expect(m.q('.lr-inf-running-empty').hidden).toBe(true);
    const row = (d: string, s: string) => m.text(`.lr-inf[data-drug="${d}"] ${s}`);
    expect(row('remifentanil', '.lr-setby')).toBe('set by the instructor at 01:40');
    expect(row('remifentanil', '.lr-dose')).toBe(`${INFUSION_WORDS.doseRunning}: 0.1 µg/kg/min for 64 kg`);
    expect(row('remifentanil', '.lr-rate')).toBe('7.68 mL/h'); // 6.4 µg/min × 60 ÷ 50 µg/mL, the row's syringe the host keeps
    expect(row('propofol', '.lr-setby')).toBe('set by another learner remote at 02:10');
    expect(row('propofol', '.lr-rate')).toBe('8 mL/h');
    expect(row('propofol', '.lr-dose')).toBe(`${INFUSION_WORDS.doseRunning}: 20.8 µg/kg/min for 64 kg`);
    expect(row('phenylephrine', '.lr-setby')).toBe('set by the case card at 01:05');
    expect(row('norepinephrine', '.lr-setby')).toBe(INFUSION_WORDS.setBefore);
    // the change stepper starts at the running rate and previews the dose through that infusion's own syringe
    expect(m.q<HTMLInputElement>('.lr-inf[data-drug="propofol"] .stepper input').value).toBe('8.0');
    expect(row('propofol', '.lr-dose-preview')).toBe(`${INFUSION_WORDS.doseAtRate}: 20.8 µg/kg/min for 64 kg`);
  });

  it('another remote is named as the host named it on its command (its number, or its Room-setup name); this phone is "this phone"', async () => {
    const m = mount();
    await m.settle();
    const inf = (id: string, drugId: string, extra: Record<string, unknown>) => m.applied(Math.round(130 / TICK_S), { id, issuedBy: 'learner', type: 'applyEvent', event: { kind: 'infusion', drugId, rate: 8, unit: 'mL/h' }, ...extra });
    inf('o1', 'propofol', { by: OTHER, sender: { role: 'learner', name: 'Learner remote 2' } });
    inf('o2', 'remifentanil', { by: 'thirdkey0003', sender: { role: 'learner', name: 'bed 3 phone' } });
    inf('o3', 'norepinephrine', { by: DEVICE, sender: { role: 'learner', name: 'Learner remote 1' } });
    m.engine(drugs([{ id: 'propofol', rate: 1, amountUnit: 'mg' }, { id: 'remifentanil', rate: 1, amountUnit: 'mcg' }, { id: 'norepinephrine', rate: 1, amountUnit: 'mcg' }]));
    const setBy = (d: string) => m.text(`.lr-inf[data-drug="${d}"] .lr-setby`);
    expect([setBy('propofol'), setBy('remifentanil'), setBy('norepinephrine')]).toEqual(['set by Learner remote 2 at 02:10', 'set by bed 3 phone at 02:10', 'set by this phone at 02:10']);
  });

  it("Change and Stop send `infusion set` on the instructor's infusion and another remote's alike; refusals are the host's words", async () => {
    const m = mount();
    await m.settle();
    m.applied(5000, { id: 'i1', issuedBy: 'instructor', type: 'applyEvent', event: { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' } });
    m.applied(6000, { id: 'o1', issuedBy: 'learner', by: OTHER, type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 8, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } } });
    m.engine(drugs([{ id: 'remifentanil', rate: 6.4, amountUnit: 'mcg' }, { id: 'propofol', rate: (8 * 10) / 60, amountUnit: 'mg' }]));
    const input = (d: string) => m.q<HTMLInputElement>(`.lr-inf[data-drug="${d}"] .stepper input`);
    input('remifentanil').value = '15';
    input('remifentanil').dispatchEvent(new Event('change'));
    m.q<HTMLButtonElement>('.lr-inf[data-drug="remifentanil"] .lr-change-btn').click();
    m.q<HTMLButtonElement>('.lr-inf[data-drug="propofol"] .lr-stop').click();
    input('propofol').value = '4';
    input('propofol').dispatchEvent(new Event('change'));
    m.q<HTMLButtonElement>('.lr-inf[data-drug="propofol"] .lr-change-btn').click();
    expect(m.sent).toEqual([
      { id: 'cmd1', type: 'infusion', action: 'set', drugId: 'remifentanil', rateMlH: 15 },
      { id: 'cmd2', type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 0 },
      { id: 'cmd3', type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 4 },
    ]);
    m.ack('cmd1', true);
    expect(m.text('.lr-inf-said')).toBe('Remifentanil: changed to 15 mL/h');
    m.ack('cmd2', false, 'no propofol infusion is running');
    expect(m.text('.lr-inf-said')).toBe('Propofol: not stopped: no propofol infusion is running');
    m.ack('cmd3', true);
    expect(m.text('.lr-inf-said')).toBe('Propofol: changed to 4 mL/h');
    // the host applied this phone's change: who set it now, and the engine's new rate
    m.applied(7000, { id: 'cmd3', issuedBy: 'learner', by: DEVICE, replaced: { rate: 8, rateUnit: 'mL/h', by: OTHER }, type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 4, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } } });
    m.engine(drugs([{ id: 'remifentanil', rate: 6.4, amountUnit: 'mcg' }, { id: 'propofol', rate: (4 * 10) / 60, amountUnit: 'mg' }]));
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-setby')).toBe('set by this phone at 02:20');
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-rate')).toBe('4 mL/h');
    // stopped (by anyone): the engine's panel has no rate and the row goes
    m.applied(7100, { id: 'x', issuedBy: 'instructor', type: 'applyEvent', event: { kind: 'infusion', drugId: 'remifentanil', rate: 0, unit: 'mL/h' } });
    m.engine(drugs([{ id: 'remifentanil', rate: null, amountUnit: 'mcg' }, { id: 'propofol', rate: (4 * 10) / 60, amountUnit: 'mg' }]));
    expect(m.v.running).toEqual(['propofol']);
  });

  it('a target-controlled pump is listed without Change and Stop; a restart clears the preparations and who set what', async () => {
    const m = mount();
    await m.settle();
    m.applied(5000, { id: 't1', issuedBy: 'instructor', type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', target: 3 } });
    m.engine(drugs([{ id: 'propofol', rate: 2, amountUnit: 'mg', tci: true }]));
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-rate')).toBe(INFUSION_WORDS.tci);
    expect(m.q('.lr-inf[data-drug="propofol"] .lr-inf-change').hidden).toBe(true);
    m.news('made', propofol());
    expect(m.text('.lr-inf-prep .lr-replaces')).toBe('Starting this replaces the running Propofol infusion.');
    m.from({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0, cause: 'restart' }] });
    expect(m.v.el.querySelectorAll('.lr-inf-prep')).toHaveLength(0);
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-setby')).toBe(INFUSION_WORDS.setBefore);
    // a discarded or emptied preparation leaves the start list
    m.news('made', propofol());
    m.news('discarded', propofol());
    expect(m.v.el.querySelectorAll('.lr-inf-prep')).toHaveLength(0);
    m.off();
  });
});

describe("a drug on one pump channel is offered that channel's range, as the host checks it", () => {
  const DEVICES = shippedPumpDevices() as NonNullable<ReturnType<typeof shippedPumpDevices>>;
  type Pump = NonNullable<DrugsEvent['pumps']>[number];
  const pump = (o: Partial<Pump> & Pick<Pump, 'ch' | 'kind'>): Pump => ({
    state: 'running', programmed: null, contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } }, syringeMl: null, set: null, mode: 'rate',
    rate: null, rateMlH: 20, limitMl: null, volumeMl: 30, infusedMl: 1, wasteMl: 0, timeToEmptyMin: null, alarms: [], tci: null, ...o,
  });
  const withPumps = (e: DrugsEvent, pumps: Pump[]): DrugsEvent => ({ ...e, pumps });
  const propofolRunning = (ml: number) => drugs([{ id: 'propofol', rate: (ml * 10) / 60, amountUnit: 'mg' }]);
  const offered = (m: ReturnType<typeof mount>, d: string) => {
    const i = m.q<HTMLInputElement>(`.lr-inf[data-drug="${d}"] .stepper input`);
    return { min: Number(i.min), max: Number(i.max), step: Number(i.step), value: Number(i.value) };
  };
  const range = (kind: 'syringe' | 'drip', c: { syringeMl: number | null; set: number | null }) => rateRange(kind, c, DEVICES) as RateRange;
  const limits = (r: RateRange) => ({ min: r.min, max: r.max, step: r.step });

  it("a syringe channel: the SP-500's range for the loaded syringe, the channel's own mL/h, and a typed rate kept inside the range", async () => {
    const m = mount();
    await m.settle();
    const sizes = DEVICES['sp-500'].syringes.map((s) => s.ml);
    const big = Math.max(...sizes);
    const small = Math.min(...sizes);
    m.engine(withPumps(propofolRunning(20), [pump({ ch: 1, kind: 'syringe', syringeMl: big, rateMlH: 20 })]));
    expect(offered(m, 'propofol')).toEqual({ ...limits(range('syringe', { syringeMl: big, set: null })), value: 20 });
    expect(m.text('.lr-inf[data-drug="propofol"] .lr-rate')).toBe('20 mL/h');
    const input = m.q<HTMLInputElement>('.lr-inf[data-drug="propofol"] .stepper input');
    input.value = String(range('syringe', { syringeMl: big, set: null }).max * 2);
    input.dispatchEvent(new Event('change'));
    m.q<HTMLButtonElement>('.lr-inf[data-drug="propofol"] .lr-change-btn').click();
    expect(m.sent.at(-1)).toMatchObject({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: range('syringe', { syringeMl: big, set: null }).max });
    // the syringe on that channel is changed for the smallest size: the offer follows it
    m.engine(withPumps(propofolRunning(20), [pump({ ch: 1, kind: 'syringe', syringeMl: small, rateMlH: 20 })]));
    expect(offered(m, 'propofol')).toMatchObject(limits(range('syringe', { syringeMl: small, set: null })));
    expect(offered(m, 'propofol').value).toBeLessThanOrEqual(range('syringe', { syringeMl: small, set: null }).max);
  });

  it("a drip channel: the OT-701's range and step for the programmed set", async () => {
    const m = mount();
    await m.settle();
    const set = Math.max(...DEVICES['ot-701'].sets.map((s) => s.dropsPerMl));
    m.engine(withPumps(propofolRunning(40), [pump({ ch: 3, kind: 'drip', set, rateMlH: 40 })]));
    expect(offered(m, 'propofol')).toEqual({ ...limits(range('drip', { syringeMl: null, set })), value: 40 });
  });

  it("the refusal is the host's words for that channel", async () => {
    const m = mount();
    await m.settle();
    const c = { syringeMl: Math.max(...DEVICES['sp-500'].syringes.map((s) => s.ml)), set: null };
    m.engine(withPumps(propofolRunning(20), [pump({ ch: 1, kind: 'syringe', ...c })]));
    m.q<HTMLButtonElement>('.lr-inf[data-drug="propofol"] .lr-change-btn').click();
    const r = range('syringe', c);
    const why = rateRefusal(r.max + 1, 'mL/h', 'syringe', { ch: 1, kind: 'syringe', ...c, contents: null, programmed: null, rate: null, tci: null, running: true, by: {}, mismatch: null }, DEVICES) as string;
    m.ack(String(m.sent.at(-1)?.id), false, why);
    expect(m.text('.lr-inf-said')).toBe(INFUSION_WORDS.notChanged('Propofol', why));
  });

  it('on no channel, on two, or stopped on its channel: the range of an infusion on no pump channel, as before; Start always offers that range', async () => {
    const m = mount();
    await m.settle();
    const old = { min: INFUSION_ML_H.min, max: INFUSION_ML_H.max, step: INFUSION_ML_H.step };
    const sp = (ch: number, state: Pump['state'] = 'running') => pump({ ch, kind: 'syringe', syringeMl: DEVICES['sp-500'].syringes[0]?.ml ?? null, state });
    m.engine(withPumps(propofolRunning(20), []));
    expect(offered(m, 'propofol')).toMatchObject(old);
    m.engine(withPumps(propofolRunning(20), [sp(1), sp(2)]));
    expect(offered(m, 'propofol')).toMatchObject(old);
    m.engine(withPumps(propofolRunning(20), [sp(1, 'alarm')]));
    expect(offered(m, 'propofol')).toMatchObject(old);
    m.engine(withPumps(propofolRunning(20), [sp(1)]));
    m.news('made', propofol());
    const start = m.q<HTMLInputElement>('.lr-inf-prep .stepper input');
    expect({ min: Number(start.min), max: Number(start.max), step: Number(start.step) }).toEqual(old);
  });
});
