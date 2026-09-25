// BUILD-PLAN Stage 2 acceptance tests 1–3 and 5–8, 10, 11 at engine level (4 is in circulation.test.ts,
// 9 in hemo-nibp.test.ts), plus the extra checks the Stage 2 plan adds.
import { describe, expect, it } from 'vitest';
import { createHemoState, advanceHemo, type HemoCtx, type RhythmView } from '../../src/l2/hemo/pipeline.ts';
import { createL1State } from '../../src/l1/state.ts';
import { constantRamp } from '../../src/l1/ramp.ts';
import { lvetS, pepS, RADIAL_PTT_S, volumeStatusForGHyp } from '../../src/l2/hemo/params.ts';
import { RHYTHMS } from '../../src/l2/ecg/rhythms.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import type { EngineEvent } from '../../src/types.ts';
import { beatsOf, cmd, footAfter, mean, notchAfter, numeric, read, riseAfter, rig, rmssd } from '../helpers/hemo.ts';

describe('Stage 2 acceptance (engine level)', () => {
  it('1. timing at HR 60/90/120: R→radial foot 150–220 ms, pleth foot 200–300 ms after R and 20–100 ms after the radial foot, notch at R + PEP + LVET + PTT ± 20 ms', () => {
    for (const hr of [60, 90, 120]) {
      const { e, ev } = rig({ hr, hrv: false, seed: 3 });
      e.advanceTo(40);
      const abp = read(e, 'abp', 20, 40);
      const pl = read(e, 'pleth', 20, 40);
      for (const b of beatsOf(ev, 25, 38)) {
        const fa = footAfter(abp, 20, b.t) - b.t;
        const fp = footAfter(pl, 20, b.t) - b.t;
        expect(fa).toBeGreaterThanOrEqual(0.15);
        expect(fa).toBeLessThanOrEqual(0.22);
        expect(fp).toBeGreaterThanOrEqual(0.2);
        expect(fp).toBeLessThanOrEqual(0.3);
        expect(fp - fa).toBeGreaterThanOrEqual(0.02);
        expect(fp - fa).toBeLessThanOrEqual(0.1);
        const expected = b.t + pepS(hr) + lvetS(hr) + RADIAL_PTT_S;
        expect(Math.abs(notchAfter(abp, 20, b.t) - expected)).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('2. MAP by integral: the displayed mean agrees with the time-average of the displayed waveform (±1 mmHg)', () => {
    const { e, ev } = rig({ seed: 2 });
    e.advanceTo(60);
    const wave = read(e, 'abp', 30, 60);
    expect(Math.abs(mean(numeric(ev, 'abpMean', 30.5, 60)) - mean([...wave]))).toBeLessThanOrEqual(1);
  });

  it('3. tracker: 90/50 with a 30 s linear ramp in sinus 80 is met ±3 mmHg 10 beats after the ramp; the ramp is monotonic', () => {
    const { e, ev } = rig({ hr: 80, seed: 4 });
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30, curve: 'linear' } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 30, curve: 'linear' } }));
    e.advanceTo(60.02 + 7.5 + 0.5);
    const sys = numeric(ev, 'abpSys', 67.9, 68.1);
    const dia = numeric(ev, 'abpDia', 67.9, 68.1);
    expect(Math.abs(sys[0]! - 90)).toBeLessThanOrEqual(3);
    expect(Math.abs(dia[0]! - 50)).toBeLessThanOrEqual(3);
    const truth = ev.filter((x): x is Extract<EngineEvent, { type: 'state' }> => x.type === 'state' && x.t > 30 && x.t <= 61).map((x) => x.values.sbp!);
    for (let i = 1; i < truth.length; i++) expect(truth[i]!).toBeLessThanOrEqual(truth[i - 1]! + 1e-9);
    const shown = [35, 40, 45, 50, 55, 60].map((t) => mean(numeric(ev, 'abpSys', t - 2, t + 2)));
    for (let i = 1; i < shown.length; i++) expect(shown[i]!).toBeLessThan(shown[i - 1]!);
  });

  it('5a. AF pulse deficit: some beats with RR < 350 ms give PP < 5 mmHg, and PR (pleth) < HR', () => {
    const { e, ev } = rig({ seed: 5 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 150 } })); // RR floor ≈ 0.35 s below ~140/min
    e.advanceTo(110);
    const abp = read(e, 'abp', 0, 110);
    const b = beatsOf(ev, 10, 108);
    let tiny = 0;
    for (let i = 1; i < b.length - 1; i++) {
      if (b[i]!.t - b[i - 1]!.t < 0.35 && riseAfter(abp, 0, b[i]!.t, b[i + 1]!.t - b[i]!.t) < 5) tiny++;
    }
    expect(tiny).toBeGreaterThan(0);
    expect(mean(numeric(ev, 'pr', 90, 110))).toBeLessThan(mean(numeric(ev, 'hr', 90, 110)) - 10);
  });

  it('5b. a beat with k_rhythm 0 (a PVC coupled below 45%) has no upstroke', () => {
    // Synthetic beat records drive the pipeline directly: identical runs with and without the k = 0 beat must
    // draw the same arterial trace until the next beat's ejection.
    const trace = (withPvc: boolean) => {
      const l1 = createL1State();
      const hs = createHemoState({ sensors: { abp: 'connected' } }, l1, 75);
      const records: EngineEvent[] = [];
      for (let k = 0; k < 20; k++) {
        records.push({ type: 'beat', t: 0.5 + k * 0.8, seq: 2 * k, origin: 'sinus', template: 'narrow', qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 285 } });
        if (withPvc && k === 11) {
          records.push({ type: 'beat', t: 0.5 + k * 0.8 + 0.3, seq: 2 * k + 1, origin: 'ventricular', template: 'pvc', qrsMs: 160, qtMs: 420, mech: { perfused: false, kSV: 0, svMl: 0, lvetMs: 285 } });
        }
      }
      const rhythm: RhythmView = { id: 'sinus', records };
      const ctx: HemoCtx = { l1, hr: constantRamp(75), rhythm, rng: createRngState(1), phi: 0 };
      const abp: number[] = [];
      advanceHemo(hs, ctx, 125 * 16, (ch, m, v) => {
        if (ch === 'abp') abp[m] = v;
      });
      return abp;
    };
    const a = trace(true);
    const b = trace(false);
    const tPvc = 0.5 + 11 * 0.8 + 0.3;
    const tNext = 0.5 + 12 * 0.8;
    let diff = 0;
    for (let m = Math.round(tPvc * 125); m < Math.round((tNext + 0.1) * 125); m++) diff = Math.max(diff, Math.abs(a[m]! - b[m]!));
    expect(diff).toBeLessThan(0.01);
  });

  it('5c. post-PVC potentiation: the next beat SBP is +8–15 mmHg on average over isolated PVCs', () => {
    const { e, ev } = rig({ seed: 5, hrv: false });
    for (const t0 of [20, 35, 50, 65, 80, 95]) {
      e.advanceTo(t0);
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } }));
      e.advanceTo(t0 + 0.6);
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: null } }));
    }
    e.advanceTo(110);
    const abp = read(e, 'abp', 0, 110);
    const sbp = (t: number) => Math.max(...abp.subarray(Math.round((t + 0.1) * 125), Math.round((t + 0.5) * 125)));
    const b = beatsOf(ev, 10, 108);
    const d: number[] = [];
    b.forEach((x, i) => {
      if (i > 3 && b[i - 1]!.template === 'pvc') d.push(sbp(x.t) - mean([sbp(b[i - 2]!.t), sbp(b[i - 3]!.t), sbp(b[i - 4]!.t)]));
    });
    expect(d.length).toBeGreaterThanOrEqual(5);
    expect(mean(d)).toBeGreaterThanOrEqual(8);
    expect(mean(d)).toBeLessThanOrEqual(15);
  });

  it('extra: AF beat-to-beat pulse-pressure variability (RMSSD of upstrokes) is > 3× sinus', () => {
    const spread = (rhythm: 'sinus' | 'afib') => {
      const { e, ev } = rig({ seed: 6 });
      if (rhythm === 'afib') e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 100 } }));
      e.advanceTo(80);
      const abp = read(e, 'abp', 0, 80);
      const b = beatsOf(ev, 20, 78);
      return rmssd(b.slice(0, -1).map((x, i) => riseAfter(abp, 0, x.t, b[i + 1]!.t - x.t)));
    };
    expect(spread('afib')).toBeGreaterThan(3 * spread('sinus'));
  });

  const arrests: Array<[string, Record<string, unknown>]> = [
    ['asystole', { rhythm: 'asystole' }],
    ['VT 220', { rhythm: 'vtMono', opts: { rateBpm: 220 } }],
  ];
  if ('vfCoarse' in RHYTHMS) arrests.push(['VF', { rhythm: 'vfCoarse' }]); // Stage 5 adds VF
  for (const [name, body] of arrests) {
    it(`6. ${name}: ABP flat at 10–15 mmHg within 20 s, pleth flat, PR invalid, sbp/dbp flagged override`, () => {
      const { e, ev } = rig({ seed: 7 });
      e.advanceTo(20);
      e.dispatch(cmd({ type: 'setRhythm', ...body }));
      e.advanceTo(40.02);
      const w = read(e, 'abp', 39, 40);
      expect(Math.min(...w)).toBeGreaterThanOrEqual(10);
      expect(Math.max(...w)).toBeLessThanOrEqual(15);
      expect(Math.max(...w) - Math.min(...w)).toBeLessThan(1);
      expect(Math.max(...read(e, 'pleth', 36, 40))).toBeLessThan(0.01);
      const m = ev.filter((x) => x.type === 'measurement' && x.t === 40 && 'pr' in x.values)[0] as Extract<EngineEvent, { type: 'measurement' }>;
      expect(m.values.pr!.flag).toBe('invalid');
      const st = ev.filter((x) => x.type === 'state').pop() as Extract<EngineEvent, { type: 'state' }>;
      expect(st.control.sbp).toBe('override');
    });
  }

  it('7. CPR at 110/min, quality 1: arterial trace 70–110 / 10–30 mmHg; a pause collapses it within 5 s', () => {
    const { e, ev } = rig({ seed: 8 });
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } }));
    e.advanceTo(50);
    const w = read(e, 'abp', 45, 50);
    expect(Math.max(...w)).toBeGreaterThanOrEqual(70);
    expect(Math.max(...w)).toBeLessThanOrEqual(110);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(10);
    expect(Math.min(...w)).toBeLessThanOrEqual(30);
    expect(mean(numeric(ev, 'pr', 45, 50))).toBeCloseTo(110, -1);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: false } }));
    e.advanceTo(56);
    const p = read(e, 'abp', 55, 56);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThan(5);
    expect(Math.max(...p)).toBeLessThan(25);
  });

  it('8. transducer: fn 10/ζ 0.2 raises SBP 5–30 with MAP ±2; ζ 1.2 lowers SBP, raises DBP, MAP ±2', () => {
    const run = (fnHz: number, zeta: number) => {
      const { e, ev } = rig({ seed: 9, hrv: false });
      e.advanceTo(30);
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'damp', value: zeta, fnHz } }));
      e.advanceTo(50);
      const avg = (id: 'abpSys' | 'abpDia' | 'abpMean', t0: number, t1: number) => mean(numeric(ev, id, t0, t1));
      return { dS: avg('abpSys', 40, 50) - avg('abpSys', 20, 30), dD: avg('abpDia', 40, 50) - avg('abpDia', 20, 30), dM: avg('abpMean', 40, 50) - avg('abpMean', 20, 30) };
    };
    const under = run(10, 0.2);
    expect(under.dS).toBeGreaterThanOrEqual(5);
    expect(under.dS).toBeLessThanOrEqual(30);
    expect(Math.abs(under.dM)).toBeLessThanOrEqual(2);
    const over = run(20, 1.2);
    expect(over.dS).toBeLessThan(0);
    expect(over.dD).toBeGreaterThan(0);
    expect(Math.abs(over.dM)).toBeLessThanOrEqual(2);
  });

  it('8. flush test: a 300 mmHg square wave, then ringing with period 1/fn ± 5%', () => {
    const { e } = rig({ seed: 10 });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'damp', value: 0.2, fnHz: 10 } }));
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } }));
    e.advanceTo(34);
    const y = read(e, 'abp', 30, 34);
    expect(y.filter((v) => v > 280).length / 125).toBeGreaterThan(0.5);
    const base = y[y.length - 1]!;
    const rel = y.findIndex((v, i) => i > 10 && v < 280 && y[i - 1]! >= 280);
    const zc: number[] = [];
    for (let i = rel + 3; i < y.length - 1; i++) {
      const a = y[i]! - base;
      const b = y[i + 1]! - base;
      if (a < 0 && b >= 0) zc.push(i + -a / (b - a));
    }
    const period = (zc[3]! - zc[0]!) / 3 / 125;
    expect(period).toBeGreaterThanOrEqual(0.095);
    expect(period).toBeLessThanOrEqual(0.105);
  });

  it('10. PPV: g_hyp 0.05 → 5–10%; g_hyp 0.2 → 15–30%; SPV grows with it', () => {
    const ppvOf = (g: number) => {
      const { e, ev } = rig({ seed: 11, hrv: false });
      // Stage 3: PPV is an index of the MECHANICALLY ventilated patient; the respiratory driver now supplies the breath
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 15, vtMl: 500, peep: 5 } }));
      e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: volumeStatusForGHyp(g) }));
      e.advanceTo(70);
      const abp = read(e, 'abp', 0, 70);
      const beats = beatsOf(ev, 30, 68).map((b) => {
        const w = abp.subarray(Math.round(b.t * 125), Math.round((b.t + 0.8) * 125));
        return { t: b.t, pp: Math.max(...w) - Math.min(...w), sys: Math.max(...w) };
      });
      const ppv: number[] = [];
      const spv: number[] = [];
      for (let t0 = 32; t0 + 4 <= 66; t0 += 4) {
        const s = beats.filter((x) => x.t >= t0 && x.t < t0 + 4);
        const hi = Math.max(...s.map((x) => x.pp));
        const lo = Math.min(...s.map((x) => x.pp));
        ppv.push((100 * (hi - lo)) / ((hi + lo) / 2));
        spv.push(Math.max(...s.map((x) => x.sys)) - Math.min(...s.map((x) => x.sys)));
      }
      return { ppv: mean(ppv), spv: mean(spv) };
    };
    const lo = ppvOf(0.05);
    const hi = ppvOf(0.2);
    expect(lo.ppv).toBeGreaterThanOrEqual(5);
    expect(lo.ppv).toBeLessThanOrEqual(10);
    expect(hi.ppv).toBeGreaterThanOrEqual(15);
    expect(hi.ppv).toBeLessThanOrEqual(30);
    expect(hi.spv).toBeGreaterThan(2 * lo.spv);
  });

  it('11. CVP: the a wave peaks 80–100 ms after P onset; AF has no a wave', () => {
    const { e, ev } = rig({ hr: 60, hrv: false, seed: 12, sensors: { cvp: 'connected' } });
    e.advanceTo(30);
    const cvp = read(e, 'cvp', 0, 30);
    const ps = ev
      .filter((x): x is Extract<EngineEvent, { type: 'atrial' }> => x.type === 'atrial' && x.kind === 'p' && x.t > 20 && x.t < 28)
      .map((x) => x.t);
    expect(ps.length).toBeGreaterThan(5);
    for (const tp of ps) {
      const w = cvp.subarray(Math.round(tp * 125), Math.round((tp + 0.2) * 125));
      const dt = w.indexOf(Math.max(...w)) / 125;
      expect(dt).toBeGreaterThanOrEqual(0.08);
      expect(dt).toBeLessThanOrEqual(0.1);
    }
    // AF: no P waves, so the pre-QRS window carries no a-wave bump
    const bump = (rhythm: 'sinus' | 'afib') => {
      const r = rig({ hr: 60, hrv: false, seed: 12, sensors: { cvp: 'connected' } });
      if (rhythm === 'afib') r.e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 60 } }));
      r.e.advanceTo(40);
      const c = read(r.e, 'cvp', 0, 40);
      return mean(beatsOf(r.ev, 20, 38).map((b) => c[Math.round((b.t - 0.12) * 125)]! - c[Math.round((b.t - 0.3) * 125)]!));
    };
    expect(bump('sinus')).toBeGreaterThan(1.5);
    expect(Math.abs(bump('afib'))).toBeLessThan(1);
    expect(ev.some((x) => x.type === 'atrial' && x.kind === 'p')).toBe(true);
  });
});
