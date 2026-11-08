// Brief 93: the diaphragm's force is its margin of safety — the share of fibres whose free end-plate receptors stay above
// their failure threshold (Paton & Waud 1967: threshold block at occupancy 0.76, nearly complete at 0.917; Miller 10e
// ch. 39 p. 1210: 70–80 % / 90–95 %). Rig: 7g's real PK (no engine) + the PD.
import { describe, expect, it } from 'vitest';
import { readBus } from '../../../src/l2/neuro/bus.ts';
import { diaphragmNdBlock, marginForce, MOS_OCC_COMPLETE, MOS_OCC_THRESHOLD, NMB_PD, siteBlock } from '../../../src/l2/neuro/nmb.ts';
import { createSpontDrive, stepSpontDrive, type SpontInputs } from '../../../src/l2/neuro/spont.ts';
import { neuroResp } from '../../../src/l2/neuro/drive.ts';
import { give, rig, runTo } from '../../helpers/neuro.ts';
import { ONE } from '../../helpers/neuro-nmb.ts';

const Z = { rocuronium: 0, vecuronium: 0, cisatracurium: 0, succinylcholine: 0 };

describe('the margin of safety of neuromuscular transmission (brief 93)', () => {
  it('force is whole above the threshold free fraction, 0 below the most resistant fibre\'s (Paton & Waud 1967)', () => {
    const lo = 1 - MOS_OCC_COMPLETE;
    const hi = 1 - MOS_OCC_THRESHOLD;
    expect(marginForce(1 - 0.7, lo, hi)).toBe(1); // 70 % occupied: no block evident
    expect(marginForce(1 - 0.92, lo, hi)).toBe(0); // 92 % occupied: complete
    expect(marginForce((lo + hi) / 2, lo, hi)).toBeCloseTo(0.5, 9);
  });
  it('the diaphragm\'s force is halved at its own EC50 (Plaud 1995, 1424 ng/mL), and it is more resistant than the thumb', () => {
    expect(diaphragmNdBlock({ ...Z, rocuronium: NMB_PD.rocuronium.ec50Dia }, ONE)).toBeCloseTo(0.5, 6);
    expect(diaphragmNdBlock({ ...Z, rocuronium: 0.4 * NMB_PD.rocuronium.ec50Dia }, ONE)).toBe(0); // receptors in excess
    expect(diaphragmNdBlock({ ...Z, rocuronium: 3 * NMB_PD.rocuronium.ec50Dia }, ONE)).toBe(1); // past the margin
    // equipotent agents add: half of each EC50 is one EC50
    expect(diaphragmNdBlock({ ...Z, rocuronium: NMB_PD.rocuronium.ec50Dia / 2, vecuronium: NMB_PD.vecuronium.ec50Dia / 2 }, ONE)).toBeCloseTo(0.5, 6);
  });
  it('rocuronium 0.6 mg/kg: the diaphragm is completely blocked, its first force returns 12–24 min after the dose (Moerer 2005 15.9 min; Cantineau 1994 10 % at 17 ± 10), before the adductor pollicis reaches T1 10 % (Cantineau 34 ± 10; Moerer onset 25.6)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    let minForce = 1;
    let first = Number.NaN;
    let thumb10 = Number.NaN;
    runTo(r, 60, (bus, t) => {
      const x = readBus(bus);
      const f = 1 - siteBlock(x.dia, 'dia', ONE).b;
      if (t > 1) minForce = Math.min(minForce, f);
      if (t > 4 && f > 0 && Number.isNaN(first)) first = t;
      if (t > 4 && 1 - siteBlock(x.nmj, 'thumb', ONE).b > 0.1 && Number.isNaN(thumb10)) thumb10 = t;
    });
    // eslint-disable-next-line no-console -- the PR's numbers
    console.log(`brief 93: diaphragm first force ${first.toFixed(2)} min, thumb T1 10 % ${thumb10.toFixed(2)} min`);
    expect(minForce).toBe(0);
    expect(first).toBeGreaterThanOrEqual(12);
    expect(first).toBeLessThanOrEqual(24);
    expect(thumb10).toBeGreaterThan(first);
  });
});

describe('effort = drive × neuromuscular transmission (brief 93)', () => {
  const X: SpontInputs = { t: 0, paco2: 44, pao2: 100, hco3: 24, rr0: 12, vt0: 500, co2SlopeMult: 1, pMaxMult: 1, evlwi: 7, complianceMl: 55, resistance: 3, ibwKg: 70 };
  const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
  const muscle = (paco2: number, diaBlock: number): number => {
    const s = createSpontDrive();
    s.paco2Rest = 40;
    const n = neuroResp({ vent: V0, macVolatile: 0, diaBlock, tofr: 1, di: 95, naturalAirway: false, wasApnoeic: false });
    for (let t = 0; t < 600; t++) stepSpontDrive(s, { ...X, paco2, t, neuro: n });
    return s.muscle as number;
  };
  it('the muscle effort is the neural effort times the diaphragm\'s force', () => {
    const full = muscle(44, 0);
    expect(full).toBeGreaterThan(0.5);
    expect(muscle(44, 0.5)).toBeCloseTo(full * 0.5, 2);
    expect(muscle(44, 1)).toBe(0); // no force: no effort, whatever the drive
  });
  it('below the apnoeic threshold there is no effort although the diaphragm is free (the drive decides, not the machine)', () => {
    expect(muscle(30, 0)).toBe(0);
  });
});
