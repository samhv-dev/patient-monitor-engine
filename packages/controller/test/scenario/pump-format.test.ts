// Plan pump-rack-tci.md C2 (§7 "Record", §8 "Grading", PQ3 = A): the /2 format learns a pump channel's acts. A pump's act
// is `source: 'pump'` with the tablet's device key `by` and its `channel`, its drug the channel's TRUE contents; a pump
// bolus is a bolus (graded with no "over N s" line, its seconds kept as `bolusS`); a rate, a start and a stop are the
// channel's infusion; a load or a programme gives no administration. A mismatched channel that delivers is a violation of
// source 'pump', harm modelled. The commands carry the host's metadata as host-session.ts writes it (host-pump.test.ts
// pins that the host writes it).
import { describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { grade } from '../../src/scenario/grade.ts';
import type { Action, Administration, PhaseEntry, ScenarioDocV2 } from '../../src/scenario/types-v2.ts';
import { PUMP_ISSUED_BY, type PumpMeta } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';

const KEY = 'pumptab0001';
const PROPOFOL = { drugId: 'propofol', concentration: { amount: 10, unit: 'mg' as const, perMl: 1 } };
const CARD = {
  schema: 'pme-scenario/2', id: 'c2rec', title: 'C2 record', patient: { weightKg: 80 },
  phases: [{ id: 'calm', label: 'Calm', initial: true }],
  actions: [{ id: 'propofol', label: 'Propofol', kind: 'drug', phases: ['calm'], drug: { id: 'propofol' } }],
};

function rig() {
  const host = manualHost({ seed: 42 });
  const driver = new ScenarioDriver({ target: host });
  expect(driver.load(CARD).ok).toBe(true);
  host.engine.advanceTo(1);
  driver.poll();
  let n = 0;
  /** A pump press as the host applies it (applyEvent pump, issuedBy 'pump', by, PumpMeta), then two ticks. */
  const press = (event: Record<string, unknown>, pump: PumpMeta, issuedBy = PUMP_ISSUED_BY, by = KEY) => {
    const r = driver.host.dispatch({ id: `p${++n}`, issuedBy, by, type: 'applyEvent', event: { kind: 'pump', ch: pump.ch, ...event }, pump } as unknown as Command);
    host.engine.advanceTo(host.engine.now().simT + 0.04);
    return r as { accepted: boolean; reason?: string };
  };
  return { host, driver, press };
}

describe('C2: a pump channel\'s acts in the administration record (driver.ts administrationOf)', () => {
  it('a load and a programme give none; a start is the infusion at the channel\'s rate; a bolus is a bolus of the true contents with its seconds; a stop is the infusion at 0', () => {
    const { driver, press } = rig();
    const k = { ch: 2, contents: PROPOFOL };
    expect(press({ action: 'load', channel: 'syringe', contents: { ...PROPOFOL, volumeMl: 50 }, syringeMl: 50 }, { ch: 2, origin: { stock: 'propofol-10mg-ml-50ml' } }).accepted).toBe(true);
    expect(press({ action: 'program', ...PROPOFOL }, k).accepted).toBe(true);
    expect(press({ action: 'rate', rate: 20, unit: 'mL/h' }, k).accepted).toBe(true);
    expect(driver.phaseRunner!.admin).toEqual([]);
    expect(press({ action: 'start' }, { ...k, infusion: { rate: 20, unit: 'mL/h' } }).accepted).toBe(true);
    expect(press({ action: 'bolus', volumeMl: 2, rateMlH: 800 }, { ...k, gives: 'propofol', bolus: { volumeMl: 2, dose: 20, unit: 'mg', seconds: 9 } }).accepted).toBe(true);
    expect(press({ action: 'rate', rate: 30, unit: 'mL/h' }, { ...k, infusion: { rate: 30, unit: 'mL/h' }, replaced: [{ what: 'rate', rate: 20, unit: 'mL/h', by: KEY }] }).accepted).toBe(true);
    expect(press({ action: 'stop' }, { ...k, infusion: { rate: 0, unit: 'mL/h' } }).accepted).toBe(true);
    const a = driver.phaseRunner!.admin;
    expect(a.map((x) => [x.source, x.by, x.channel, x.kind, x.rate ?? x.dose])).toEqual([
      ['pump', KEY, 2, 'infusion', 20], ['pump', KEY, 2, 'drug', 20], ['pump', KEY, 2, 'infusion', 30], ['pump', KEY, 2, 'infusion', 0],
    ]);
    expect(a[1]).toMatchObject({ drugId: 'propofol', cls: expect.any(String), unit: 'mg', perKg: 0.25, route: 'iv', bolusS: 9 });
    expect(a[1]).not.toHaveProperty('overS');
    expect(a[2]!.replaced).toEqual({ rate: 20, rateUnit: 'mL/h', by: KEY });
  });

  it('a remote\'s change routed to a channel (D9) is the remote\'s act on that channel; the drug is the contents, not the programme', () => {
    const { driver, press } = rig();
    const remi = { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg' as const, perMl: 1 } };
    press({ action: 'load', channel: 'syringe', contents: { ...remi, volumeMl: 50 }, syringeMl: 50 }, { ch: 1 });
    press({ action: 'program', ...PROPOFOL }, { ch: 1, contents: remi });
    press({ action: 'rate', rate: 10, unit: 'mL/h' }, { ch: 1, contents: remi });
    press({ action: 'start' }, { ch: 1, contents: remi, infusion: { rate: 10, unit: 'mL/h' }, mismatch: { programmed: PROPOFOL } });
    press({ action: 'rate', rate: 12, unit: 'mL/h' }, { ch: 1, contents: remi, infusion: { rate: 12, unit: 'mL/h' }, mismatch: { programmed: PROPOFOL } }, 'learner', 'bed2remote01');
    const [start, routed] = driver.phaseRunner!.admin;
    expect(start).toMatchObject({ source: 'pump', drugId: 'remifentanil', channel: 1, mismatch: { contents: 'remifentanil 50 mcg/mL', programmed: 'propofol 10 mg/mL' } });
    expect(routed).toMatchObject({ source: 'learner', by: 'bed2remote01', channel: 1, kind: 'infusion', rate: 12 });
  });
});

describe('C2: grading a pump\'s acts (grade.ts)', () => {
  const card = (actions: Array<Partial<Action>>): ScenarioDocV2 => ({
    schema: 'pme-scenario/2', id: 'c2', title: 'C2', patient: { weightKg: 80 },
    phases: [{ id: 'base', label: 'Base', initial: true }],
    actions: actions.map((a) => ({ id: 'x', label: 'X', kind: 'drug', phases: ['base'], ...a }) as Action),
  });
  const PH: PhaseEntry[] = [{ id: 'base', t: 0, rule: 'initial' }];
  let seq = 0;
  const adm = (t: number, x: Partial<Administration>): Administration => ({ seq: ++seq, t, source: 'pump', by: KEY, channel: 1, kind: 'drug', result: { accepted: true }, ...x });

  it('PQ3 = A: a pump bolus satisfies a bolus action with no "over N s" line (its seconds are bolusS, not overS)', () => {
    const doc = card([{ id: 'induce', drug: { id: 'propofol', dose: { min: 1, max: 3, unit: 'mg/kg' }, rate: { bolus: true } }, window: { anchor: 'phase:base', withinS: 300 } }]);
    const g = grade(doc, PH, [adm(20, { drugId: 'propofol', dose: 160, unit: 'mg', perKg: 2, route: 'iv', bolusS: 72 })], [], 400, { final: true });
    expect(g.actions[0]).toMatchObject({ grade: 'met' });
    expect(g.actions[0]!.lines.join(' ')).not.toMatch(/over/);
    expect(g.violations).toEqual([]);
    // the same seconds as `overS` would have been the line PQ3 = A keeps off a pump bolus
    const asOver = grade(doc, PH, [adm(20, { drugId: 'propofol', dose: 160, unit: 'mg', perKg: 2, route: 'iv', overS: 72 })], [], 400, { final: true });
    expect(asOver.actions[0]!.lines).toContain('over 72 s, bolus asked');
  });

  it('§8: a mismatched channel that delivered is a violation of source "pump", harm modelled, one per act that gave its contents; a stop gives none', () => {
    const mm = { contents: 'remifentanil 50 mcg/mL', programmed: 'propofol 10 mg/mL' };
    const g = grade(card([]), PH, [
        adm(30, { kind: 'infusion', drugId: 'remifentanil', rate: 10, rateUnit: 'mL/h', mismatch: mm }),
        adm(40, { kind: 'drug', drugId: 'remifentanil', dose: 100, unit: 'mcg', mismatch: mm }),
        adm(50, { kind: 'infusion', drugId: 'remifentanil', rate: 0, rateUnit: 'mL/h', mismatch: mm }),
        adm(60, { kind: 'infusion', drugId: 'remifentanil', rate: 10, rateUnit: 'mL/h', mismatch: mm, result: { accepted: false, reason: 'x', routeNotModelled: false } }),
    ], [], 400, { final: true });
    expect(g.violations).toEqual([
      { t: 30, seq: expect.any(Number), action: 'pump:1', text: 'channel 1: remifentanil 50 mcg/mL programmed as propofol 10 mg/mL', harm: 'modelled', source: 'pump' },
      { t: 40, seq: expect.any(Number), action: 'pump:1', text: 'channel 1: remifentanil 50 mcg/mL programmed as propofol 10 mg/mL', harm: 'modelled', source: 'pump' },
    ]);
  });
});
