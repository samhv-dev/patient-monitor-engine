// Defibrillator plan E0 (docs/plans/defibrillator-zoll-m2.md §6 E0, brief 179): the ZOLL M2 as a defibrillator model
// with the limits its Operator's Guide states, per-model energy validation, and the frozen command vocabulary. Every
// declared command is accepted in its valid form, refused in an invalid one, and changes nothing yet; the generic model
// is unchanged. Pages are the guide's printed pages, [G n-m] (REF 9650-000873-01 Rev. C).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { DEFIB_MODELS } from '../../src/l3/alarms/profile.ts';
import { M2_COMMANDS, M2_ENERGIES_J, M2_IDLE_STATUS, M2_LIMIT_KEYS, NOT_M2 } from '../../src/l3/defib-pacer/m2-vocabulary.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const m2 = (action: string, value?: unknown): Command => cmd({ type: 'device', action: { device: 'defib', action, ...(value === undefined ? {} : { value }) } as never });
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } as never });
const pacer = (extra: Record<string, unknown>) => cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'fixed', ...extra } as never });

/** An engine whose room has the given model, advanced to 1 s. */
function room(m: string | null, skin = 'saadat-like'): { e: MonitorEngine; ev: EngineEvent[] } {
  const r = devRig(skin);
  if (m) expect(r.e.dispatch(model(m)).accepted).toBe(true);
  r.e.advanceTo(1);
  return r;
}

const PADS = { type: 'adult', placement: 'anteriorPosterior', contact: 'poor' };
/** Each declared command: valid forms, invalid forms. Every key of M2_COMMANDS must appear (a test checks). */
const CASES: Record<string, { ok: unknown[]; bad: unknown[] }> = {
  selector: { ok: ['off', 'monitor', 'defib', 'pacer'], bad: ['aed', '', 3, undefined] },
  patientType: { ok: ['adult', 'pediatric'], bad: ['neonate', 'paed', null] },
  defibMode: { ok: [{ mode: 'manual' }, { mode: 'aed' }, { mode: 'manual', password: '1234' }], bad: ['aed', { mode: 'sync' }, { mode: 'manual', password: 12 }, { mode: 'aed', extra: 1 }] },
  shockButton: {
    ok: [{ phase: 'down', button: 'panel' }, { phase: 'up', button: 'apex' }, { phase: 'down', button: 'sternum' }, { phase: 'up', button: 'internal' }],
    bad: [{ phase: 'hold', button: 'panel' }, { phase: 'down', button: 'paddle' }, { phase: 'down' }, 'down', { phase: 'down', button: 'panel', x: 1 }],
  },
  analyze: { ok: [undefined], bad: ['now', 1] },
  fourToOne: { ok: [{ phase: 'down' }, { phase: 'up' }], bad: ['down', { phase: 'held' }, { phase: 'up', heldMs: 1 }, true] },
  alarmControl: { ok: [{ phase: 'down' }, { phase: 'up', heldMs: 3200 }, { phase: 'up' }], bad: ['down', { phase: 'press' }, { heldMs: 10 }, { phase: 'up', heldMs: -1 }, { phase: 'up', heldMs: Number.NaN }, 0] },
  alarmLimit: {
    ok: [{ param: 'HR', low: 50, high: 120 }, { param: 'SpO2', low: 85, high: null }, { param: 'dT', enabled: false }, { param: 'EtCO2', low: null, high: 50, enabled: true }],
    bad: [{ param: 'ICP', low: 1, high: 2 }, { param: 'HR', low: 120, high: 50 }, { param: 'HR', low: Number.NaN }, { param: 'HR', high: Infinity }, { param: 'toString', low: 1 }, { param: '__proto__', low: 1 }, { param: 'HR' }, { param: 'HR', low: 50, color: 'red' }, { param: 'HR', enabled: 'yes' }],
  },
  nibp: { ok: ['press'], bad: ['start', undefined] },
  co2: { ok: ['on', 'off', 'zero'], bad: ['calibrate', true] },
  codeMarker: { ok: [{ label: 'Epinephrine' }, { label: 'Intubation' }], bad: ['Epinephrine', { label: '' }, { label: 'x'.repeat(65) }, { label: 7 }, {}] },
  print: { ok: ['press'], bad: ['on'] },
  connect: {
    ok: [{ mfc: false }, { therapy: 'testPlug' }, { pads: PADS }, { paddles: { pediPlates: true, shockButtons: true, contact: 'good' } }, { internal: { dischargeButton: false, contact: 'good' } }, { ecgCable: '12', ecgLeadsOff: true, spo2: true, nibp: true, co2: true, temp1: true, temp2: false }],
    bad: [{}, { mfc: 'yes' }, { therapy: 'cable' }, { pads: { ...PADS, contact: 'wet' } }, { pads: { type: 'adult' } }, { pads: { ...PADS, size: 'L' } }, { ecgCable: 4 }, { gel: true }, JSON.parse('{"__proto__":{"mfc":true}}'), 'pads'],
  },
  setting: {
    ok: [{ nibpMode: 'stat' }, { nibpIntervalMin: 2.5 }, { nibpIntervalMin: 120 }, { spo2Averaging: 'high' }, { ecgFilterHz: 40 }, { paceMarker: false, respImpedance: true }],
    bad: [{}, { nibpMode: 'cont' }, { nibpIntervalMin: 3 }, { nibpIntervalMin: Number.NaN }, { spo2Averaging: 8 }, { ecgFilterHz: 150 }, { paceMarker: 1 }, { sweep: 25 }, { constructor: 1 }],
  },
  config: {
    ok: [
      { startMode: 'aed' }, { readyTimeoutS: 15 }, { readyTimeoutS: 60 },
      { escalation: { on: false, adult: [150, 200, 200], pediatric: [30, 50, 70] } }, { aedEnergies: { adult: [120, 150, 200], pediatric: [50, 70, 85] } },
      { cprAtStart: true, cprPeriodS: 120, cprTargetDepthCm: 5 }, { metronome: { mode: 'compressions', ratePerMin: 105 } },
      { aedPassword: '0000' }, { nibpIntervalMin: 2.5 }, { aedPassword: null }, { checkPatientPause: true }, { trendIntervalS: 30 }, { trendIntervalS: 1800 },
      { accessories: { pads: true, externalPaddles: false, internalHandles: true } },
    ],
    bad: [
      {}, { startMode: 'pacer' }, { readyTimeoutS: 10 }, { readyTimeoutS: 61 }, { readyTimeoutS: 30.5 },
      { escalation: { on: true, adult: [120, 150, 360], pediatric: [50, 70, 85] } }, { escalation: { on: true, adult: [120, 150], pediatric: [50, 70, 85] } },
      { aedEnergies: { adult: [120, 140, 200], pediatric: [50, 70, 85] } }, { cprPeriodS: -1 }, { cprTargetDepthCm: Number.NaN }, { metronome: { mode: 'always' } },
      { aedPassword: 1234 }, { nibpIntervalMin: 7 }, { ecgLeadsOff: true }, { trendIntervalS: 10 }, { accessories: { pads: true } }, { language: 'fa' },
    ],
  },
};

