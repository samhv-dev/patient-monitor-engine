// Minto 1997 remifentanil: the complex PK model, Table 3 (p. 17), and the complex PD model's ke0, Table 5 (p. 19),
// centred at age 40 and LBM 55 kg; James LBM as printed p. 12. Read by two readers.
import { lbmJames, type PkPatient } from '../covariates.ts';
import { fromClearances, type PkParams } from '../compartment.ts';
import type { TciSet } from './types.ts';
import { READ_BY_T2, UNITS_MCG } from './common.ts';

/** Minto 1997 remifentanil (Anesthesiology 86:10), LBM (James) and age covariates; ke0 0.595 − 0.007(age − 40). */
export function mintoRemifentanil(p: PkPatient): PkParams {
  const lbm = lbmJames(p);
  const a = p.ageY - 40;
  const l = lbm - 55;
  return fromClearances(
    5.1 - 0.0201 * a + 0.072 * l,
    9.82 - 0.0811 * a + 0.108 * l,
    5.42,
    2.6 - 0.0162 * a + 0.0191 * l,
    2.05 - 0.0301 * a,
    0.076 - 0.00113 * a,
    [0.595 - 0.007 * a],
  );
}

/** A 20-yr-old with LBM 55 kg (male, 70 kg, 168.8 cm: James LBM 54.99), as Minto II's Tables 1–2 assume. */
const WORKED: PkPatient = { ageY: 20, weightKg: 70, heightCm: 168.8, sex: 'm' };

export const MINTO: TciSet = {
  params: mintoRemifentanil,
  meta: {
    id: 'minto',
    drugId: 'remifentanil',
    name: 'Minto (remifentanil)',
    paper: { authors: 'Minto CF, Schnider TW, Egan TD, Youngs E, Lemmens HJM, Gambus PL, Billard V, Hoke JF, Moore KHP, Hermann DJ, Muir KT, Mandema JW, Shafer SL', year: 1997, journal: 'Anesthesiology', vol: '86', pages: '10–23', doi: '10.1097/00000542-199701000-00004', pmid: '9009935' },
    table: 'Table 3, p. 17 (complex PK model); Table 5, p. 19 (complex PD model, ke0); LBM (James) p. 12',
    population: { ageY: [20, 85], sex: ['m', 'f'], src: 'abstract p. 10: 65 healthy adults (38 men, 27 women) aged 20–85 yr' },
    covariates: ['ageY', 'weightKg', 'heightCm', 'sex'],
    scalars: ['lbm:james'],
    reference: { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' },
    ke0: { expr: '0.595 − 0.007·(Age − 40)', method: 'pkpd', src: 'pk-paper' },
    site: 'arterial',
    units: UNITS_MCG,
    worked: {
      patient: WORKED,
      values: { v1: '5.5', cl1: '2.9' },
      src: 'Minto 1997 II (Anesthesiology 86:24, doi 10.1097/00000542-199701000-00005), Table 1 p. 28 (V1) and Table 2 p. 28 (Cl1), age 20, LBM 55 kg. Its t½ke0 0.94/1.32/2.20 min and tpeak 1.22/1.57/2.26 min at 20/50/80 yr are reproduced too (test); its V1 5.1 L at 50 yr is not: Table 3 of paper I gives 4.9',
    },
    readBy: READ_BY_T2,
  },
};
