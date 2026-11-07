// Room plan R5a (docs/plans/room-and-instruments.md §7, §4 D5; owner's Q6 ruling of 5 November): the room's
// defibrillator MODEL is device-layer state of its own, set by `device {device:'defib', action:'model', value}`, apart
// from the monitor skin. With no model set nothing changes (the defibrillator's spec is the skin's, else the fallback,
// as before); with a model set, the charge energy, the charge time and the low-energy outcome rule read the model, and a
// later `monitor skin` keeps it. The pacer follows the model too (research/41 row 58, owner's ruling of 6 November):
// its default rate and output, its ranges, its PAUSE behaviour and whether HR reads dashes while it paces. Only the
// generic model ships (Q6's second half).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { DEFIB_MODELS, deviceProfile } from '../../src/l3/alarms/profile.ts';
import { CHARGE_S_PER_J, FALLBACK_DEFIB } from '../../src/l3/defib-pacer/defib.ts';
import { FALLBACK_PACER } from '../../src/l3/defib-pacer/pacer.ts';
import { createDevice } from '../../src/l3/device-layer.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { advanceYielding, alarmsOf, cmd, devRig, markers } from '../helpers/device.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const skin = (value: string): Command => cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value } });
const pacer = (mode: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode, ...extra } });
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
  it('ships the generic model only, and its spec is the fallback the bedside skins use, equal to zoll-like.json\'s blocks', () => {
    expect(Object.keys(DEFIB_MODELS)).toEqual(['generic']);
    const g = DEFIB_MODELS.generic!;
    const zoll = deviceProfile('zoll-like');
    expect(g.defib).toEqual(FALLBACK_DEFIB);
    expect(g.defib).toEqual(zoll.defib);
    expect(g.defib).toMatchObject({ energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: null, chargeTimeS: null });
    // the pacer (row 58): the fallback's, equal to zoll-like.json's pacer block (70 ppm, 0 mA, PAUSE = 0 mA), HR shown
    expect(g.pacer).toEqual(FALLBACK_PACER);
    expect(g.pacer).toEqual(zoll.pacer);
    expect(g.pacer).toMatchObject({ rateDefault: 70, mADefault: 0, pausePct: null });
    expect(g.hrDashesWhilePacing).toBe(zoll.hrDashesWhilePacing);
    expect(g.hrDashesWhilePacing).toBe(false);
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

  /** Paced spikes per minute during PAUSE (fixed 80 ppm at 140 mA, failure to capture so the rhythm stays), and the
   * HR dashes while pacing, on `s` with or without the model; `after` = a monitor skin put on after the model. */
  async function pacing(s: string, withModel: boolean, after?: string) {
    const { e, ev } = devRig(s, { patient: { rhythm: { id: 'avb3Wide' } } });
    e.advanceTo(1);
    if (withModel) e.dispatch(model('generic'));
    if (after) e.dispatch(skin(after));
    e.dispatch(pacer('demand'));
    e.advanceTo(2);
    const rateDefault = lastStatus(ev).pacer!.ratePpm;
    e.dispatch(pacer('fixed', { ratePpm: 80, mA: 140, fault: 'failureToCapture' }));
    e.advanceTo(10);
    const hrDashes = lastStatus(ev).hrDashes;
    e.dispatch(pacer('fixed', { ratePpm: 80, mA: 140, fault: 'failureToCapture', pause: true }));
    await advanceYielding(e, 70);
    const paused = markers(ev, 'paceSpike').filter((m) => m.t > 10 && m.t < 70 && (m.data?.mA ?? 1) !== 0).length;
    return { rateDefault, hrDashes, paused };
  }

  it('with no model the pacer is the skin\'s, as before: lifepak-like 60 ppm, HR dashes, PAUSE at 25 % (20 ppm)', async () => {
    const lp = await pacing('lifepak-like', false);
    expect(lp).toMatchObject({ rateDefault: 60, hrDashes: true });
    expect(Math.abs(lp.paused - 20)).toBeLessThanOrEqual(2);
    expect(await pacing('zoll-like', false)).toEqual({ rateDefault: 70, hrDashes: false, paused: 0 });
  }, { timeout: 120_000 });

  it('generic on a lifepak-like monitor: the model\'s pacer (70 ppm, HR shown, PAUSE = 0 mA), as zoll-like and saadat-like', async () => {
    const ref = await pacing('saadat-like', false); // no pacer block: the fallback's
    expect(ref).toEqual({ rateDefault: 70, hrDashes: false, paused: 0 });
    expect(await pacing('lifepak-like', true)).toEqual(ref);
    expect(await pacing('zoll-like', true)).toEqual(ref);
    expect(await pacing('saadat-like', true)).toEqual(ref);
  }, { timeout: 120_000 });

  it('a monitor skin put on after the model keeps the model\'s pacer (and a skin change with no model takes the skin\'s)', async () => {
    const ref = await pacing('saadat-like', false);
    expect(await pacing('saadat-like', true, 'lifepak-like')).toEqual(ref);
    expect(await pacing('lifepak-like', true, 'zoll-like')).toEqual(ref);
    expect(await pacing('saadat-like', false, 'lifepak-like')).toMatchObject({ rateDefault: 70, hrDashes: true }); // state kept, spec the skin's
  }, { timeout: 120_000 });

  it('the model\'s pacer rules the HR alarms too: lifepak-like + generic raises EXTREME BRADY while pacing, as zoll-like does', () => {
    const extremeBrady = (s: string, withModel: boolean) => {
      const { e, ev } = devRig(s, { patient: { rhythm: { id: 'avb3Wide' } } });
      e.advanceTo(1);
      if (withModel) e.dispatch(model('generic'));
      e.dispatch(pacer('fixed', { ratePpm: 80, mA: 0 })); // 0 mA: no capture, the 32 bpm escape goes on
      e.advanceTo(40);
      return alarmsOf(ev, 'EXTREME_BRADY', 'raised').length > 0;
    };
    expect(extremeBrady('zoll-like', false)).toBe(true);
    expect(extremeBrady('lifepak-like', false)).toBe(false); // LIFEPAK-like: HR alarms off while pacing
    expect(extremeBrady('lifepak-like', true)).toBe(true);
  });

  it('setting the model with the pacer off selects its default rate and output; a running pacer keeps its settings', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(1);
    e.dispatch(model('generic'));
    e.dispatch(pacer('demand'));
    e.advanceTo(2);
    expect(lastStatus(ev).pacer).toMatchObject({ ratePpm: 70, mA: 0 });
    const r = devRig('lifepak-like');
    r.e.advanceTo(1);
    r.e.dispatch(pacer('demand', { ratePpm: 90, mA: 60 }));
    r.e.dispatch(model('generic'));
    r.e.advanceTo(2);
    expect(lastStatus(r.ev).pacer).toMatchObject({ mode: 'demand', ratePpm: 90, mA: 60 });
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
    // the pacer too (row 58): a lifepak-like engine restored from the snapshot paces at the model's 70 ppm with HR shown,
    // and a skin it puts on after the restore keeps that
    r.dispatch(defib('disarm'));
    r.dispatch(skin('lifepak-like'));
    r.dispatch(pacer('demand'));
    r.advanceTo(r.now().simT + 0.5);
    expect(lastStatus(rev).pacer).toMatchObject({ ratePpm: 70 });
    expect(lastStatus(rev).hrDashes).toBe(false);
    r.dispatch(pacer('off'));
    const f = devRig('zoll-like');
    f.e.advanceTo(1);
    f.e.dispatch(model('generic'));
    expect(charge(f.e, f.ev, 360)).toEqual(charge(e, ev, 360));
  });
});
