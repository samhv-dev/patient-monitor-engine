// Defibrillator plan E1 (docs/plans/defibrillator-zoll-m2.md §2.1 D1, D3, D8, D9, D13, D14, §2.4 S4–S6, §6 E1; brief
// 215): the ZOLL M2's Manual and Sync behaviour and its patient type, each rule from its page of the Operator's Guide,
// [G n-m] (REF 9650-000873-01 Rev. C): the Mode Selector and the power-off memory, the patient type, the automatic
// energy escalation, the disarm rules, the configured ready time-out and the tones, Sync persistence and Sync blocked on
// lead-off, the internal paddles' limits through all of it, and the top trace by mode, which the sync detector reads.
// A room on the generic model is unchanged.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { INTERNAL_MAX_REASON } from '../../src/l3/defib-pacer/connections.ts';
import { M2_LEADS, M2_TONES, OFF_MEMORY_S, readyToneSplit, syncLeadOf } from '../../src/l3/defib-pacer/m2.ts';
import { createM2State } from '../../src/l3/defib-pacer/m2-vocabulary.ts';
import { createSyncState, syncStep } from '../../src/l3/defib-pacer/sync.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, devRig, markers } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
type Tone = Extract<EngineEvent, { type: 'tone' }>;
const statuses = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus');
const lastStatus = (ev: EngineEvent[]) => statuses(ev).pop()!;
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const m2 = (action: string, value?: unknown): Command => cmd({ type: 'device', action: { device: 'defib', action, ...(value === undefined ? {} : { value }) } as never });
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } as never });
const selector = (v: string) => m2('selector', v);
const patientType = (v: string) => m2('patientType', v);
const lead = (v: string) => m2('lead', v);
const connect = (v: Record<string, unknown>) => m2('connect', v);
const config = (v: Record<string, unknown>) => m2('config', v);
const panel = (phase: 'down' | 'up') => m2('shockButton', { phase, button: 'panel' });
const INTERNAL = { therapy: 'internalHandles', internal: { dischargeButton: false, contact: 'good' } };
const PADDLES = { therapy: 'externalPaddles', paddles: { pediPlates: false, shockButtons: true, contact: 'good' } };

/** An M2 (or generic) room, advanced to 1 s. */
function room(m: string | null = 'zoll-m2', opts: Parameters<typeof devRig>[1] = {}): { e: MonitorEngine; ev: EngineEvent[] } {
  const r = devRig('saadat-like', opts);
  if (m) expect(r.e.dispatch(model(m)).accepted).toBe(true);
  r.e.advanceTo(1);
  return r;
}
const ok = (e: MonitorEngine, c: Command) => {
  const r = e.dispatch(c);
  expect(r.accepted, r.reason).toBe(true);
};
const after = (e: MonitorEngine, s: number) => e.advanceTo(e.now().simT + s);
/** Charge at the selected energy and wait until ready (≤ 7 s to 200 J, defib.ts). */
function chargeReady(e: MonitorEngine, ev: EngineEvent[]): void {
  ok(e, defib('charge'));
  after(e, 8);
  expect(lastStatus(ev).defib!.state).toBe('ready');
}
/** Charge, wait, shock (front panel), and wait for the shock to land; returns the energy shocked. */
function shockNow(e: MonitorEngine, ev: EngineEvent[]): number {
  after(e, 0.05); // a command dispatched just before is applied at the next tick
  const j = lastStatus(ev).defib!.energyJ;
  chargeReady(e, ev);
  ok(e, defib('shock'));
  after(e, 0.5);
  return j;
}
const energy = (ev: EngineEvent[]) => lastStatus(ev).defib!.energyJ;
const st = (ev: EngineEvent[]) => lastStatus(ev).m2!;

