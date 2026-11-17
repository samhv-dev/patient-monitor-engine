// The record's drug totals and pump alarms read the engine's own account: a real engine is given boluses, infusions and
// pump channels; each command (as the host files it) and every event the engine raises go to the host's record; the
// Debrief's line of each drug is the engine's amount at its last reading with the boluses that reading includes, and
// says what the amount leaves out. A pump channel's alarm is an alarm row, raised at the engine's event and ended at the
// command that cleared it.
import type { WireEvent } from '@pme/controller';
import { createEngine, type DrugsEvent, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { givenLines, givenText } from './debrief.ts';
import { RunRecord } from './record.ts';

const PROPOFOL_10 = { amount: 10, unit: 'mg', perMl: 1 };
const KETAMINE_10 = { amount: 10, unit: 'mg', perMl: 1 };
const PHENYLEPHRINE_100 = { amount: 100, unit: 'mcg', perMl: 1 };
const REF = { ageY: 35, sex: 'M', weightKg: 70, heightCm: 170 };

function bench(r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }))) {
  const e = createEngine({ seed: 7, patient: REF } as never);
  let last: DrugsEvent | null = null;
  e.on((x: EngineEvent) => {
    if (x.type === 'drugs') last = x;
    r.engine(x);
  }, ['drugs', 'pumpAlarm']);
  let n = 0;
  let t = 0;
  const run = (s: number) => e.advanceTo((t += s));
  /** Dispatch as the host does, file it as the host does (its commandApplied), and let it apply. */
  const send = (command: Record<string, unknown>) => {
    const c = { id: `c${++n}`, issuedBy: 'instructor', ...command };
    const res = e.dispatch(c as never);
    expect(res.reason).toBeUndefined();
    r.wire({ type: 'commandApplied', commandId: c.id, tick: res.tick, resolved: { command: c } } as WireEvent);
    return res.tick;
  };
  const cmd = (event: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
    const tick = send({ type: 'applyEvent', event, ...extra });
    run(0.04); // a command applies on the next 20 ms tick; the next one is validated against it
    return tick;
  };
  const syringe = (ch: number, drugId: string, c: typeof PROPOFOL_10, rate: number) => {
    cmd({ kind: 'pump', action: 'load', ch, channel: 'syringe', syringeMl: 50, contents: { drugId, concentration: c, volumeMl: 50 } });
    cmd({ kind: 'pump', action: 'program', ch, drugId, concentration: c });
    if (rate) cmd({ kind: 'pump', action: 'rate', ch, rate, unit: 'mL/h' });
  };
  const bolus = (drugId: string, mg: number, overS?: number) => cmd({ kind: 'drug', drugId, dose: mg, unit: 'mg', route: 'iv', ...(overS ? { overS } : {}) });
  /** A bookmark, as the host files it (the host keeps the snapshot; the engine is not told). */
  const mark = (label: string) => {
    r.wire({ type: 'commandApplied', commandId: `mark${label}`, tick: Math.round(t / 0.02), resolved: { command: { id: `mark${label}`, type: 'scenario', action: 'bookmark', target: label } } } as WireEvent);
    return { snap: e.snapshot(), at: t };
  };
  const back = (label: string, m: { snap: ReturnType<typeof e.snapshot>; at: number }) => {
    e.restore(m.snap);
    t = m.at;
    r.wire({ type: 'commandApplied', commandId: `back${label}`, tick: Math.round(t / 0.02), resolved: { command: { id: `back${label}`, type: 'scenario', action: 'restoreBookmark', target: label } } } as WireEvent);
    r.wire({ type: 'timeline', t, tick: Math.round(t / 0.02), cause: 'restore' } as WireEvent);
  };
  /** A reload of the page: this engine takes up another's state at sim time `at`. */
  const adopt = (snap: ReturnType<typeof e.snapshot>, at: number) => {
    e.restore(snap);
    t = at;
  };
  const engineAmount = (id: string) => (last as DrugsEvent | null)?.drugs.find((d) => d.id === id)?.totalAmount ?? 0;
  const line = (id: string) => givenLines(r.data).find((x) => x.drugId === id)?.text;
  return { e, r, adopt, cmd, run, syringe, bolus, mark, back, engineAmount, line, now: () => t };
}

/** Propofol 10 mg/mL at `mlH` for `s` seconds, in mg. */
const mgAt = (mlH: number, s: number) => (mlH * 10 * s) / 3600;

