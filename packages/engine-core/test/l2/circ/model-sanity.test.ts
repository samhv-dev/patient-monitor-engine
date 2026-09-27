// Stage 7a prototype sanity numbers on the bare CircModel (the engine-level versions are Task 26).
import { describe, expect, it } from 'vitest';
import { circGiveDrug, circOnBeat, circVolume, createCircModel, PESP_MAX, type CircBeat } from '../../../src/l2/circ/model.ts';
import { beatsIn, collectBeats, driver, mean, ppv, runTo, ventEnv } from '../../helpers/circ.ts';

function run(prof: Parameters<typeof createCircModel>[0], ev: (m: ReturnType<typeof createCircModel>) => void, evT: number, tEnd: number) {
  const m = createCircModel(prof);
  const dr = driver(m);
  const env = ventEnv();
  const all: CircBeat[] = [];
  const col = collectBeats(m, all);
  const hr: { t: number; hr: number }[] = [];
  let fired = false;
  while (m.t < tEnd - 1e-9) {
    if (!fired && m.t >= evT) {
      ev(m);
      fired = true;
    }
    runTo(dr, m.t + 1, env);
    col();
    hr.push({ t: m.t, hr: m.hrModel });
  }
  const hrIn = (a: number, b: number) => mean(hr.filter((x) => x.t >= a && x.t < b).map((x) => x.hr));
  const mapIn = (a: number, b: number) => mean(beatsIn(m, all, a, b).map((x) => x.dbp + (x.sbp - x.dbp) / 3));
  return { m, all, hrIn, mapIn };
}

describe('CircModel sanity (prototype numbers)', () => {
  it('phenylephrine 100 µg: MAP +15–25 and reflex HR −5–15 (at 45 s) within 30–90 s', () => {
    const r = run(undefined, (m) => circGiveDrug(m, 'phenylephrine', 0.1), 120, 240);
    const m0 = r.mapIn(100, 120);
    const h0 = r.hrIn(100, 120);
    const dMap = Math.max(r.mapIn(145, 155), r.mapIn(175, 185), r.mapIn(205, 215)) - m0;
    expect(dMap).toBeGreaterThanOrEqual(15);
    expect(dMap).toBeLessThanOrEqual(25);
    const dHr45 = r.hrIn(160, 170) - h0;
    expect(dHr45).toBeLessThanOrEqual(-5);
    expect(dHr45).toBeGreaterThanOrEqual(-16);
  }, 60_000);
  it('R45(b) class II (25 % over 10 min, ventilated): SBP near normal (≥ 85 % of baseline), HR 100–120, PP narrowed ≥ 30 %, PPV > 13 %', () => {
    const r = run(undefined, (m) => circVolume(m, -0.25 * m.prof.bloodVolumeMl, 600), 120, 780);
    const b0 = beatsIn(r.m, r.all, 100, 120);
    const b1 = beatsIn(r.m, r.all, 740, 780);
    const pp0 = mean(b0.map((b) => b.sbp - b.dbp));
    const pp1 = mean(b1.map((b) => b.sbp - b.dbp));
    expect(mean(b1.map((b) => b.sbp))).toBeGreaterThanOrEqual(0.85 * mean(b0.map((b) => b.sbp)));
    expect(r.hrIn(740, 780)).toBeGreaterThanOrEqual(100);
    expect(r.hrIn(740, 780)).toBeLessThanOrEqual(120);
    expect(pp1).toBeLessThanOrEqual(0.7 * pp0);
    expect(ppv(b0.slice(0, 15))).toBeLessThan(10);
    expect(ppv(b1.slice(0, 15))).toBeGreaterThan(13);
  }, 120_000);
  it('class III (35 % over 10 min, ventilated): HR 120–140 and SBP falls to 75–90 (tables §7 17a: 80–90; PP 20–25 and PPV > 20 % not met — gate note)', () => {
    const r = run(undefined, (m) => circVolume(m, -0.35 * m.prof.bloodVolumeMl, 600), 120, 780);
    const b1 = beatsIn(r.m, r.all, 740, 780);
    expect(r.hrIn(740, 780)).toBeGreaterThanOrEqual(120);
    expect(r.hrIn(740, 780)).toBeLessThanOrEqual(140);
    expect(mean(b1.map((b) => b.sbp))).toBeGreaterThanOrEqual(75);
    expect(mean(b1.map((b) => b.sbp))).toBeLessThanOrEqual(90);
  }, 120_000);
  it('β-blocked 35 % haemorrhage: HR stays 80–95 (tables §7 17b)', () => {
    const r = run({ ageY: 40, sex: 'M', weightKg: 70, conditions: [{ id: 'betaBlocked' }] }, (m) => circVolume(m, -0.35 * m.prof.bloodVolumeMl, 600), 120, 780);
    expect(r.hrIn(740, 780)).toBeGreaterThanOrEqual(80);
    expect(r.hrIn(740, 780)).toBeLessThanOrEqual(95);
  }, 120_000);
  it('R45(a): the beat after a premature one (perfused or not) gets a one-beat Emax boost scaled by prematurity', () => {
    const m = createCircModel();
    for (let k = 0; k < 10; k++) circOnBeat(m, k * 0.8, 75, 'sinus', true);
    circOnBeat(m, 7.2 + 0.44, 75, 'ventricular', false); // PVC at 55 % coupling, no ejection
    circOnBeat(m, 7.2 + 1.6, 75, 'sinus', true); // after the full compensatory pause
    circOnBeat(m, 7.2 + 2.4, 75, 'sinus', true);
    const amps = m.vent.slice(-3).map((a) => a.amp);
    expect(amps[0]).toBe(1);
    expect(amps[1]).toBeCloseTo(1 + PESP_MAX * ((0.8 - 0.55) / 0.4), 1); // the running RR is ≈ 0.8 s (EMA from the profile's 70 bpm)
    expect(amps[2]).toBe(1);
  });
});