describe('E1: the Mode Selector [G 2-4] and the power-off memory [G 1-23], [G 3-1]', () => {
  it('OFF powers the unit off: offSinceS set, a charged unit disarms [G 1-13], and therapy is refused until it is on again', () => {
    const { e, ev } = room();
    chargeReady(e, ev);
    ok(e, selector('off'));
    after(e, 0.1);
    expect(lastStatus(ev).defib!.state).toBe('idle');
    expect(markers(ev, 'disarm').length).toBe(1);
    expect(st(ev).power).toMatchObject({ selector: 'off', offSinceS: expect.closeTo(e.now().simT - 0.1, 1) });
    for (const c of [defib('charge'), defib('selectEnergy', { energyJ: 150 }), defib('syncOn'), patientType('pediatric'), lead('II')]) {
      const r = e.dispatch(c);
      expect(r.accepted).toBe(false);
      expect(r.reason).toMatch(/Mode Selector is at OFF/);
    }
    ok(e, connect({ therapy: 'externalPaddles' })); // what is attached is physical, not a control: still allowed
    ok(e, config({ readyTimeoutS: 30 })); // the Supervisor configuration (Room setup) is an input
    ok(e, selector('defib'));
    after(e, 0.1);
    expect(st(ev).power).toMatchObject({ selector: 'defib', offSinceS: null });
  });

  it('MONITOR disarms a charging or charged unit [G 1-13] and gives no therapy; DEFIB gives it back', () => {
    const { e, ev } = room();
    ok(e, defib('charge'));
    after(e, 1);
    ok(e, selector('monitor'));
    after(e, 0.1);
    expect(lastStatus(ev).defib!.state).toBe('idle');
    expect(e.dispatch(defib('charge')).reason).toMatch(/Mode Selector is at MONITOR/);
    ok(e, selector('defib'));
    after(e, 0.05); // a command is validated against the state at dispatch: the selector first
    ok(e, defib('charge'));
  });

  it(`off for less than ${OFF_MEMORY_S} s keeps every setting; ${OFF_MEMORY_S} s or more resets the patient settings (energy, patient type, escalation) to their defaults`, () => {
    expect(OFF_MEMORY_S).toBe(30); // [G 1-23], [G 3-1]
    const { e, ev } = room();
    ok(e, patientType('pediatric'));
    ok(e, defib('selectEnergy', { energyJ: 30 }));
    shockNow(e, ev); // a manual change outside the sequence and a shock: escalation off [G 14-3]
    expect(st(ev).escalation.on).toBe(false);
    ok(e, selector('off'));
    after(e, 29);
    ok(e, selector('defib'));
    after(e, 0.2);
    expect([st(ev).patientType, energy(ev), st(ev).escalation.on]).toEqual(['pediatric', 30, false]);
    ok(e, selector('off'));
    after(e, 30);
    ok(e, selector('defib'));
    after(e, 0.2);
    expect([st(ev).patientType, energy(ev), st(ev).escalation]).toEqual(['adult', 120, { next: 1, on: true }]);
  });

  it('the start mode (DQ4, default Manual) is read at a power-up after 30 s off; within 30 s the last mode is kept [G 12-2], [G 14-2]', () => {
    const { e, ev } = room();
    expect(st(ev).defibMode).toBe('manual');
    ok(e, config({ startMode: 'aed' }));
    after(e, 0.1);
    expect(st(ev).defibMode).toBe('manual'); // the configuration takes effect at the next power-up
    ok(e, selector('off'));
    after(e, 10);
    ok(e, selector('defib'));
    after(e, 0.1);
    expect(st(ev).defibMode).toBe('manual');
    ok(e, selector('off'));
    after(e, 31);
    ok(e, selector('defib'));
    after(e, 0.1);
    expect(st(ev).defibMode).toBe('aed');
  });

  it('the status goes out at once when the selector, the patient type or the top lead changes', () => {
    const { e, ev } = room();
    after(e, 0.3);
    const t0 = e.now().simT;
    ok(e, patientType('pediatric'));
    after(e, 0.05);
    const s = statuses(ev).find((x) => x.t > t0 && x.m2!.patientType === 'pediatric');
    expect(s, 'the status updates at once, not at the next 1 Hz status').toBeDefined();
    expect(s!.defib!.energyJ).toBe(50);
  });
});

