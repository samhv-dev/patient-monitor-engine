// Stage 4b acceptance: defibrillator and cardioversion in the running engine (brief §6.5).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { advanceYielding, beats, cmd, devRig, markers } from '../helpers/device.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;

describe('defibrillator', () => {
  it('lifepak-like: 200 J charges in 7 s with the charge tone, then ready tone; auto-disarm after 60 s', async () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(2);
    e.dispatch(defib('charge', { energyJ: 200 }));
    e.advanceTo(12);
    const charge = ev.find((x): x is Tone => x.type === 'tone' && x.kind === 'charge')!;
    expect(charge.chargeS).toBeCloseTo(7, 6);
    expect(charge.t).toBeCloseTo(2.02, 6);
    const ready = markers(ev, 'chargeReady')[0]!;
    expect(ready.t - charge.t).toBeCloseTo(7, 1);
    expect(ev.some((x) => x.type === 'tone' && x.kind === 'chargeReady')).toBe(true);
    expect(lastStatus(ev).defib?.state).toBe('ready');
    await advanceYielding(e, 75);
    const dis = markers(ev, 'disarm')[0]!;
    expect(dis.t - ready.t).toBeCloseTo(60, 1);
    expect(dis.data?.auto).toBe(true);
    expect(e.dispatch(defib('shock')).reason).toMatch(/not charged/);
  }, { timeout: 300_000 });

  it('VF → charge → shock: rail artefact on every displayed lead, baseline back within 0.1 mV in ≤ 5 s', () => {
    const { e, ev } = devRig('zoll-like');
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 2 } }));
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    e.advanceTo(10);
    e.dispatch(defib('preselect', { outcome: 'asystole' }));
    e.dispatch(defib('charge'));
    e.advanceTo(16);
    e.dispatch(defib('shock'));
    e.advanceTo(24);
    const sh = markers(ev, 'shock')[0]!;
    const atS = sh.data!.atS as number;
    expect(sh.data?.energyJ).toBe(120); // zoll-like default (research/05 §2.6)
    expect(ev.some((x) => x.type === 'tone' && x.kind === 'shock')).toBe(true);
    for (const lead of ['ecgII', 'V5', 'V1'] as const) {
      const rail = new Float32Array(25);
      e.readSamples(lead, Math.round(atS * 500), rail);
      // the amplifier sits on its 5 mV rail (front-end.ts RAIL_MV); the displayed lane is that step through the monitor filter
      expect(Math.max(...rail.map(Math.abs))).toBeGreaterThan(4);
      const tail = new Float32Array(250);
      e.readSamples(lead, Math.round((atS + 5) * 500), tail);
      expect(Math.abs(tail.reduce((a, b) => a + b, 0) / tail.length)).toBeLessThan(0.1);
    }
    expect(lastStatus(ev).defib?.lastShock?.outcome).toBe('asystole');
  });

  it('post-shock rhythm follows the drawn outcome (8 seeds)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) {
      const { e, ev } = devRig('zoll-like', { seed });
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
      e.dispatch(defib('charge'));
      e.advanceTo(6);
      e.dispatch(defib('shock'));
      e.advanceTo(20);
      const atS = markers(ev, 'shock')[0]!.data!.atS as number;
      const outcome = lastStatus(ev).defib!.lastShock!.outcome;
      seen.add(outcome);
      expect(['unchanged', 'asystole', 'pea', 'rosc']).toContain(outcome);
      const after = beats(ev).filter((b) => b.t > atS);
      if (outcome === 'unchanged' || outcome === 'asystole') expect(after).toEqual([]);
      else {
        expect(after[0]!.t - atS).toBeGreaterThan(1);
        expect(after[0]!.t - atS).toBeLessThan(5.5);
        expect(after.every((b) => b.mech.perfused === (outcome === 'rosc'))).toBe(true);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('sync: markers on every R within 20 ms; the synchronised shock lands 0–60 ms after the next R', () => {
    const { e, ev } = devRig('zoll-like');
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt' }));
    e.dispatch(defib('syncOn'));
    e.dispatch(defib('charge', { energyJ: 100 }));
    e.advanceTo(8);
    const rs = beats(ev).filter((b) => b.t > 1 && b.t < 7.5);
    const sm = markers(ev, 'syncR');
    for (const b of rs) expect(Math.min(...sm.map((m) => Math.abs(m.t - b.t)))).toBeLessThanOrEqual(0.02);
    e.dispatch(defib('shock'));
    e.advanceTo(12);
    const sh = markers(ev, 'shock')[0]!;
    const atS = sh.data!.atS as number;
    const r = beats(ev).filter((b) => b.t <= atS).pop()!;
    expect(sh.data?.sync).toBe(true);
    expect(atS - r.t).toBeGreaterThanOrEqual(0);
    expect(atS - r.t).toBeLessThanOrEqual(0.06);
    expect(lastStatus(ev).defib?.sync).toBe(false); // "Sync After Shock" off
  });
});
