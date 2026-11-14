// Brief 157 (plan vent-skin-edp-ts.md V2): the EDP-TS device's breath behaviours, each an option of the model that is
// off by default (options-off.test.ts proves off is the base model bit for bit). Each test turns one option on and
// checks the behaviour the manual states, cited by its research/57 row.
import { describe, expect, it } from 'vitest';
import { createVent, stepVent, ventAlarms, DT, type VentConfig, type VentState } from '../src/index.ts';

const steps = (vs: VentState, s: number) => {
  for (let i = Math.round(s / DT); i > 0; i--) stepVent(vs);
};
const hasApnea = (vs: VentState) => ventAlarms(vs).some((a) => a.id === 'apnea');

describe('apnoea backup (manual pp. 49–50; research/57 T-37, T-38, A-26, A-45)', () => {
  const PSV: Partial<VentConfig> = { mode: 'PSV', spont: true, ps: 10, peep: 5, pmus: 8, spontRate: 16, apneaTime: 15, rate: 12, backupMode: 'VC' };

  it('15 s with no patient breath starts VCV backup breaths at the set rate and the Apnea alarm; the patient breathing again ends both', () => {
    const vs = createVent(PSV);
    steps(vs, 30);
    expect(vs.backupBreath).toBeUndefined();
    expect(hasApnea(vs)).toBe(false);
    vs.cfg.pmus = 0; // the patient stops breathing
    const t0 = vs.lastBreathT;
    // until the apnoea time has passed, no breath starts and no backup
    while (vs.p.t < t0 + 15 - DT) {
      stepVent(vs);
      expect(vs.backupBreath).toBeUndefined();
    }
    // within one step of the apnoea time the first backup breath starts, of the chosen kind, a mandatory breath
    steps(vs, 2 * DT);
    expect(vs.backupBreath).toBe('VC');
    expect(vs.p.phase).toBe('insp');
    expect(vs.p.markers.at(-1)!.type).toBe('mand');
    const first = vs.p.markers.at(-1)!.t;
    expect(first - t0).toBeGreaterThanOrEqual(15);
    expect(first - t0).toBeLessThanOrEqual(15 + DT + 1e-9);
    expect(hasApnea(vs)).toBe(true);
    // the backup ventilates at the set rate, VCV breaths delivering the set VT, while the Apnea alarm stays raised
    steps(vs, 20);
    const mand = vs.p.markers.filter((m) => m.type === 'mand' && m.t >= first);
    // the set rate's period, 5 s, to within the one 5 ms step of the base model's own mandatory timing (breathT >= period)
    expect(mand.length).toBe(4);
    for (let i = 1; i < mand.length; i++) expect(Math.abs(mand[i]!.t - mand[i - 1]!.t - 60 / 12)).toBeLessThanOrEqual(DT + 1e-9);
    expect(Math.abs(vs.p.measured.VTE - vs.cfg.vt)).toBeLessThanOrEqual(10);
    expect(vs.backupBreath).toBe('VC');
    expect(hasApnea(vs)).toBe(true);
    // the patient breathes again: a patient-triggered breath ends the backup and the alarm (A-26)
    vs.cfg.pmus = 8;
    steps(vs, 10);
    expect(vs.p.markers.at(-1)!.type).toBe('pt');
    expect(vs.backupBreath).toBeUndefined();
    expect(hasApnea(vs)).toBe(false);
  });

  it('PCV backup breaths are pressure-controlled breaths at the set PC and Ti', () => {
    const vs = createVent({ ...PSV, backupMode: 'PC', pc: 18, itime: 1.0 });
    steps(vs, 30);
    vs.cfg.pmus = 0;
    steps(vs, 30);
    expect(vs.backupBreath).toBe('PC');
    expect(vs.p.measured.PIP).toBeGreaterThan(5 + 18 - 1.5);
    expect(vs.p.measured.PIP).toBeLessThan(5 + 18 + 1.5);
  });

  it('with backupMode off (or absent) the 6 s safety breath of the base model stays, and no backup breath is stamped', () => {
    for (const backupMode of ['off', undefined] as const) {
      const vs = createVent({ ...PSV, backupMode });
      steps(vs, 30);
      vs.cfg.pmus = 0;
      steps(vs, 20);
      expect(vs.backupBreath).toBeUndefined();
      const mand = vs.p.markers.filter((m) => m.type === 'mand');
      expect(mand.length).toBeGreaterThanOrEqual(2);
      expect(mand.at(-1)!.t - mand.at(-2)!.t).toBeCloseTo(6, 1);
    }
  });
});