describe('E1: the patient type [G 14-2], [G 14-3], [G 14-4]', () => {
  it('Pediatric selects the paediatric Shock 1 (50 J) and its escalation; Adult selects 120 J again', () => {
    const { e, ev } = room();
    expect(energy(ev)).toBe(120);
    ok(e, patientType('pediatric'));
    after(e, 0.1);
    expect([st(ev).patientType, energy(ev), st(ev).escalation.next]).toEqual(['pediatric', 50, 1]);
    ok(e, patientType('adult'));
    after(e, 0.1);
    expect(energy(ev)).toBe(120);
  });

  it('a change of patient type disarms a charged unit [G 1-13], and restarts the escalation at Shock 1 [G 14-3]', () => {
    const { e, ev } = room();
    shockNow(e, ev);
    expect(energy(ev)).toBe(150);
    chargeReady(e, ev);
    ok(e, patientType('pediatric'));
    after(e, 0.1);
    expect(lastStatus(ev).defib!.state).toBe('idle');
    expect(markers(ev, 'disarm').length).toBe(1);
    expect([energy(ev), st(ev).escalation]).toEqual([50, { next: 1, on: true }]);
  });

  it('the configured levels (DQ18) are the ones selected', () => {
    const { e, ev } = room();
    ok(e, config({ escalation: { on: true, adult: [150, 200, 200], pediatric: [30, 50, 70] } }));
    ok(e, patientType('pediatric'));
    after(e, 0.1);
    expect(energy(ev)).toBe(30);
    expect(shockNow(e, ev)).toBe(30);
    expect(energy(ev)).toBe(50);
  });
});

describe('E1: the automatic energy escalation [G 14-3], [G 14-4], [G 14-6], [G 14-10]', () => {
  it('adult 120 → 150 → 200 → 200: the third level for every shock after the third', () => {
    const { e, ev } = room();
    const shot = [0, 1, 2, 3, 4].map(() => shockNow(e, ev));
    expect(shot).toEqual([120, 150, 200, 200, 200]);
    expect(st(ev).escalation).toEqual({ next: 3, on: true });
  });

  it('paediatric 50 → 70 → 85 → 85', () => {
    const { e, ev } = room();
    ok(e, patientType('pediatric'));
    expect([0, 1, 2, 3].map(() => shockNow(e, ev))).toEqual([50, 70, 85, 85]);
  });

  it('a manual selection outside the sequence plus a shock ends the escalation until the unit is off for more than 30 s', () => {
    const { e, ev } = room();
    expect(shockNow(e, ev)).toBe(120);
    ok(e, defib('selectEnergy', { energyJ: 200 })); // the sequence says 150
    expect(shockNow(e, ev)).toBe(200);
    expect(st(ev).escalation.on).toBe(false);
    expect(energy(ev)).toBe(200); // stays where the operator put it
    ok(e, defib('selectEnergy', { energyJ: 100 }));
    expect(shockNow(e, ev)).toBe(100);
    expect(energy(ev)).toBe(100);
    ok(e, selector('off'));
    after(e, 31);
    ok(e, selector('defib'));
    after(e, 0.1);
    expect([0, 1, 2].map(() => shockNow(e, ev))).toEqual([120, 150, 200]);
  });

  it('a manual change that returns to the sequence before the shock keeps it', () => {
    const { e, ev } = room();
    ok(e, defib('selectEnergy', { energyJ: 200 }));
    ok(e, defib('selectEnergy', { energyJ: 120 }));
    expect([0, 1].map(() => shockNow(e, ev))).toEqual([120, 150]);
    expect(st(ev).escalation.on).toBe(true);
  });

  it('changing the energy after CHARGE disarms and disables the escalation [G 14-6]', () => {
    const { e, ev } = room();
    ok(e, defib('charge'));
    after(e, 1);
    ok(e, defib('selectEnergy', { energyJ: 150 }));
    after(e, 0.1);
    expect(lastStatus(ev).defib!.state).toBe('idle');
    expect(st(ev).escalation.on).toBe(false);
  });

  it('configured off (DQ18), the energy stays at Shock 1 until the operator changes it', () => {
    const { e, ev } = room();
    ok(e, config({ escalation: { on: false, adult: [120, 150, 200], pediatric: [50, 70, 85] } }));
    ok(e, selector('off'));
    after(e, 31);
    ok(e, selector('defib'));
    after(e, 0.1);
    expect([0, 1].map(() => shockNow(e, ev))).toEqual([120, 120]);
  });
});

