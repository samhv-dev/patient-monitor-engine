import { describe, expect, it } from 'vitest';
import { diffs, mean, run5, type Beat, type Marker } from '../../../helpers/s5.ts';

const spikes = (m: Marker[], chamber: 1 | 2) => m.filter((x) => x.kind === 'paceSpike' && x.data?.chamber === chamber);

describe('Stage 5 paced rhythms', () => {
  it('pacedVVI (CHB underneath): V spike → wide paced QRS 140–180 ms at the lower rate; P waves march through', () => {
    const { beats, markers, atrial } = run5('pacedVVI', 60);
    const v = spikes(markers, 2);
    const paced = beats.filter((b) => b.origin === 'paced');
    expect(paced.length).toBeGreaterThan(60);
    expect(60 / mean(diffs(paced.map((b) => b.t)))).toBeCloseTo(70, 0);
    expect(paced.every((b) => b.qrsMs >= 140 && b.qrsMs <= 180)).toBe(true);
    for (const b of paced) expect(v.some((s) => b.t - s.t > 0 && b.t - s.t < 0.1)).toBe(true);
    expect(atrial.every((a) => !a.conducted)).toBe(true);
  });

  it('pacedAAI: A spike → P → narrow conducted QRS; intrinsic sinus slower than the pacer', () => {
    const { beats, markers } = run5('pacedAAI', 60);
    const a = spikes(markers, 1);
    expect(a.length).toBeGreaterThan(60);
    expect(spikes(markers, 2).length).toBe(0);
    expect(beats.every((b) => b.qrsMs < 120)).toBe(true);
    expect(60 / mean(diffs(beats.map((b) => b.t)))).toBeCloseTo(70, 0);
  });

  it('pacedDDD: A spike, AV delay 160 ms, V spike, paced QRS (AV sequential)', () => {
    const { beats, markers } = run5('pacedDDD', 60);
    const a = spikes(markers, 1);
    const v = spikes(markers, 2);
    expect(a.length).toBeGreaterThan(60);
    expect(v.length).toBeGreaterThan(60);
    for (const s of v.slice(2, 20)) {
      const prevA = a.filter((x) => x.t < s.t).at(-1)!;
      expect(s.t - prevA.t).toBeCloseTo(0.16, 6);
    }
    expect(beats.filter((b) => b.origin === 'paced').length).toBeGreaterThan(60);
  });

  it('pacedDDD with a faster sinus: atrial tracking (no A spikes, V spike 160 ms after each P)', () => {
    const { markers, atrial } = run5('pacedDDD', 30, { rhythmOpts: { atrialRateBpm: 85 } });
    expect(spikes(markers, 1).length).toBe(0);
    const v = spikes(markers, 2);
    for (const s of v.slice(1)) {
      const p = atrial.filter((x) => x.t < s.t).at(-1)!;
      expect(s.t - p.t).toBeCloseTo(0.16, 6);
    }
  });

  it('demand VVI is inhibited by conducted intrinsic beats faster than the lower rate', () => {
    const { markers, beats } = run5('pacedVVI', 30, { rhythmOpts: { atrialRateBpm: 85, pacer: { intrinsic: 'conducted' } } });
    expect(spikes(markers, 2).length).toBe(0);
    expect(beats.every((b: Beat) => b.origin === 'sinus')).toBe(true);
  });
});

describe('Stage 5 pacing faults (acceptance 8)', () => {
  it('failureToCapture: spikes with no paced QRS after them', () => {
    const { markers, beats } = run5('pacedVVI', 60, { rhythmOpts: { pacer: { fault: 'failureToCapture', faultRate: 1 } } });
    const v = spikes(markers, 2);
    expect(v.length).toBeGreaterThan(40);
    expect(v.every((s) => s.data?.captured === false)).toBe(true);
    expect(beats.filter((b) => b.origin === 'paced').length).toBe(0);
  });

  it('failureToSense: spikes at the programmed rate regardless of intrinsic beats, some on T waves', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { atrialRateBpm: 80, pacer: { intrinsic: 'conducted', fault: 'failureToSense', ratePpm: 60 } } });
    const v = spikes(markers, 2);
    const iv = diffs(v.map((s) => s.t));
    expect(Math.max(...iv) - Math.min(...iv)).toBeLessThan(1e-9); // fixed rate: never reset by sensing
    const intrinsic = beats.filter((b) => b.origin === 'sinus');
    const onT = v.filter((s) => intrinsic.some((b) => s.t - (b.t - 0.04) > 0.1 && s.t - (b.t - 0.04) < b.qtMs / 1000));
    expect(onT.length).toBeGreaterThan(5);
  });

  it('oversensing: pauses with no spikes (RR ≈ 2 pacing intervals)', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { pacer: { fault: 'oversensing', faultRate: 0.3 } } });
    const rr = diffs(beats.map((b) => b.t));
    const iv = 60 / 70;
    const pauses = rr.map((x, i) => [x, i] as const).filter(([x]) => x > 1.8 * iv);
    expect(pauses.length).toBeGreaterThan(5);
    for (const [, i] of pauses) {
      const t0 = beats[i]!.t;
      const t1 = beats[i + 1]!.t;
      expect(markers.filter((m) => m.t > t0 + 0.05 && m.t < t1 - 0.1).length).toBe(0);
    }
  });

  it('failureToPace: no spike and no complex (pauses), escape backup only', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { pacer: { fault: 'failureToPace', faultRate: 1 } } });
    expect(markers.length).toBe(0);
    expect(beats.every((b) => b.origin === 'ventricular')).toBe(true); // wide escape at 25/min
  });
});
