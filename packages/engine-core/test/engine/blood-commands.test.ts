import { describe, expect, it } from 'vitest';
import { circCoLpm, circVolumeMl, evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('Stage 7c commands and labs (plan decisions 11, 13)', { timeout: 300_000 }, () => {
  it('validates the 7c kinds, leaves drugs to 7g and passes everything else on', () => {
    const { e } = rigB();
    expect(e.dispatch(evB({ kind: 'fluid', fluid: 'saline', volumeMl: 500, overS: 600 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'fluid', fluid: 'colloid', volumeMl: 500, overS: 600 })).accepted).toBe(true); // 7a's id
    expect(e.dispatch(evB({ kind: 'fluid', fluid: 'lemonade', volumeMl: 500 })).accepted).toBe(false);
    expect(e.dispatch(evB({ kind: 'bleed', rateMlPerMin: 100 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'transfusion', product: 'rbc', units: 2 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' })).accepted).toBe(true); // 7g's row
    expect(e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'units', route: 'iv' })).accepted).toBe(false); // 7g's unit check
    expect(e.dispatch(evB({ kind: 'condition', id: 'burns', severity: 0.5 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'condition', id: 'mh', severity: 1 })).accepted).toBe(true); // still Stage 3's
    expect(e.dispatch(evB({ kind: 'lab', panel: 'abg' })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'lab', panel: 'csf' })).accepted).toBe(false);
  });
  it('emits `labs` once per second and the ABG 120 s after the draw, frozen at the draw', async () => {
    const { e, ev } = rigB();
    await runTo(e, 30);
    expect(ev.filter((x) => x.type === 'labs' && x.t > 20 && x.t <= 30)).toHaveLength(10);
    const v = labsAt(ev, 30);
    expect(v.ph).toBeGreaterThan(7.3);
    expect(v.ph).toBeLessThan(7.5);
    expect(v.k).toBeCloseTo(4.2, 1);
    e.dispatch(evB({ kind: 'lab', panel: 'abg' }));
    e.dispatch(evB({ kind: 'bleed', volumeMl: 1500, overS: 60 }));
    await runTo(e, 160);
    const r = ev.find((x) => x.type === 'labResult');
    expect(r).toBeDefined();
    if (r?.type !== 'labResult') return;
    expect(r.t - r.drawnAt).toBeCloseTo(120, 0);
    expect(r.values.hb).toBeCloseTo(15, 0); // drawn before the bleed
  });
  it('a bleed moves out of Stage 7a’s circuit (volume and CO fall), kChem is written, no Stage 2 fallback', async () => {
    const { e } = rigB();
    await runTo(e, 20);
    const v0 = circVolumeMl(e);
    const co0 = circCoLpm(e);
    e.dispatch(evB({ kind: 'bleed', volumeMl: 1750, overS: 600 }));
    await runTo(e, 700);
    const s = st(e);
    console.log(`7a present: circuit −${(v0 - circVolumeMl(e)).toFixed(0)} mL, blood bvRel ${s.blood.out.bvRel.toFixed(3)}, CO ${co0.toFixed(2)} → ${circCoLpm(e).toFixed(2)} L/min, CO0 ${s.blood.core.co0.toFixed(2)}`);
    expect(v0 - circVolumeMl(e)).toBeGreaterThan(1500); // the bleed less the refill reached the circuit
    expect(s.blood.out.bvRel).toBeLessThan(0.7);
    expect(circCoLpm(e)).toBeLessThan(0.8 * co0);
    expect(s.blood.view.coFactor).toBe(1); // the circuit carries the CO fall; no Stage 3 fallback factor
    expect(s.hemo.circ.ext.kChem).toBeDefined();
    expect(s.l1.coupled?.volumeStatus).toBeUndefined();
  });
});