describe('E0: the ZOLL M2 model [G A-2], [G 14-4], [G 12-6], [G A-10], [G 16-5]', () => {
  it('ships generic and zoll-m2; the M2 carries the guide\'s energy list, escalation, AED sequence and pacer steps', () => {
    expect(Object.keys(DEFIB_MODELS)).toEqual(['generic', 'zoll-m2']);
    const z = DEFIB_MODELS['zoll-m2']!;
    expect(M2_ENERGIES_J).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200]); // [G A-2]
    expect(z.energiesJ).toEqual(M2_ENERGIES_J);
    expect(z.escalationJ).toEqual({ adult: [120, 150, 200], pediatric: [50, 70, 85] }); // [G 14-4]
    expect(z.aedSequenceJ).toEqual({ adult: [120, 150, 200], pediatric: [50, 70, 85] }); // [G 12-6]
    expect(z.defib).toMatchObject({ energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: [120, 150, 200] });
    expect(z.pacer).toMatchObject({ rateDefault: 70, rateRange: [30, 180], mADefault: 0, mARange: [0, 140], mAStep: { up: 2, down: 2 }, modeDefault: 'demand', pausePct: null });
    expect(z.pacerGrid).toEqual({ ratePpm: 2, mA: 2, mAMin: 8 }); // [G 1-11], [G 16-4], [G 16-5], [G A-10]
    expect(z.hrDashesWhilePacing).toBe(false);
    // generic: no list, no escalation, no grid (today's behaviour)
    const g = DEFIB_MODELS.generic!;
    expect([g.energiesJ, g.escalationJ, g.aedSequenceJ, g.pacerGrid]).toEqual([undefined, undefined, undefined, undefined]);
  });
});

