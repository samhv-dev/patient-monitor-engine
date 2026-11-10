// Shafer 1990 fentanyl: Table 2, p. 1098, "Current Study" column (volumes, clearances, half-lives, micro rate
// constants). ke0 fitted to the 3.6 min time to peak effect of Shafer & Varvel 1991 (p. 55) with this PK. Read by two
// readers.
import type { PkParams } from '../compartment.ts';
import type { TciSet } from './types.ts';
import { READ_BY_T2, UNITS_MCG } from './common.ts';

/** Fentanyl ke0 = ke0ForTtpe(Shafer PK, 3.6 min) — decision 2 / D2 (tables 0.147 was fitted with another PK). */
export const FENTANYL_KE0 = 0.117;

/** Shafer 1990 fentanyl (Anesthesiology 73:1091), Table 2 p. 1098 micro rate constants; no covariates. */
export function shaferFentanyl(): PkParams {
  return { v1: 6.09, k10: 0.0827, k12: 0.471, k21: 0.102, k13: 0.225, k31: 0.006, ke0: [FENTANYL_KE0] };
}

export const SHAFER: TciSet = {
  params: () => shaferFentanyl(),
  meta: {
    id: 'shafer',
    drugId: 'fentanyl',
    name: 'Shafer (fentanyl)',
    paper: { authors: 'Shafer SL, Varvel JR, Aziz N, Scott JC', year: 1990, journal: 'Anesthesiology', vol: '73', pages: '1091–1102', doi: '10.1097/00000542-199012000-00005', pmid: '2248388' },
    table: 'Table 2, p. 1098, "Current Study" column: micro rate constants k10 0.0827, k12 0.471, k13 0.225, k21 0.102, k31 0.00600 /min; central volume 6.09 L (unscaled to weight)',
    population: { src: 'abstract p. 1091: 21 surgical patients; the set is unscaled (no covariates, Table 2 footnote)' },
    covariates: [],
    reference: { ageY: 50, weightKg: 70, heightCm: 170, sex: 'm' },
    ke0: {
      value: FENTANYL_KE0,
      method: 'ttpe',
      src: { authors: 'Shafer SL, Varvel JR', year: 1991, journal: 'Anesthesiology', vol: '74', pages: '53–63', doi: '10.1097/00000542-199101000-00010', pmid: '1824743' },
      fittedWith: 'this set (the 3.6 min time to peak, p. 55, was computed with Scott & Stanski 1987 PK and ke0 0.147; the time is carried over, the ke0 refitted to this PK)',
      ttpeMin: 3.6,
    },
    site: 'arterial',
    units: UNITS_MCG,
    worked: {
      patient: { ageY: 50, weightKg: 70, heightCm: 170, sex: 'm' },
      values: { v1: '6.09', v2: '28.1', v3: '228', cl1: '0.504', cl2: '2.87', cl3: '1.37', k10: '0.0827', k12: '0.471', k13: '0.225', k21: '0.102', k31: '0.00600' },
      src: 'Table 2, p. 1098, "Current Study" column (its half-lives 0.82 and 17.2 min are reproduced too; the terminal comes out 465.7 min against the printed 465, from the rounded micro rate constants)',
    },
    readBy: READ_BY_T2,
  },
};