describe('pmaxAction cycle (manual p. 95; research/57 A-32)', () => {
  it('a VCV breath whose pressure reaches the limit ends within one 5 ms step (cap: the same breath is held at Pmax)', () => {
    const cfg: Partial<VentConfig> = { mode: 'VC', vt: 800, vcFlow: 60, compliance: 25, resistance: 10, pmax: 30, pause: 0, peep: 5 };
    const cap = createVent(cfg);
    const cyc = createVent({ ...cfg, pmaxAction: 'cycle' });
    let hit = -1;
    for (let i = 0; i < Math.round(10 / DT); i++) {
      stepVent(cap);
      stepVent(cyc);
      if (cap.p.phase === 'insp' && cap.p.Paw >= cap.cfg.pmax) {
        hit = i;
        break;
      }
      // identical until the limit is reached
      expect(cyc.p.Paw).toBe(cap.p.Paw);
    }
    expect(hit).toBeGreaterThan(0);
    // on the same step the cycling model has ended the breath; the capping model is still inspiring
    expect(cyc.p.phase).toBe('exp');
    expect(cap.p.phase).toBe('insp');
    // and the cycling breath delivered less than VT (the capping one goes on to deliver it)
    expect(cyc.p.V - cyc.p.breathVstart).toBeLessThan(800);
    // its PIP is the pressure that reached the limit, so the High Pressure alarm (the model's pmax) is raised
    expect(cyc.p.measured.PIP).toBeGreaterThanOrEqual(cyc.cfg.pmax);
    expect(ventAlarms(cyc).map((a) => a.id)).toContain('pmax');
  });

  it('a pressure-controlled breath set above the limit also ends at the limit', () => {
    const vs = createVent({ mode: 'PC', pc: 40, peep: 5, pmax: 30, itime: 1.0, pmaxAction: 'cycle' });
    steps(vs, 0.5);
    let insp = 0;
    while (vs.p.phase === 'insp') {
      stepVent(vs);
      insp++;
    }
    expect(insp * DT).toBeLessThan(1.0);
  });
});

describe('flowPattern ramp0, the descending ramp to zero (manual p. 43; research/57 T-26)', () => {
  it('the flow falls linearly from twice the mean to zero at Ti, and the breath delivers VT', () => {
    const vs = createVent({ mode: 'VC', vt: 500, vcFlow: 60, flowPattern: 'ramp0', pause: 0, compliance: 60, resistance: 5, pmax: 80, peep: 5 });
    const mean = 1; // L/s
    const Ti = 0.5; // s = VT / mean flow
    const N = Math.round(Ti / DT);
    steps(vs, 5);
    const phase = () => vs.p.phase;
    while (phase() === 'insp') stepVent(vs);
    while (phase() !== 'insp') stepVent(vs);
    // inspiration starts at the end of a step; each following inspiratory step is one sample of the ramp
    const q: number[] = [];
    const v0 = vs.p.V;
    let vEnd = 0;
    while (phase() === 'insp') {
      stepVent(vs);
      q.push(vs.p.Q);
      vEnd = vs.p.V - v0;
    }
    // the ramp's step samples are its midpoints: 2·mean·(1 − (k + ½)/N); the first is ≈ 2·mean, the last mean/N
    expect(q.length).toBe(N);
    q.forEach((x, k) => expect(x).toBeCloseTo(2 * mean * (1 - (k + 0.5) / N), 9));
    expect(q.at(-1)!).toBeCloseTo(mean / N, 9);
    // linear to zero at Ti: the line through the samples meets zero at Ti
    const slope = (q[N - 1]! - q[0]!) / ((N - 1) * DT);
    expect((0.5 * DT - q[0]! / slope)).toBeCloseTo(Ti, 9);
    // the breath delivers the set VT
    expect(vEnd).toBeCloseTo(500, 6); // mL
  });
});