describe('E1: the disarm rules [G 1-13], [G 14-6], [G 14-7], [G 14-13]', () => {
  it('the Disarm key, an energy change, the selector to OFF or MONITOR and a patient-type change each disarm a charged unit', () => {
    const cases: Command[][] = [[defib('disarm')], [defib('selectEnergy', { energyJ: 100 })], [selector('off')], [selector('monitor')], [patientType('pediatric')]];
    for (const c of cases) {
      const { e, ev } = room();
      chargeReady(e, ev);
      for (const x of c) ok(e, x);
      after(e, 0.1);
      expect(lastStatus(ev).defib!.state, JSON.stringify(c)).toBe('idle');
      expect(markers(ev, 'disarm').map((m) => m.data?.auto), JSON.stringify(c)).toEqual([false]);
    }
  });

  it('the selector to PACER does not disarm: the guide does not list it', () => {
    const { e, ev } = room();
    chargeReady(e, ev);
    ok(e, selector('pacer'));
    after(e, 0.1);
    expect(lastStatus(ev).defib!.state).toBe('ready');
  });
});

describe('E1: the ready time-out and the tones [G 14-7], [G 14-13], [G 1-13], [G A-7], [G 12-7]', () => {
  it('the configured ready time-out (DQ17: 60 s by default, 15–60 s) disarms the unit, and the ready tone ends with it', () => {
    for (const s of [60, 15]) {
      const { e, ev } = room();
      if (s !== 60) ok(e, config({ readyTimeoutS: s }));
      chargeReady(e, ev);
      const ready = markers(ev, 'chargeReady')[0]!.t;
      after(e, s - 8 + 4.5);
      const dis = markers(ev, 'disarm');
      expect(dis.map((m) => m.data?.auto), String(s)).toEqual([true]);
      expect(dis[0]!.t - ready).toBeCloseTo(s, 1);
      const readyTone = ev.find((x): x is Tone => x.type === 'tone' && x.kind === 'chargeReady')!;
      expect(ev.some((x) => x.type === 'toneCancel' && x.ids?.includes(readyTone.id))).toBe(true);
    }
  });

  it('the M2\'s charge and ready tones carry the guide\'s 1510 Hz [G A-7]; generic tones carry none', () => {
    expect(M2_TONES).toEqual({ charge: { hz: 1510, ms: 150, everyMs: 390 }, ready: { hz: 1510 }, invalid: { hz: 160, ms: 250 } });
    const { e, ev } = room();
    chargeReady(e, ev);
    const tones = ev.filter((x): x is Tone => x.type === 'tone' && (x.kind === 'charge' || x.kind === 'chargeReady'));
    expect(tones.map((x) => [x.kind, x.freqHz])).toEqual([['charge', 1510], ['chargeReady', 1510]]);
    const g = room('generic');
    chargeReady(g.e, g.ev);
    expect(g.ev.filter((x): x is Tone => x.type === 'tone' && x.kind === 'chargeReady').map((x) => x.freqHz)).toEqual([undefined]);
  });

  it('the AED\'s ready tones: a continuous tone, then a higher one, over the 15 or 60 s interval [G 12-7]', () => {
    expect(readyToneSplit(15)).toEqual({ continuousS: 10, higherS: 5 });
    expect(readyToneSplit(60)).toEqual({ continuousS: 50, higherS: 10 });
    const mid = readyToneSplit(30);
    expect(mid.continuousS + mid.higherS).toBe(30);
  });
});