describe("the drug totals are the engine's own amount given", () => {
  it('boluses only: the boluses, counted', () => {
    const b = bench();
    b.bolus('propofol', 100);
    b.run(5);
    b.bolus('propofol', 50);
    b.run(5);
    expect(b.engineAmount('propofol')).toBe(150);
    expect(b.line('propofol')).toBe('Propofol: 150 mg in all (2 boluses)');
  });

  it('a pump channel only: the engine\'s figure, named an infusion', () => {
    const b = bench();
    b.syringe(1, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(mgAt(36, 100), 1);
    expect(b.line('propofol')).toBe(`Propofol: ${givenText(b.engineAmount('propofol'), 'mg')} in all (an infusion)`);
  });

  it('boluses and a pump channel: both in one amount', () => {
    const b = bench();
    b.syringe(1, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(50);
    b.bolus('propofol', 100);
    b.run(50);
    expect(b.engineAmount('propofol')).toBeCloseTo(100 + mgAt(36, 100), 1);
    expect(b.line('propofol')).toBe(`Propofol: ${givenText(b.engineAmount('propofol'), 'mg')} in all (1 bolus and an infusion)`);
  });

  it('a rate change: each rate for its own time', () => {
    const b = bench();
    b.syringe(1, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    b.cmd({ kind: 'pump', action: 'rate', ch: 1, rate: 72, unit: 'mL/h' });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(mgAt(36, 100) + mgAt(72, 100), 1);
  });

  it('a channel stopped and started again: nothing while it was stopped', () => {
    const b = bench();
    b.syringe(1, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    b.cmd({ kind: 'pump', action: 'stop', ch: 1 });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(mgAt(36, 100), 1);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(2 * mgAt(36, 100), 1);
  });

  it('two channels of one drug add; a syringe change goes on adding; a channel reloaded with another drug files under it', () => {
    const b = bench();
    b.syringe(1, 'propofol', PROPOFOL_10, 36);
    b.syringe(2, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(2 * mgAt(36, 100), 1);
    b.cmd({ kind: 'pump', action: 'unload', ch: 2 });
    b.syringe(2, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(4 * mgAt(36, 100), 1);
    b.cmd({ kind: 'pump', action: 'unload', ch: 2 });
    b.syringe(2, 'ketamine', KETAMINE_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(100);
    expect(b.engineAmount('propofol')).toBeCloseTo(5 * mgAt(36, 100), 1);
    expect(b.line('ketamine')).toBe('Ketamine: given by an infusion, which the engine keeps no amount of');
  });

  it('a TCI channel: the engine\'s figure, named an infusion', () => {
    const b = bench();
    b.syringe(1, 'propofol', PROPOFOL_10, 0);
    b.cmd({ kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient: { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' } });
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(120);
    expect(b.engineAmount('propofol')).toBeGreaterThan(0);
    expect(b.line('propofol')).toBe(`Propofol: ${givenText(b.engineAmount('propofol'), 'mg')} in all (an infusion)`);
  });

  it('a bolus given over time is a bolus, not an infusion', () => {
    const b = bench();
    b.bolus('propofol', 100, 60);
    b.run(70);
    expect(b.line('propofol')).toBe('Propofol: 100 mg in all (1 bolus)');
  });

  it('a bolus the engine has not read yet (the case paused before its next reading) is said apart from the amount', () => {
    const b = bench();
    b.bolus('propofol', 100);
    b.run(3);
    b.bolus('propofol', 50); // applied, but the panel's next reading is up to a second later
    expect(b.line('propofol')).toBe('Propofol: 100 mg (1 bolus); 1 bolus after 00:03 (50 mg) not yet in this amount');
    b.run(1);
    expect(b.line('propofol')).toBe('Propofol: 150 mg in all (2 boluses)');
  });

  it('a drug whose amount counts doses only: a pump bolus and an infusion are named as outside it', () => {
    const b = bench();
    b.syringe(1, 'ketamine', KETAMINE_10, 0);
    b.cmd({ kind: 'pump', action: 'bolus', ch: 1, volumeMl: 2, rateMlH: 800 }, { pump: { ch: 1, contents: { drugId: 'ketamine', concentration: KETAMINE_10 }, bolus: { volumeMl: 2, dose: 20, unit: 'mg', seconds: 9 } } });
    b.run(15);
    b.bolus('ketamine', 30);
    b.run(2);
    expect(b.engineAmount('ketamine')).toBe(30);
    expect(b.line('ketamine')).toBe('Ketamine: 30 mg (1 bolus); not counted in this amount: 1 pump bolus (20 mg)');
  });

  it('an infusion of such a drug stays said after it stops, and goes with a return to before it', () => {
    const b = bench();
    b.bolus('midazolam', 2);
    b.run(2);
    const m = b.mark('Before');
    b.cmd({ kind: 'infusion', drugId: 'midazolam', rate: 0.05, unit: 'mg/kg/h' });
    b.run(5);
    b.cmd({ kind: 'infusion', drugId: 'midazolam', rate: 0, unit: 'mg/kg/h' });
    b.run(3);
    expect(b.line('midazolam')).toBe('Midazolam: 2 mg (1 bolus); not counted in this amount: an infusion');
    b.back('Before', m);
    expect(b.line('midazolam')).toBe('Midazolam: the engine has not read its amount since the return to the bookmark');
    b.run(2);
    expect(b.line('midazolam')).toBe('Midazolam: 2 mg in all (1 bolus)');
  });

  it('a return to a bookmark rewinds the amount and the infusion; a reload of the page keeps them', () => {
    const b = bench();
    b.bolus('propofol', 100);
    b.run(2);
    const m = b.mark('Before');
    b.syringe(1, 'propofol', PROPOFOL_10, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    b.back('Before', m);
    b.run(2);
    expect(b.line('propofol')).toBe('Propofol: 100 mg in all (1 bolus)');
    // a reload: a new page's record resumes the kept one at the engine's time and reads the amount at its next panel
    const again = bench(new RunRecord(() => ({ patient: 'P', weightKg: 70 })));
    again.r.resume(b.r.keep(), b.now());
    again.adopt(b.e.snapshot(), b.now());
    again.run(2);
    expect(again.line('propofol')).toBe('Propofol: 100 mg in all (1 bolus)');
  });

  it('a record without the engine\'s amounts keeps its bolus totals', () => {
    const b = bench();
    b.bolus('propofol', 100);
    b.run(2);
    delete b.r.data.given;
    expect(b.line('propofol')).toBe('Propofol: 100 mg in 1 bolus');
  });
});

describe("a pump channel's alarm in the record", () => {
  const drip = (b: ReturnType<typeof bench>, limitMl: number) => {
    b.cmd({ kind: 'pump', action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'phenylephrine', concentration: PHENYLEPHRINE_100, volumeMl: 100 } });
    b.cmd({ kind: 'pump', action: 'program', ch: 2, drugId: 'phenylephrine', concentration: PHENYLEPHRINE_100, set: 20 });
    b.cmd({ kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl });
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
  };
  const ALARM = 'Pump channel 2 (Phenylephrine): Infusion Complete';
  const alarms = (b: ReturnType<typeof bench>) => b.r.data.rows.filter((x) => x.ev === 'alarm:pump:2:infusionComplete');

  it('raised at the engine\'s event, ended at the tick of the start that cleared it, with the channel\'s row', () => {
    const b = bench();
    drip(b, 1);
    b.run(70);
    expect(alarms(b)).toHaveLength(1);
    expect(alarms(b)[0]).toMatchObject({ kind: 'alarm', text: ALARM });
    b.cmd({ kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 2 });
    const tick = b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(2);
    expect(alarms(b)[0]?.endT).toBe(tick * 0.02);
    expect(b.r.data.rows.filter((x) => x.kind === 'pump' && x.text.endsWith('ended')).map((x) => [x.t, x.channel, x.text])).toEqual([[tick * 0.02, 2, `${ALARM} ended`]]);
  });

  it('cleared and raised again within one second: two alarm rows, the first ended', () => {
    const b = bench();
    drip(b, 1);
    b.run(70);
    const infused = 1;
    b.cmd({ kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: infused + 0.005 }); // 0.3 s at 60 mL/h
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(0.9);
    const rows = alarms(b);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.endT).toBeDefined();
    expect(rows[1]?.endT).toBeUndefined();
    expect((rows[1]?.t ?? 0) - (rows[0]?.endT ?? 0)).toBeLessThan(1);
  });

  it('a mismatched syringe: the alarm names what it holds and its programme', () => {
    const b = bench();
    b.cmd({ kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg', perMl: 1 }, volumeMl: 0.2 } });
    b.cmd({ kind: 'pump', action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10 });
    b.cmd({ kind: 'pump', action: 'rate', ch: 1, rate: 36, unit: 'mL/h' });
    b.run(2);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(30);
    expect(b.r.data.rows.find((x) => x.ev === 'alarm:pump:1:end')?.text).toBe('Pump channel 1 (Remifentanil, programmed as Propofol): End');
  });
});