describe('E0: per-model energy validation', () => {
  it('360 J is refused on zoll-m2 and accepted on generic; 140 J is refused on zoll-m2 with a reason a face can show', () => {
    const z = room('zoll-m2');
    const g = room('generic');
    for (const a of ['selectEnergy', 'charge']) {
      expect(g.e.dispatch(defib(a, { energyJ: 360 })).accepted).toBe(true);
      g.e.dispatch(defib('disarm'));
      const r360 = z.e.dispatch(defib(a, { energyJ: 360 }));
      expect(r360.accepted).toBe(false);
      expect(r360.reason).toBe('360 J is not a ZOLL M2 energy (1–10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200 J)');
      expect(z.e.dispatch(defib(a, { energyJ: 140 })).reason).toBe('140 J is not a ZOLL M2 energy (1–10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200 J)');
      expect(z.e.dispatch(defib(a, { energyJ: Number.NaN })).accepted).toBe(false);
      for (const j of M2_ENERGIES_J) {
        expect(z.e.dispatch(defib(a, { energyJ: j })).accepted, `${a} ${j} J`).toBe(true);
        z.e.dispatch(defib('disarm'));
      }
    }
    expect(z.e.dispatch(defib('charge')).accepted).toBe(true); // no energy: the selected one (120 J)
    // generic keeps its range and its words
    expect(g.e.dispatch(defib('selectEnergy', { energyJ: 361 })).reason).toBe('energyJ must be 1–360 J');
  });

  it('the M2 pacer: rate 30–180 in 2 ppm steps, output 0 (paused) or 8–140 mA in 2 mA steps; generic unchanged', () => {
    const z = room('zoll-m2');
    const g = room('generic');
    for (const ok of [{ ratePpm: 30 }, { ratePpm: 72 }, { ratePpm: 180 }, { mA: 0 }, { mA: 8 }, { mA: 70 }, { mA: 140 }]) expect(z.e.dispatch(pacer(ok)).accepted, JSON.stringify(ok)).toBe(true);
    for (const bad of [{ ratePpm: 71 }, { ratePpm: 28 }, { ratePpm: 182 }, { mA: 5 }, { mA: 6 }, { mA: 9 }, { mA: 141 }, { mA: 142 }]) {
      const r = z.e.dispatch(pacer(bad));
      expect(r.accepted, JSON.stringify(bad)).toBe(false);
      // off the grid: the M2's words; out of the range: the range's words, as for every model
      expect(r.reason).toMatch('ratePpm' in bad ? (bad.ratePpm! < 30 || bad.ratePpm! > 180 ? /^ratePpm must be 30–180$/ : /steps of 2 on the ZOLL M2/) : bad.mA! > 140 ? /^mA must be 0–140$/ : /steps of 2 on the ZOLL M2/);
    }
    for (const ok of [{ ratePpm: 71 }, { mA: 5 }, { mA: 9 }]) expect(g.e.dispatch(pacer(ok)).accepted).toBe(true);
  });
});

describe('E0: the frozen vocabulary', () => {
  it('declares every command of plan §5.1 and §5.4, each with its piece; the cases here cover each one', () => {
    expect(Object.keys(M2_COMMANDS).sort()).toEqual(Object.keys(CASES).sort());
    for (const [k, c] of Object.entries(M2_COMMANDS)) expect(c.piece, k).toMatch(/^(E|R)\d/);
    expect(M2_LIMIT_KEYS).toEqual(['HR', 'PR', 'SpO2', 'NIBP_S', 'NIBP_D', 'NIBP_M', 'EtCO2', 'FiCO2', 'BR', 'RR', 'T1', 'T2', 'dT']); // [G C-1 to C-9]
  });

  it('each command is accepted in its valid forms on zoll-m2 and changes nothing yet (state and status equal a room without it)', () => {
    // `connect` has its behaviour since E2a (defib-m2-connections.test.ts); its forms are still accepted here
    for (const [action, c] of Object.entries(CASES)) {
      if (action === 'connect') {
        for (const v of c.ok) expect(room('zoll-m2').e.dispatch(m2(action, v)).accepted, `${action} ${JSON.stringify(v)}`).toBe(true);
        continue;
      }
      for (const v of c.ok) {
        const a = room('zoll-m2');
        const b = room('zoll-m2');
        const r = a.e.dispatch(m2(action, v));
        expect(r.accepted, `${action} ${JSON.stringify(v)}: ${r.reason}`).toBe(true);
        a.e.advanceTo(2.5);
        b.e.advanceTo(2.5);
        expect(a.e.snapshot().state, `${action} ${JSON.stringify(v)}`).toEqual(b.e.snapshot().state);
        expect(lastStatus(a.ev)).toEqual(lastStatus(b.ev));
      }
    }
  });

  it('each command is refused in its invalid forms, with a reason', () => {
    const z = room('zoll-m2');
    for (const [action, c] of Object.entries(CASES)) {
      for (const v of c.bad) {
        const r = z.e.dispatch(m2(action, v));
        expect(r.accepted, `${action} ${JSON.stringify(v)}`).toBe(false);
        expect(r.reason, `${action} ${JSON.stringify(v)}`).toEqual(expect.any(String));
      }
    }
  });

  it('on generic, or with no model, every M2 command is refused as not a ZOLL M2; other names stay unknown', () => {
    for (const m of ['generic', null]) {
      const r = room(m, 'lifepak-like');
      for (const [action, c] of Object.entries(CASES)) expect(r.e.dispatch(m2(action, c.ok[0])).reason, `${m} ${action}`).toBe(NOT_M2);
      expect(r.e.dispatch(m2('energy', 'generic')).reason).toBe('unknown defib action energy');
      expect(r.e.dispatch(m2('toString', 'x')).reason).toBe('unknown defib action toString');
      expect(r.e.dispatch(m2('__proto__', 'x')).reason).toBe('unknown defib action __proto__');
    }
  });
});