describe('E1: Sync [G 14-16], [G 14-17], [G 14-18], [G 1-16]', () => {
  const syncRoom = () => room('zoll-m2', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 80 } } } });

  it('stays on through a ready time-out, an energy change and Disarm [G 14-17]; is off after a shock [G 14-16]', () => {
    const { e, ev } = syncRoom();
    ok(e, config({ readyTimeoutS: 15 }));
    ok(e, defib('syncOn'));
    chargeReady(e, ev);
    after(e, 16); // the ready state times out
    expect(lastStatus(ev).defib).toMatchObject({ state: 'idle', sync: true });
    ok(e, defib('selectEnergy', { energyJ: 70 }));
    chargeReady(e, ev);
    ok(e, defib('selectEnergy', { energyJ: 50 })); // disarms
    ok(e, defib('disarm'));
    after(e, 0.2);
    expect(lastStatus(ev).defib!.sync).toBe(true);
    chargeReady(e, ev);
    ok(e, defib('shock'));
    after(e, 2);
    expect(markers(ev, 'shock').map((m) => m.data?.sync)).toEqual([true]);
    expect(lastStatus(ev).defib!.sync).toBe(false);
  });

  it('configured to stay in Sync after each shock, it stays on [G 14-16], [G 1-16]', () => {
    const { e, ev } = syncRoom();
    ok(e, config({ syncAfterShock: true }));
    ok(e, defib('syncOn'));
    chargeReady(e, ev);
    ok(e, defib('shock'));
    after(e, 2);
    expect(markers(ev, 'shock').map((m) => m.data?.sync)).toEqual([true]);
    expect(lastStatus(ev).defib!.sync).toBe(true);
  });

  it('the front panel SHOCK, pressed and held, arms the synchronised shock; released before the R, it does not discharge [G 14-18]', () => {
    const { e, ev } = room('zoll-m2', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 40 } } } });
    ok(e, defib('syncOn'));
    chargeReady(e, ev);
    ok(e, panel('down'));
    ok(e, panel('up'));
    after(e, 4);
    expect(markers(ev, 'shock').length).toBe(0);
    ok(e, panel('down'));
    after(e, 4);
    expect(markers(ev, 'shock').map((m) => m.data?.sync)).toEqual([true]);
    ok(e, panel('up'));
    after(e, 0.1);
    expect(st(ev).held.panel).toBe(false);
  });

  it('the front panel SHOCK delivers at once out of Sync, and does nothing with paddles that have their own buttons [G 2-4], [G 14-7]', () => {
    const a = room();
    chargeReady(a.e, a.ev);
    ok(a.e, panel('down'));
    after(a.e, 0.5);
    expect(markers(a.ev, 'shock').map((m) => m.data?.sync)).toEqual([false]);
    const b = room();
    ok(b.e, connect(PADDLES));
    chargeReady(b.e, b.ev);
    ok(b.e, panel('down'));
    after(b.e, 0.5);
    expect(markers(b.ev, 'shock').length).toBe(0);
    expect(st(b.ev).held.panel).toBe(false);
  });

  it('an ECG Lead Off on the top lead blocks the synchronised discharge, and the S markers stop; unsynchronised, the defibrillator works [G 14-16]', () => {
    const { e, ev } = syncRoom();
    ok(e, connect({ ecgCable: '3' }));
    ok(e, lead('II'));
    ok(e, defib('syncOn'));
    after(e, 3);
    expect(markers(ev, 'syncR').length).toBeGreaterThan(2);
    ok(e, connect({ ecgLeadsOff: true }));
    after(e, 0.5);
    const n = markers(ev, 'syncR').length;
    chargeReady(e, ev);
    ok(e, defib('shock'));
    after(e, 3);
    expect(markers(ev, 'syncR').length).toBe(n);
    expect(markers(ev, 'shock').length).toBe(0);
    ok(e, defib('syncOff'));
    ok(e, defib('shock'));
    after(e, 0.5);
    expect(markers(ev, 'shock').map((m) => m.data?.sync)).toEqual([false]);
  });

  it('leads off do not block Sync while Pads is the top trace; pads off do, as the trace is dashed [G 6-8], [G 14-16]', () => {
    const a = syncRoom();
    ok(a.e, connect({ ecgCable: '3', ecgLeadsOff: true }));
    ok(a.e, defib('syncOn'));
    after(a.e, 3);
    expect(st(a.ev).topLead).toBe('pads');
    expect(markers(a.ev, 'syncR').length).toBeGreaterThan(2);
    const b = syncRoom();
    ok(b.e, connect({ pads: { type: 'adult', placement: 'apexSternum', contact: 'off' } }));
    ok(b.e, defib('syncOn'));
    after(b.e, 3);
    expect(markers(b.ev, 'syncR').length).toBe(0);
  });
});

