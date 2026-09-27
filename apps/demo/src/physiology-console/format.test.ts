import { describe, expect, it } from 'vitest';
import { autoDigits, changeDir, fmtDelta, fmtValue } from './format.ts';
import { metaOf, siblingUnit } from './meta.ts';

describe('metadata', () => {
  it('curated paths carry label, unit, digits and scale', () => {
    expect(metaOf('ev.circ.svr')).toMatchObject({ label: 'SVR', unit: 'dyn·s/cm⁵', digits: 0, scale: 1333.22 });
    expect(metaOf('ev.circ.ef')).toMatchObject({ unit: '%', scale: 100 });
    expect(metaOf('ev.circ.co').rank).toBeLessThan(metaOf('ev.circ.svr').rank);
  });
  it.each([
    ['resp.pat.deadSpaceMl', 'mL'], ['blood.core.rateMlPerMin', 'mL/min'], ['hemo.lvad.flowLpm', 'L/min'], ['ev.beat.qtMs', 'ms'],
    ['resp.pat.weightKg', 'kg'], ['dev.pacer.ratePpm', '/min'], ['organs.renal.uopMlMin', 'mL/min'], ['hemo.circ.ref.lvedp', 'mmHg'],
    ['ev.lungState.complianceMlPerCmH2O', 'mL/cmH₂O'], ['hemo.circ.kLv', ''],
    // concentration and rate suffixes of 7c/7e/7g come before the bare …Ml / …Kg rules
    ['endo.core.out.cortisolNmolL', 'nmol/L'], ['endo.core.out.insulinUuMl', 'µU/mL'], ['endo.core.out.adrenalinePgMl', 'pg/mL'],
    ['blood.core.out.glucoseMgDl', 'mg/dL'], ['organs.kidney.uopMlKgH', 'mL/kg/h'], ['x.y.vasopressinNgMl', 'ng/mL'],
    ['blood.core.out.tempC', '°C'], ['mods.tempC', '°C'], ['x.bloodTempC', '°C'], ['pk.bus.agents.rocuronium.cumulativeMgPerKg', 'mg/kg'],
    // curated: thermal model, model EtCO2, ECG potassium, NIBP and QTc numerics
    ['resp.temp.tc', '°C'], ['resp.etco2', 'mmHg'], ['mods.k', 'mmol/L'], ['mon.nibpSys', 'mmHg'], ['mon.nibpMean', 'mmHg'], ['mon.qtc', 'ms'],
    ['organs.iap', 'mmHg'], // 7x.1
  ])('unit of %s is "%s" from the field name', (path, unit) => expect(metaOf(path).unit).toBe(unit));
  it('a sibling unit leaf names the unit of a number that has none in its name', () => {
    const tree = new Map<string, unknown>([
      ['pk.bus.agents.propofol.unit', 'µg/mL'], ['ev.drugs.drugs.propofol.rateUnit', 'mg/min'], ['ev.drugs.drugs.propofol.amountUnit', 'mg'],
    ]);
    const get = (p: string) => tree.get(p);
    expect(siblingUnit('pk.bus.agents.propofol.brain', get)).toBe('µg/mL');
    expect(siblingUnit('ev.drugs.drugs.propofol.rate', get)).toBe('mg/min');
    expect(siblingUnit('ev.drugs.drugs.propofol.totalAmount', get)).toBe('mg');
    expect(siblingUnit('pk.bus.agents.propofol.unit', get)).toBeUndefined();
    expect(siblingUnit('hemo.circ.kLv', get)).toBeUndefined();
  });
  it('an unknown path is labelled by its last segment and sorts after curated rows', () => {
    expect(metaOf('organs.brain.icp')).toMatchObject({ label: 'icp', unit: '', scale: 1, rank: Number.POSITIVE_INFINITY });
  });
});

