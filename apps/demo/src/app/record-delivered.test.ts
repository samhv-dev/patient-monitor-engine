// The record's drug totals and pump alarms read the engine's own account: a real engine is given boluses and pump
// channels, each command and every event the engine raises go to the host's record, and the Debrief's line of each drug is the amount the engine
// counted by every route, with the boluses counted and the infusion named. A pump channel's alarm is an alarm row of the
// record, raised when the channel stopped and ended when a command cleared it.
import type { WireEvent } from '@pme/controller';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { givenLines } from './debrief.ts';
import { RunRecord } from './record.ts';

const PROPOFOL_10 = { amount: 10, unit: 'mg', perMl: 1 };
const PHENYLEPHRINE_100 = { amount: 100, unit: 'mcg', perMl: 1 };

function bench() {
  const e = createEngine({ seed: 7, patient: { ageY: 35, sex: 'M', weightKg: 70, heightCm: 170 } } as never);
  const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }));
  e.on((x: EngineEvent) => r.engine(x), ['drugs', 'pumpAlarm']);
  let n = 0;
  let t = 0;
  const cmd = (event: Record<string, unknown>) => {
    const command = { id: `c${++n}`, issuedBy: 'instructor', type: 'applyEvent', event };
    const res = e.dispatch(command as never);
    expect(res.reason).toBeUndefined();
    r.wire({ type: 'commandApplied', commandId: command.id, tick: res.tick, resolved: { command } } as WireEvent); // the host's own record of the command
    run(0.04); // a command applies on the next 20 ms tick; the next one is validated against it
  };
  const run = (s: number) => e.advanceTo((t += s));
  const syringe = (ch: number, rate: number) => {
    cmd({ kind: 'pump', action: 'load', ch, channel: 'syringe', syringeMl: 50, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 50 } });
    cmd({ kind: 'pump', action: 'program', ch, drugId: 'propofol', concentration: PROPOFOL_10 });
    cmd({ kind: 'pump', action: 'rate', ch, rate, unit: 'mL/h' });
  };
  const bolus = (mg: number) => cmd({ kind: 'drug', drugId: 'propofol', dose: mg, unit: 'mg', route: 'iv' });
  const delivered = () => r.data.delivered?.propofol?.amount ?? 0;
  return { r, cmd, run, syringe, bolus, delivered, line: () => givenLines(r.data).find((x) => x.drugId === 'propofol')?.text };
}

/** Propofol 10 mg/mL at `mlH` for `s` seconds, in mg. */
const mgAt = (mlH: number, s: number) => (mlH * 10 * s) / 3600;

describe('the drug totals are the engine\'s own amount given', () => {
  it('boluses only: the boluses, counted', () => {
    const b = bench();
    b.bolus(100);
    b.run(5);
    b.bolus(50);
    b.run(5);
    expect(b.delivered()).toBeCloseTo(150, 6);
    expect(b.line()).toBe('Propofol: 150 mg in all (2 boluses)');
  });

  it('a pump channel only: what the channel delivered, named as an infusion', () => {
    const b = bench();
    b.syringe(1, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    expect(b.delivered()).toBeCloseTo(mgAt(36, 100), 0);
    expect(b.line()).toMatch(/^Propofol: [\d.]+ mg in all \(by infusion\)$/);
  });

  it('boluses and a pump channel: both in one amount', () => {
    const b = bench();
    b.syringe(1, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(50);
    b.bolus(100);
    b.run(50);
    expect(b.delivered()).toBeCloseTo(100 + mgAt(36, 100), 0);
    expect(b.line()).toMatch(/^Propofol: [\d.]+ mg in all \(1 bolus and by infusion\)$/);
  });

  it('a rate change: each rate for its own time', () => {
    const b = bench();
    b.syringe(1, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    b.cmd({ kind: 'pump', action: 'rate', ch: 1, rate: 72, unit: 'mL/h' });
    b.run(100);
    expect(b.delivered()).toBeCloseTo(mgAt(36, 100) + mgAt(72, 100), 0);
  });

  it('a channel stopped and started again: nothing while it was stopped', () => {
    const b = bench();
    b.syringe(1, 36);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    b.cmd({ kind: 'pump', action: 'stop', ch: 1 });
    b.run(100);
    const stopped = b.delivered();
    expect(stopped).toBeCloseTo(mgAt(36, 100), 0);
    b.cmd({ kind: 'pump', action: 'start', ch: 1 });
    b.run(100);
    expect(b.delivered()).toBeCloseTo(2 * mgAt(36, 100), 0);
  });

  it('a drug the engine models as a dose-response curve: its infusion is said to be outside the amount', () => {
    const b = bench();
    b.cmd({ kind: 'drug', drugId: 'midazolam', dose: 2, unit: 'mg', route: 'iv' });
    b.cmd({ kind: 'infusion', drugId: 'midazolam', rate: 0.05, unit: 'mg/kg/h' });
    b.run(5);
    expect(givenLines(b.r.data).find((x) => x.drugId === 'midazolam')?.text).toBe('Midazolam: 2 mg in all (1 bolus and by infusion); the infusion is not counted in this amount');
  });

  it('a record without the engine\'s amounts keeps its bolus totals', () => {
    const b = bench();
    b.bolus(100);
    b.run(2);
    delete b.r.data.delivered;
    expect(b.line()).toBe('Propofol: 100 mg in 1 bolus');
  });
});

describe('a pump channel\'s alarm in the record', () => {
  it('raised when the channel stops, ended when a command clears it, with the channel and the drug', () => {
    const b = bench();
    b.cmd({ kind: 'pump', action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'phenylephrine', concentration: PHENYLEPHRINE_100, volumeMl: 100 } });
    b.cmd({ kind: 'pump', action: 'program', ch: 2, drugId: 'phenylephrine', concentration: PHENYLEPHRINE_100, set: 20 });
    b.cmd({ kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 1 });
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(70);
    const row = () => b.r.data.rows.find((x) => x.ev === 'alarm:pump:2:infusionComplete');
    expect(row()).toMatchObject({ kind: 'alarm', text: 'Pump channel 2 (Phenylephrine): Infusion Complete' });
    const raisedAt = row()?.t as number;
    expect(raisedAt).toBeGreaterThan(59);
    expect(raisedAt).toBeLessThan(61); // 1 mL at 60 mL/h from its start
    expect(row()?.endT).toBeUndefined();
    b.cmd({ kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 2 });
    b.cmd({ kind: 'pump', action: 'start', ch: 2 });
    b.run(2);
    const endT = row()?.endT as number;
    expect(endT).toBeGreaterThan(70);
    expect(b.r.data.rows.filter((x) => x.kind === 'alarm')).toHaveLength(1);
    expect(b.r.data.rows.filter((x) => x.kind === 'pump' && x.channel === 2).map((x) => [x.t, x.text])).toEqual([[endT, 'Pump channel 2 (Phenylephrine): Infusion Complete ended']]);
  });
});