describe('E1: the top trace by mode, and the sync detector on it [G 6-7], [G 14-14], [G 2-13]', () => {
  it('Manual Defib: Pads; Monitor and Pacer: Lead II; the configured Monitor and Manual Defib defaults are used', () => {
    const { e, ev } = room();
    const top = () => (after(e, 0.1), st(ev).topLead);
    expect(top()).toBe('pads');
    ok(e, selector('monitor'));
    expect(top()).toBe('II');
    ok(e, selector('pacer'));
    expect(top()).toBe('II');
    ok(e, selector('defib'));
    expect(top()).toBe('pads');
    ok(e, config({ topLead: { monitor: 'I', manual: 'II' } }));
    ok(e, selector('monitor'));
    expect(top()).toBe('I');
    ok(e, selector('defib'));
    expect(top()).toBe('II');
  });

  it('the Lead key selects the top trace; unknown leads are refused', () => {
    expect(M2_LEADS).toEqual(['pads', 'I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
    const { e, ev } = room();
    ok(e, lead('III'));
    after(e, 0.1);
    expect(st(ev).topLead).toBe('III');
    expect(e.dispatch(lead('V7')).accepted).toBe(false);
    expect(e.dispatch(lead('ecgII')).accepted).toBe(false);
  });

  it('the sync detector reads the top lead: a signal that projects onto Lead II and not onto Lead I gives R waves on II only', () => {
    // a QRS-like pulse every 0.8 s along a VCG direction orthogonal to Lead I's Dower row [0.632, -0.235, 0.059]
    const dir: [number, number, number] = [0.235, 0.632, 0];
    const vcg = (n: number): [number, number, number] => {
      const ph = (n % 400) - 200;
      const a = Math.abs(ph) < 20 ? 1.5 * (1 - Math.abs(ph) / 20) : 0;
      return [dir[0] * a, dir[1] * a, dir[2] * a];
    };
    const on = (l: 'ecgI' | 'ecgII') => syncStep(createSyncState(0), 4000, vcg, l).length;
    expect(on('ecgII')).toBeGreaterThan(5);
    expect(on('ecgI')).toBe(0);
    // the default stays Lead II (the generic model's detector, unchanged)
    expect(syncStep(createSyncState(0), 4000, vcg).length).toBe(on('ecgII'));
  });

  it('the M2\'s top lead names the sync lead; Pads reads Lead II until the Pads lead exists (E2b)', () => {
    const m = createM2State();
    const of = (l: string) => ((m.topLead = l), syncLeadOf(m));
    expect([of('I'), of('II'), of('III'), of('aVR'), of('V1'), of('pads')]).toEqual(['ecgI', 'ecgII', 'ecgIII', 'aVR', 'V1', 'ecgII']);
  });

  it('in a room, S markers follow the selected lead: Lead III and Lead II give their own R times', () => {
    const marks = (l: string) => {
      const r = room('zoll-m2', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 80 } } } });
      ok(r.e, connect({ ecgCable: '12' }));
      ok(r.e, lead(l));
      ok(r.e, defib('syncOn'));
      after(r.e, 6);
      return markers(r.ev, 'syncR').map((x) => x.t);
    };
    const ii = marks('II');
    const v1 = marks('V1');
    expect(ii.length).toBeGreaterThan(4);
    expect(v1.length).toBeGreaterThan(4);
    expect(v1).not.toEqual(ii);
  });
});

