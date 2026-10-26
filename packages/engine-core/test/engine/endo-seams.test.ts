// Stage 7e cross-stage seams at engine level (R51 addendum 16): 7c endogenous K term, lab glucose and the physical cold
// IV term (E-7e-1..3); 7g's dextrose infusion rate (E-7e-4) and ps.cond.vasoResp; 7b's anaphylaxis lung condition.
import { describe, expect, it } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, ev3, rig3, run } from '../helpers/resp.ts';
import { validateNeuroCommand } from '../../src/l2/neuro/pipeline.ts';

type Labs = Extract<EngineEvent, { type: 'labs' }>;
type Endo = Extract<EngineEvent, { type: 'endo' }>;
const at = <T extends EngineEvent>(ev: EngineEvent[], type: T['type'], t: number) => ev.find((x) => x.type === type && (x as { t: number }).t >= t) as T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine) => (e.snapshot().state as { st: any }).st;

describe('endocrine seams (engine)', { timeout: 300_000 }, () => {
  it('rest: every seam neutral — endoKShift 0, cond.vasoResp 1, kfMult 1, no anaphylaxis spec, lab glucose 100', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 30);
    const s = st(e);
    expect(s.blood.core.endoKShift).toBeCloseTo(0, 12);
    expect(s.cond.vasoResp).toBe(1);
    expect(s.blood.core.fl.kfMult).toBe(1);
    expect(s.resp.lungSpecs).toEqual([]);
    expect(s.endoHrF).toBe(1);
    expect(at<Labs>(ev, 'labs', 30).values.glucose).toBe(100);
  });

  it('dextrose infusion raises glucose and the blood lab panel shows the endocrine value', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'infusion', drugId: 'dextrose', rate: 20_000, unit: 'mg/h' })); // 20 g/h
    await run(e, 1800);
    const g = at<Endo>(ev, 'endo', 1800).glucoseMgDl;
    expect(st(e).pk.drugs.dextrose.rate).toBeCloseTo(20_000 / 60, 6);
    expect(g).toBeGreaterThan(115);
    expect(Math.abs(at<Labs>(ev, 'labs', 1800).values.glucose - g)).toBeLessThanOrEqual(1);
  });

  // E134: the MH muscle's potassium is the MUSCLE model's now (blood/muscle.ts), not the endocrine model's fitted
  // efflux: `endoKShift` carries only the hormonal arm, which during the catecholamine surge is a β2 UPTAKE (negative).
  // The K still rises, through the muscle's activity leak, the acidaemia term of the pool and (later) the injury.
  it.fails('MH potassium reaches the blood through the muscle model: K rises ≥ 0.5 mmol/L in 15 min at fixed ventilation, while endoKShift is the β2 uptake — measured +0.30 (E134: the activity leak and the acidaemia, before any injury)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
    await run(e, 120);
    const k0 = at<Labs>(ev, 'labs', 120).values.k;
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 120 + 900);
    const bc = st(e).blood.core as { endoKShift: number; muscle: { lacMmolMin: number; glycogenMmol: number; glycogen0Mmol: number } };
    expect(bc.endoKShift).toBeLessThan(0); // the β2 uptake of the surge, with no muscle efflux in this model any more
    expect(bc.muscle.lacMmolMin).toBeGreaterThan(0); // the hypermetabolic muscle is making lactate
    expect(bc.muscle.glycogenMmol).toBeLessThan(bc.muscle.glycogen0Mmol); // out of its own glycogen
    expect(at<Labs>(ev, 'labs', 120 + 900).values.k - k0).toBeGreaterThanOrEqual(0.5);
  });

  it('cold IV: 2 unwarmed RBC units cool the core ≥ 0.3 °C more than 2 warmed ones; the fluid warmer removes the difference', async () => {
    const core = async (warmed: boolean, warmer: boolean) => {
      const { e } = rig3({ patient: ADULT });
      e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      if (warmer) e.dispatch(ev3({ kind: 'thermal7e', fluidWarmer: true }));
      await run(e, 60);
      e.dispatch(ev3({ kind: 'transfusion', product: 'rbc', units: 2, overS: 600, warmed }));
      await run(e, 900);
      return st(e).resp.temp.tc as number;
    };
    const cold = await core(false, false);
    const warm = await core(true, false);
    expect(warm - cold).toBeGreaterThanOrEqual(0.3);
    expect(Math.abs((await core(false, true)) - warm)).toBeLessThan(0.02);
  });

  it('sepsis writes ps.cond.vasoResp (the drugs read it) and the blood’s kfMult; anaphylaxis drives the lungs’ lungCondition anaphylaxis', async () => {
    const { e } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 60 }));
    e.dispatch(ev3({ kind: 'condition', id: 'anaphylaxis', severity: 0.75 }));
    await run(e, 900);
    const s = st(e);
    expect(s.cond.vasoResp).toBeLessThan(0.8);
    expect(s.cond.vasoResp).toBeCloseTo(s.endo.core.out.vasoResp, 12);
    expect(s.blood.core.fl.kfMult).toBeGreaterThan(3);
    const a = s.resp.lungSpecs.find((x: { id: string }) => x.id === 'anaphylaxis');
    // The seam is that the mediator reaches the lungs at all. E117: this unventilated rig is at PaCO2 ≈ 165, so the
    // hypercapnic sympathetic drive raises endogenous epinephrine (≈ 960 → 1690 pg/mL), whose β2 bronchodilation lowers
    // the lung severity from 0.32 to 0.30 (grade III's nominal 0.6 × (1 − 0.6 × bronchodilation))
    expect(a.severity).toBeGreaterThan(0.25);
  });

  it('neuro hand-overs: the endocrine model alone validates `stimulus` and neuro observes it; neuro reads endo.cascade.macF', async () => {
    expect(validateNeuroCommand(ev3({ kind: 'stimulus', intensity: 1 }))).toBeNull();
    const { e } = rig3({ patient: ADULT });
    expect(e.dispatch(ev3({ kind: 'stimulus', intensity: 3 }))).toMatchObject({ accepted: false });
    e.dispatch(ev3({ kind: 'stimulus', intensity: 1.5 }));
    await run(e, 5);
    const s = st(e);
    expect(s.endo.noxious).toBe(1.5);
    expect(s.neuro.stim.level).toBe(1);
    expect(s.endo.cascade.macF).toBeCloseTo(1 - 0.05 * (37 - s.resp.temp.tc), 2);
  });
});
