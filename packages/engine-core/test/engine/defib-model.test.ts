// Room plan R5a (docs/plans/room-and-instruments.md §7, §4 D5; owner's Q6 ruling of 5 November): the room's
// defibrillator MODEL is device-layer state of its own, set by `device {device:'defib', action:'model', value}`, apart
// from the monitor skin. With no model set nothing changes (the defibrillator's spec is the skin's, else the fallback,
// as before); with a model set, the charge energy, the charge time and the low-energy outcome rule read the model, and a
// later `monitor skin` keeps it. The pacer stays the skin's (not ruled). Only the generic model ships (Q6's second half).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { DEFIB_MODELS, deviceProfile } from '../../src/l3/alarms/profile.ts';
import { CHARGE_S_PER_J, FALLBACK_DEFIB } from '../../src/l3/defib-pacer/defib.ts';
import { createDevice } from '../../src/l3/device-layer.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, devRig, markers } from '../helpers/device.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const skin = (value: string): Command => cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value } });
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
/** Charge (at `energyJ`, or the selected energy) and return the energy and the charge tone's time. */
function charge(e: MonitorEngine, ev: EngineEvent[], energyJ?: number): { energyJ: number; chargeS: number } {
  const from = ev.length;
  const at = e.now().simT;
  e.dispatch(defib('charge', energyJ === undefined ? {} : { energyJ }));
  e.advanceTo(at + 0.1);
  const tone = ev.slice(from).find((x): x is Tone => x.type === 'tone' && x.kind === 'charge')!;
  return { energyJ: lastStatus(ev).defib!.energyJ, chargeS: tone.chargeS as number };
}

describe('R5a: the defibrillator model (device layer)', () => {
  it('ships the generic model only, and its spec is the fallback the bedside skins use, equal to zoll-like.json\'s block', () => {
    expect(Object.keys(DEFIB_MODELS)).toEqual(['generic']);
    expect(DEFIB_MODELS.generic).toEqual(FALLBACK_DEFIB);
    expect(DEFIB_MODELS.generic).toEqual(deviceProfile('zoll-like').defib);
    expect(DEFIB_MODELS.generic).toMatchObject({ energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: null, chargeTimeS: null });
  });

  it('with no model set the device state says so (null) and the spec is the skin\'s, as before', () => {
    expect(createDevice('saadat-like', undefined).defibModel).toBeNull();
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    expect(charge(e, ev)).toEqual({ energyJ: 200, chargeS: 7 }); // lifepak-like.json: 200 J, 7 s at 200 J
  });

  it('generic on a saadat-like monitor (no defibrillator block): a charge with no energy charges 120 J in 120 × 7/200 s', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(1);
    expect(e.dispatch(model('generic')).accepted).toBe(true);
    const c = charge(e, ev);
    expect(c.energyJ).toBe(120);
    expect(c.chargeS).toBeCloseTo(120 * CHARGE_S_PER_J, 10);
  });

  it('generic on a lifepak-like monitor: 120 J (the skin no longer sets it), 360 J by the 7 s / 200 J rule; a later skin change keeps both', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    e.dispatch(model('generic'));
    expect(charge(e, ev)).toEqual({ energyJ: 120, chargeS: expect.closeTo(4.2, 10) as unknown as number });
    e.dispatch(defib('disarm'));
    expect(charge(e, ev, 360).chargeS).toBeCloseTo(360 * CHARGE_S_PER_J, 10); // 12.6 s, not lifepak-like's 10 s
    e.dispatch(defib('disarm'));
    for (const s of ['zoll-like', 'lifepak-like', 'saadat-like']) {
      e.dispatch(skin(s));
      e.dispatch(defib('selectEnergy', { energyJ: 360 }));
      expect(charge(e, ev).chargeS).toBeCloseTo(12.6, 10);
      e.dispatch(defib('disarm'));
    }
  });

  it('setting the model selects its adult energy (as selectEnergy does: a charged device disarms)', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    e.dispatch(defib('charge'));
    e.advanceTo(10);
    expect(lastStatus(ev).defib).toMatchObject({ energyJ: 200, state: 'ready' });
    e.dispatch(model('generic'));
    e.advanceTo(10.1);
    expect(lastStatus(ev).defib).toMatchObject({ energyJ: 120, state: 'idle' });
    expect(markers(ev, 'disarm').length).toBe(1);
  });

  it('an unknown model is refused with its reason, and so is another defib device action; nothing changes', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    expect(e.dispatch(model('lifepak-like')).reason).toBe('unknown defibrillator model lifepak-like');
    expect(e.dispatch(model('toString')).reason).toBe('unknown defibrillator model toString');
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'defib', action: 'energy', value: 'generic' } })).reason).toBe('unknown defib action energy');
    expect(charge(e, ev).energyJ).toBe(200);
  });

  it('the pacer is untouched: it stays the skin\'s (lifepak-like 60 ppm default, PAUSE at 25 %)', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    e.dispatch(model('generic'));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand' } }));
    e.advanceTo(2);
    expect(lastStatus(ev).pacer).toMatchObject({ ratePpm: 60 });
    expect(lastStatus(ev).hrDashes).toBe(true);
  });

  it('the low-energy outcome rule reads the model\'s default: a 90 J shock on lifepak-like + generic draws as on saadat-like (8 seeds)', () => {
    const outcomes = (s: string, withModel: boolean) => {
      const got: string[] = [];
      for (let seed = 1; seed <= 8; seed++) {
        const { e, ev } = devRig(s, { seed });
        if (withModel) e.dispatch(model('generic'));
        e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
        e.advanceTo(2);
        e.dispatch(defib('charge', { energyJ: 90 }));
        e.advanceTo(6);
        e.dispatch(defib('shock'));
        e.advanceTo(7);
        got.push(lastStatus(ev).defib!.lastShock!.outcome);
      }
      return got;
    };
    const ref = outcomes('saadat-like', false); // 90 J ≥ ½ × 120 J: full termination
    expect(outcomes('lifepak-like', true)).toEqual(ref);
    expect(outcomes('saadat-like', true)).toEqual(ref);
    expect(outcomes('lifepak-like', false)).not.toEqual(ref); // 90 J < ½ × 200 J: the low-energy halving (today's behaviour)
  });

  it('a snapshot keeps the model; an engine that replays the command holds the same spec', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    e.dispatch(model('generic'));
    e.advanceTo(2);
    const snap = e.snapshot();
    const r = createEngine({ seed: 11, device: { skin: 'lifepak-like' } });
    const rev: EngineEvent[] = [];
    r.on((x) => rev.push(x));
    r.restore(snap);
    expect(charge(r, rev, 360).chargeS).toBeCloseTo(12.6, 10);
    const f = devRig('zoll-like');
    f.e.advanceTo(1);
    f.e.dispatch(model('generic'));
    expect(charge(f.e, f.ev, 360)).toEqual(charge(e, ev, 360));
  });
});
