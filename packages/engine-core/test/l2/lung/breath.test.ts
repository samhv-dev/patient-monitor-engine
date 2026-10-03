// Stage 7k (R57): the per-breath arithmetic, the oesophageal-pressure estimate and the Enghoff dead-space set.
import { describe, expect, it } from 'vitest';
import { breathMechanics, deadSpaceSet, pesEstimate, PES_FRC_CMH2O } from '../../../src/l2/lung/breath.ts';

describe('Stage 7k: per-breath mechanics', () => {
  it('square-flow VCV: ΔP = Pplat − PEEPtot, Cstat = VT/ΔP, Cdyn = VT/(Ppeak − PEEPtot), Rinsp = (Ppeak − Pplat)/V̇', () => {
    const m = breathMechanics({ t: 10, mech: true, limited: false, vt: 500, ti: 1, peep: 5, ppeak: 20, pplat: 15, peepTot: 7, pesEi: 9, pesEe: 8, elErs: 0.7 });
    expect(m).toMatchObject({ kind: 'mech', dp: 8, cstat: 62.5, cdyn: 38.5, rinsp: 10, flow: 0.5, peepi: 2, plEi: 6, plEe: -1 });
  });
  it('a spontaneous breath has no hold readings (null) and PL = −Pes', () => {
    const m = breathMechanics({ t: 10, mech: false, limited: false, vt: 480, ti: 1.5, peep: 0, ppeak: 0, pplat: 0, peepTot: 0, pesEi: 3, pesEe: 7, elErs: 0.7 });
    expect(m).toMatchObject({ kind: 'spont', ppeak: null, pplat: null, peepTot: null, peepi: null, dp: null, cstat: null, cdyn: null, rinsp: null, plEi: -3, plEe: -7 });
  });
  it('a breath without square flow (held at Pmax, or an external PCV/PSV frame) has no Rinsp (F7)', () => {
    const m = breathMechanics({ t: 10, mech: true, limited: true, vt: 450, ti: 1, peep: 5, ppeak: 40, pplat: 25, peepTot: 17, pesEi: 14, pesEe: 11, elErs: 0.7 });
    expect(m.rinsp).toBeNull();
    expect(m.cstat).toBeCloseTo(56.3, 1);
  });
  it('Pes estimate (supine, ventilated/anaesthetised): 6.9 cmH2O lean supine at the relaxation volume; 9.3 at BMI 33.3 (Owens 2012 means)', () => {
    expect(pesEstimate(0, 22)).toBeCloseTo(PES_FRC_CMH2O, 6);
    expect(pesEstimate(0, 33.3)).toBeCloseTo(9.3, 1);
    expect(pesEstimate(2.5, 22)).toBeCloseTo(9.4, 6);
  });
});

describe('Stage 7k: dead-space set (Enghoff)', () => {
  it('ideal lung (e 1, φ 1, no rebreathing): VD/VT = VDs/VT, PĒCO2 = PaCO2·(1 − VDs/VT), VD alv 0', () => {
    const d = deadSpaceSet({ vt: 500, vdSeries: 150, vdApp: 50, paco2: 40, pico2: 0, e: 1, phi: 1 });
    expect(d).toEqual({ anat: 100, app: 50, alv: 0, phys: 150, vdvt: 0.3, peco2: 28 });
  });
  it('rebreathing (PICO2 10): PĒCO2 = PICO2 + φe(1 − VDs/VT)(PaCO2 − PICO2) and VD/VT is unchanged by the inspired CO2 (Enghoff with the inspired correction, F6)', () => {
    const d = deadSpaceSet({ vt: 500, vdSeries: 150, vdApp: 50, paco2: 40, pico2: 10, e: 1, phi: 1 });
    expect(d.peco2).toBeCloseTo(31, 6); // 10 + 0.7 × 30
    expect(d.vdvt).toBeCloseTo(0.3, 6);
  });
  it('alveolar dead space and admixture lower e: VD phys > VDs, VD alv = VD phys − VDs', () => {
    const d = deadSpaceSet({ vt: 500, vdSeries: 150, vdApp: 0, paco2: 40, pico2: 0, e: 0.8, phi: 1 });
    expect(d.vdvt).toBeCloseTo(0.44, 2);
    expect(d.alv).toBe(d.phys - 150);
  });
});