describe('formatting', () => {
  it('digits by magnitude', () => {
    expect([autoDigits(0), autoDigits(0.0402), autoDigits(4.2), autoDigits(36.8), autoDigits(4900)]).toEqual([0, 3, 2, 1, 0]);
  });
  it('a value that starts at 0 (a drug Ce, a bus fraction) changes and prints at the precision of the larger value', () => {
    const ce = metaOf('pk.bus.agents.propofol.brain');
    expect(changeDir(0.8, 0, ce)).toBe('up');
    expect(fmtDelta(0.8, ce, 0)).toBe('+0.800');
    expect(changeDir(0, 0.8, ce)).toBe('down');
    expect(fmtDelta(-0.8, ce, 0.8)).toBe('−0.800');
    expect(changeDir(0, 0, ce)).toBeNull();
    expect(changeDir(0.0004, 0, ce)).toBeNull(); // below one displayed digit (0.001)
  });
  it('values: scaled numbers, booleans, strings, null', () => {
    const svr = metaOf('ev.circ.svr');
    expect(fmtValue(0.905, svr)).toBe('1207');
    expect(fmtValue(0.0402, metaOf('x.shunt'))).toBe('0.040');
    expect(fmtValue(true, metaOf('x.open'))).toBe('true');
    expect(fmtValue('NaN', metaOf('x.y'))).toBe('NaN');
    expect(fmtValue(null, metaOf('x.y'))).toBe('—');
    expect(fmtValue(undefined, metaOf('x.y'))).toBe('');
  });
  it('deltas: signed, Unicode minus, zero when it rounds to zero', () => {
    const svr = metaOf('ev.circ.svr');
    expect(fmtDelta(0.3, svr, 0.9)).toBe('+400');
    expect(fmtDelta(-0.3, svr, 0.9)).toBe('−400');
    expect(fmtDelta(0.0001, svr, 0.9)).toBe('0');
    expect(fmtDelta(null, svr, 0.9)).toBe('');
  });
  it('change direction ignores < 2 % jitter and sub-digit moves; strings and booleans flag any difference', () => {
    const m = metaOf('x.map');
    expect(changeDir(96, 95, m)).toBeNull(); // 1.1 %
    expect(changeDir(97.5, 95, m)).toBe('up'); // 2.6 %
    expect(changeDir(90, 95, m)).toBe('down');
    expect(changeDir(1.0, 1.009, metaOf('ev.circ.svr'))).toBeNull();
    expect(changeDir('vfCoarse', 'sinus', m)).toBe('diff');
    expect(changeDir(true, true, m)).toBeNull();
    expect(changeDir(1, undefined, m)).toBeNull();
    expect(changeDir('NaN', 3, m)).toBe('diff');
  });
  it.each([
    // [path, baseline, still quiet, changed, direction] — absolute tolerances where 2 % is the wrong size
    ['blood.core.ab.ph', 7.4, 7.39, 7.37, 'down'], // 0.02 (2 % would be 0.15)
    ['resp.temp.tc', 36.8, 36.95, 37.1, 'up'], // 0.2 °C (2 % would be 0.74)
    ['mods.tempC', 37, 36.9, 36.7, 'down'],
    ['mon.spo2', 97, 96.5, 96, 'down'], // one point on a % scale
    ['resp.o2.sa', 0.97, 0.965, 0.955, 'down'], // one point on a fraction (0.01)
    ['resp.co2.pf', 40, 41.5, 42.5, 'up'], // 2 mmHg (2 % would be 0.8)
    ['mon.etco2', 35, 36.5, 37.5, 'up'],
    ['mods.k', 4.2, 4.35, 4.45, 'up'], // 0.2 mmol/L (2 % would be 0.08)
    ['blood.core.out.k', 4.2, 4.05, 3.95, 'down'],
    ['blood.core.out.lactate', 1, 1.2, 1.4, 'up'], // 0.3 mmol/L (2 % would be 0.02)
    // 7x.1 (FU-3 item 12): BE and HCO3 1 mmol/L (2 % of a BE near 0 is nothing: every 0.001 flagged; of HCO3 24, 0.48)
    ['blood.core.ab.be', 0, 0.8, 1.2, 'up'],
    ['ev.labs.values.be', -2, -2.8, -3.2, 'down'],
    ['blood.core.ab.hco3', 24, 23.2, 22.8, 'down'],
    ['ev.labs.values.hco3', 24, 24.9, 25.1, 'up'],
  ] as const)('%s: absolute tolerance', (path, base, quiet, moved, dir) => {
    const m = metaOf(path);
    expect(changeDir(quiet, base, m)).toBeNull();
    expect(changeDir(moved, base, m)).toBe(dir);
  });
  it('2 % stays the default: a valve constant named k and a step index are not potassium', () => {
    expect(metaOf('hemo.circ.p.av.k').tol).toBeUndefined();
    expect(metaOf('blood.k').tol).toBeUndefined();
    expect(metaOf('ev.circ.svr').tol).toBeUndefined();
    expect(changeDir(1.03, 1, metaOf('hemo.circ.p.av.k'))).toBe('up');
  });
});