describe('E0: deviceStatus.m2', () => {
  it('carries every field at its idle value on zoll-m2, and is absent on generic and with no model', () => {
    const z = room('zoll-m2');
    z.e.advanceTo(2.5);
    expect(lastStatus(z.ev).m2).toEqual(M2_IDLE_STATUS);
    expect(M2_IDLE_STATUS).toMatchObject({
      power: { selector: 'defib', offSinceS: null }, defibMode: 'manual', patientType: 'adult', escalation: { next: 1, on: true },
      held: { panel: false, apex: false, sternum: false, internal: false, fourToOne: false, alarmControl: false },
      aed: { phase: 'idle', verdict: null, untilS: null, shockIndex: 1 }, messages: [], lastDelivery: null,
      connections: { mfc: true, therapy: 'pads' },
      config: { escalation: { on: true, adult: [120, 150, 200], pediatric: [50, 70, 85] }, cprPeriodS: 120, cprTargetDepthCm: 5, metronome: { mode: 'always', ratePerMin: 105 }, aedPassword: false, accessories: { pads: true, externalPaddles: true, internalHandles: false } },
    });
    for (const m of ['generic', null]) {
      const r = room(m);
      r.e.advanceTo(2.5);
      expect('m2' in lastStatus(r.ev), String(m)).toBe(false);
    }
  });

  it('setting generic after zoll-m2 removes the M2 state; setting zoll-m2 again starts it idle', () => {
    const z = room('zoll-m2');
    z.e.dispatch(model('generic'));
    z.e.advanceTo(2.5);
    expect('m2' in lastStatus(z.ev)).toBe(false);
    z.e.dispatch(model('zoll-m2'));
    z.e.advanceTo(4);
    expect(lastStatus(z.ev).m2).toEqual(M2_IDLE_STATUS);
  });

  it('the snapshot round trip keeps it, and a follower replaying the commands holds the same state', () => {
    // the model first: a command is validated against the state at dispatch (engine.ts dispatch)
    const script: Command[] = [m2('patientType', 'pediatric'), m2('connect', { pads: PADS }), m2('config', { readyTimeoutS: 30 }), defib('selectEnergy', { energyJ: 150 }), m2('shockButton', { phase: 'down', button: 'panel' })];
    const run = () => {
      const r = devRig('saadat-like');
      expect(r.e.dispatch(model('zoll-m2')).accepted).toBe(true);
      r.e.advanceTo(0.5);
      for (const c of script) expect(r.e.dispatch(c).accepted).toBe(true);
      r.e.advanceTo(3);
      return r;
    };
    const host = run();
    const follower = run();
    expect(follower.e.snapshot().state).toEqual(host.e.snapshot().state);
    expect(lastStatus(follower.ev)).toEqual(lastStatus(host.ev));
    const restored = createEngine({ seed: 11, device: { skin: 'saadat-like' } });
    const rev: EngineEvent[] = [];
    restored.on((x) => rev.push(x));
    restored.restore(host.e.snapshot());
    restored.advanceTo(5);
    host.e.advanceTo(5);
    // idle but for the poor-contact pads E2a now applies, and the message they give [G 14-9]
    expect(lastStatus(rev).m2).toEqual({ ...M2_IDLE_STATUS, connections: { ...M2_IDLE_STATUS.connections, pads: PADS }, messages: ['Attach Pads'] });
    expect(lastStatus(rev)).toEqual(lastStatus(host.ev));
    expect(lastStatus(rev).defib!.energyJ).toBe(150);
  });
});