describe('E1: the internal paddles\' limits hold through the escalation and the patient type [G 14-18]', () => {
  it('connected: 10 J; a shock leaves it at 10 J (no step to 150 J); a patient-type change keeps it under 50 J; 70 J refused', () => {
    const { e, ev } = room();
    ok(e, connect(INTERNAL));
    after(e, 0.1);
    expect(energy(ev)).toBe(10);
    expect(shockNow(e, ev)).toBe(10);
    expect(energy(ev)).toBe(10);
    ok(e, patientType('pediatric'));
    after(e, 0.1);
    expect(energy(ev)).toBeLessThanOrEqual(50);
    ok(e, patientType('adult'));
    after(e, 0.1);
    expect(energy(ev)).toBeLessThanOrEqual(50);
    expect(e.dispatch(defib('selectEnergy', { energyJ: 70 })).reason).toBe(INTERNAL_MAX_REASON);
    ok(e, defib('selectEnergy', { energyJ: 50 }));
    expect(shockNow(e, ev)).toBe(50);
    expect(energy(ev)).toBe(50);
  });

  it('a power-up after 30 s off with the handles connected selects 10 J, not the adult 120 J', () => {
    const { e, ev } = room();
    ok(e, connect(INTERNAL));
    ok(e, selector('off'));
    after(e, 31);
    ok(e, selector('defib'));
    after(e, 0.1);
    expect(energy(ev)).toBe(10);
  });
});

describe('E1: the generic model, the snapshot and the follower', () => {
  it('generic: Sync clears after a shock, the sync detector reads Lead II, no M2 state; the M2 commands are refused', () => {
    const { e, ev } = room('generic', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 80 } } } });
    e.dispatch(defib('syncOn'));
    chargeReady(e, ev);
    ok(e, defib('shock'));
    after(e, 2);
    expect(markers(ev, 'shock').map((m) => m.data?.sync)).toEqual([true]);
    expect(lastStatus(ev).defib!.sync).toBe(false);
    expect('m2' in lastStatus(ev)).toBe(false);
    for (const c of [selector('off'), patientType('pediatric'), lead('II')]) expect(e.dispatch(c).accepted).toBe(false);
  });

  it('the snapshot round trip keeps the selector, the power-off clock, the patient type, the escalation and the top lead; a follower replaying the commands holds the same state and outcome', () => {
    const run = () => {
      const r = devRig('saadat-like', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 80 } } } });
      ok(r.e, model('zoll-m2'));
      r.e.advanceTo(0.5);
      for (const c of [patientType('pediatric'), config({ syncAfterShock: true, readyTimeoutS: 20 }), connect({ ecgCable: '3' }), lead('II'), defib('syncOn'), defib('charge')]) ok(r.e, c);
      r.e.advanceTo(8);
      ok(r.e, panel('down'));
      r.e.advanceTo(10);
      ok(r.e, selector('off'));
      r.e.advanceTo(12);
      return r;
    };
    const host = run();
    const follower = run();
    expect(follower.e.snapshot().state).toEqual(host.e.snapshot().state);
    expect(lastStatus(host.ev).m2).toMatchObject({ power: { selector: 'off', offSinceS: expect.any(Number) }, patientType: 'pediatric', escalation: { next: 2, on: true }, topLead: 'II' });
    const restored = createEngine({ seed: 11, device: { skin: 'saadat-like' } });
    const rev: EngineEvent[] = [];
    restored.on((x) => rev.push(x));
    restored.restore(host.e.snapshot());
    for (const x of [restored, host.e, follower.e]) {
      x.advanceTo(20);
      ok(x, selector('defib'));
      x.advanceTo(21);
    }
    expect(lastStatus(rev)).toEqual(lastStatus(host.ev));
    expect(lastStatus(follower.ev)).toEqual(lastStatus(host.ev));
    expect(lastStatus(rev).m2).toMatchObject({ patientType: 'pediatric', topLead: 'pads' });
    expect(lastStatus(rev).defib!.energyJ).toBe(70);
  });
});
