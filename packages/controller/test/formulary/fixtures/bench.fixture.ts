// TEST DATA ONLY, never shipped (the package publishes dist/ only) and never read by the bench: a formulary layer of
// invented drugs (`benchpowder`, `benchsolution`, `benchampoule`), invented products and invented sources (`fixture-*`),
// built to reach every branch of prepare, findings and remaining (plan learner-action-remote.md L2). Every number in
// it is a test fixture [ENG: test] and says nothing about any real drug, diluent or source. It keeps §5's rules
// (checked by the test through loadFormulary), so the core is exercised on a layer the source check would admit.
import type { FormularyFiles } from '../../../src/formulary/types.ts';

const cc = { trissel: 'agrees', src: 'fixture-trissel' } as const;
const none = { trissel: 'not listed' } as const;

/** The fixture layer's drug ids: the coverage target handed to loadFormulary instead of the library's 61. */
export const BENCH_IDS = ['benchpowder', 'benchsolution', 'benchampoule', 'benchsalt'];

export function benchFiles(): FormularyFiles {
  return {
    'sources.json': {
      'fixture-stabilis': { kind: 'stabilis', id: 'FIXTURE-1', retrieved: '2026-11-10', cites: 'Fixture B, et al. Invented 2001' },
      'fixture-trissel': { kind: 'trissel', edition: '17 (2013)', monograph: 'Benchpowder', page: 2, reader: 'fixture reader', date: '2026-11-10' },
      'fixture-label': { kind: 'monograph', product: 'Benchpowder 20 mg vial', holder: 'Fixture Holder', version: '2026-02', issuer: 'EMC' },
      'fixture-study': { kind: 'study', citation: 'Fixture C. Invented preparation times. 2002', pmid: '0' },
    },
    'pending.json': [],
    // A powder: 20 mg a vial, reconstituted with 10 mL of water (2 mg/mL), 120 s to prepare.
    'benchpowder.json': {
      drugId: 'benchpowder',
      products: [{
        id: 'fixture-powder-vial', form: 'powder',
        strength: { amount: 20, unit: 'mg', perVial: true, src: 'fixture-label' },
        // The label states no volume after reconstitution (N73): the concentration counts the 10 mL added only.
        reconstitute: { diluents: ['water'], volumeMl: 10, final: { stated: false, src: 'fixture-label' }, src: 'fixture-label' },
        prepTime: { s: 120, src: 'fixture-study' },
      }, {
        // The powder adds volume (N73): 10 mL added, the label states 12.5 mL after reconstitution (1.6 mg/mL).
        id: 'fixture-powder-final', form: 'powder',
        strength: { amount: 20, unit: 'mg', perVial: true, src: 'fixture-label' },
        reconstitute: { diluents: ['water'], volumeMl: 10, final: { volumeMl: 12.5, src: 'fixture-label' }, src: 'fixture-label' },
      }, {
        // The same, stated as the concentration after reconstitution.
        id: 'fixture-powder-conc', form: 'powder',
        strength: { amount: 20, unit: 'mg', perVial: true, src: 'fixture-label' },
        reconstitute: { diluents: ['water'], volumeMl: 10, final: { perMl: 1.6, src: 'fixture-label' }, src: 'fixture-label' },
      }],
      diluents: [
        // Listed for the drug, but not for reconstituting its powder (the product's own list says water only).
        { id: 'water', listed: true, src: 'fixture-label' },
        { id: 'dextrose', listed: true, src: 'fixture-label' },
        { id: 'saline', listed: false, src: 'fixture-label',
          compat: { verdict: 'incompatible', statement: 'Fixture: a haze forms.', src: 'fixture-stabilis', crossCheck: cc } },
      ],
      admixtures: [
        { with: 'benchsolution', verdict: 'incompatible', statement: 'Fixture: precipitates with benchsolution.', src: 'fixture-stabilis', crossCheck: cc },
      ],
      stability: [
        // Measured points, given out of order and with the reference instant: the core sorts them and anchors 1 at age 0.
        { diluent: 'water', container: 'vial', tempC: 25, points: [[6, 0.9], [0, 1], [2, 0.96]], statement: 'Fixture: 90 % at 6 h.', src: 'fixture-stabilis', crossCheck: cc },
        { diluent: 'water', container: 'syringe-pp', tempC: 25, points: [[4, 0.5]], statement: 'Fixture: 50 % at 4 h.', src: 'fixture-stabilis', crossCheck: cc },
        // A "stable" statement: at least 90 % for 24 h (LQ9).
        { kind: 'stable', diluent: 'dextrose', container: 'syringe-pp', tempC: 25, points: [[24, 0.9]], statement: 'Fixture: at least 90 % for 24 h.', src: 'fixture-stabilis', crossCheck: cc },
        // Figures for the incompatible diluent: a measured loss wins over LQ8.
        { diluent: 'saline', container: 'bag-pvc', tempC: 25, points: [[1, 0.7]], statement: 'Fixture: 70 % at 1 h.', src: 'fixture-stabilis', crossCheck: cc },
      ],
      has: { stabilis: true, trissel: true, monograph: true },
    },
    // A solution given per mL: 5 mg/mL; no source for its preparation time (LQ7).
    'benchsolution.json': {
      drugId: 'benchsolution',
      products: [
        { id: 'fixture-solution', form: 'solution', strength: { amount: 5, unit: 'mg', perVial: false, src: 'fixture-label' }, prepTime: { gap: 'LQ7' },
          inUse: [{ h: 24, tempC: 25, condition: 'Fixture: once diluted, at room temperature.', src: 'fixture-label' }] },
        // The same drug in micrograms per mL: may not be mixed with the mg product in one preparation.
        { id: 'fixture-solution-mcg', form: 'solution', strength: { amount: 500, unit: 'mcg', perVial: false, src: 'fixture-label' } },
      ],
      diluents: [
        { id: 'saline', listed: true, src: 'fixture-label' },
        { id: 'dextrose', listed: false, src: 'fixture-label',
          compat: { verdict: 'conditional', statement: 'Fixture: clear for 1 h only.', src: 'fixture-stabilis', crossCheck: cc } },
        { id: 'water', listed: false, src: 'fixture-label',
          compat: { verdict: 'not tested', statement: 'Fixture: no study found.', src: 'fixture-stabilis', crossCheck: none } },
        // Listed, and lost to a PVC bag only (N60): the statement names its container and says nothing of the others.
        { id: 'balanced', listed: true, src: 'fixture-label',
          compat: { verdict: 'incompatible', containers: ['bag-pvc'], statement: 'Fixture: adsorbs to a PVC bag.', src: 'fixture-stabilis', crossCheck: cc } },
      ],
      admixtures: [
        { with: 'benchpowder', verdict: 'conditional', statement: 'Fixture: clear when diluted first.', src: 'fixture-stabilis', crossCheck: cc },
      ],
      // Rows that share diluent, container and temperature and differ only in the concentration they were measured at
      // (brief 127): the bench picks the row by the preparation's concentration, never one row for another.
      stability: [
        { diluent: 'saline', container: 'syringe-pp', tempC: 25, concentration: { amount: 1, unit: 'mg/mL', src: 'fixture-stabilis' }, points: [[4, 0.8]], statement: 'Fixture: 1 mg/mL, 80 % at 4 h.', src: 'fixture-stabilis', crossCheck: cc },
        { kind: 'stable', diluent: 'saline', container: 'syringe-pp', tempC: 25, concentration: { amount: 2, max: 3, unit: 'mg/mL', src: 'fixture-stabilis' }, points: [[24, 0.95]], statement: 'Fixture: 2-3 mg/mL, stable 24 h.', src: 'fixture-stabilis', crossCheck: cc },
        { diluent: 'saline', container: 'syringe-pp', tempC: 25, concentration: { amount: 500, unit: 'mcg/mL', src: 'fixture-stabilis' }, points: [[2, 0.6]], statement: 'Fixture: 500 µg/mL, 60 % at 2 h.', src: 'fixture-stabilis', crossCheck: cc },
        { diluent: 'saline', container: 'syringe-pp', tempC: 25, concentration: { amount: 4000, unit: 'mg/L', src: 'fixture-stabilis' }, points: [[1, 0.7]], statement: 'Fixture: 4 g/L, 70 % at 1 h.', src: 'fixture-stabilis', crossCheck: cc },
        // A row whose source states no concentration: it answers for any concentration no stated row covers.
        { diluent: 'saline', container: 'bag-pvc', tempC: 25, points: [[6, 0.5]], statement: 'Fixture: concentration not stated, 50 % at 6 h.', src: 'fixture-stabilis', crossCheck: cc },
        { diluent: 'saline', container: 'bag-pvc', tempC: 25, concentration: { amount: 5, unit: 'mg/mL', src: 'fixture-stabilis' }, points: [[6, 0.9]], statement: 'Fixture: 5 mg/mL, 90 % at 6 h.', src: 'fixture-stabilis', crossCheck: cc },
      ],
      has: { stabilis: true, trissel: true, monograph: true },
    },
    // An ampoule whose label gives the whole content but not the volume: it cannot be drawn by mL nor by the ampoule.
    'benchampoule.json': {
      drugId: 'benchampoule',
      products: [{ id: 'fixture-ampoule', form: 'solution', strength: { amount: 1, unit: 'mg', perVial: true, src: 'fixture-label' } }],
      diluents: [{ id: 'saline', listed: false, src: 'fixture-label' }],
      admixtures: [
        { with: 'benchpowder', verdict: 'compatible', statement: 'Fixture: clear for 24 h.', src: 'fixture-stabilis', crossCheck: cc },
        // An admixture statement for one container (N60): a syringe only.
        { with: 'benchsolution', verdict: 'incompatible', containers: ['syringe-pp'], statement: 'Fixture: clouds in a syringe.', src: 'fixture-stabilis', crossCheck: cc },
      ],
      stability: [],
      has: { stabilis: true, trissel: true, monograph: true },
    },
    // A salt whose strength is in mmol and whose stability rows are in mg/mL (N61): its molar mass, sourced, joins them.
    'benchsalt.json': {
      drugId: 'benchsalt',
      molarMass: { mgPerMmol: 50, src: 'fixture-label' },
      products: [{ id: 'fixture-salt', form: 'solution', strength: { amount: 1, unit: 'mmol', perVial: false, src: 'fixture-label' } }],
      diluents: [{ id: 'saline', listed: true, src: 'fixture-label' }],
      admixtures: [],
      stability: [
        { kind: 'stable', diluent: 'saline', container: 'syringe-pp', tempC: 25, concentration: { amount: 5, unit: 'mg/mL', src: 'fixture-stabilis' }, points: [[24, 0.95]], statement: 'Fixture: 5 mg/mL, stable 24 h.', src: 'fixture-stabilis', crossCheck: cc },
        { kind: 'stable', diluent: 'saline', container: 'syringe-pp', tempC: 25, concentration: { amount: 2, unit: 'mEq/mL', src: 'fixture-stabilis' }, points: [[48, 0.95]], statement: 'Fixture: 2 mEq/mL, stable 48 h.', src: 'fixture-stabilis', crossCheck: cc },
      ],
      has: { stabilis: true, trissel: true, monograph: true },
    },
    'diluents/water.json': { diluentId: 'water', name: 'Fixture water', has: { stabilis: false, trissel: false, monograph: false } },
    'diluents/saline.json': { diluentId: 'saline', name: 'Fixture saline', has: { stabilis: false, trissel: false, monograph: false } },
    'diluents/dextrose.json': { diluentId: 'dextrose', name: 'Fixture dextrose', has: { stabilis: false, trissel: false, monograph: false } },
    'diluents/balanced.json': { diluentId: 'balanced', name: 'Fixture balanced', has: { stabilis: false, trissel: false, monograph: false } },
    'diluents/ringer.json': { diluentId: 'ringer', name: 'Fixture Ringer', has: { stabilis: false, trissel: false, monograph: false } },
  };
}
