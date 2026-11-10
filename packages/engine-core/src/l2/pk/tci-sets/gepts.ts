// Gepts 1995 sufentanil: Table 3, p. 1201, two-stage column, the ESTIMATED volumes and clearances (V1 14.3, V2 63.1,
// V3 261.6 L; Cl1 0.92, Cl2 1.55, Cl3 0.33 L/min). The same table's derived micro rate constants are rounded (k31
// 0.0013 to two figures); built from them, as the engine was until T2, V3 came out 251.9 L and Vss 330 L against the
// printed 261.6 and 339. ke0 fitted to the 5.6 min time to peak effect of Shafer & Varvel 1991 (p. 55) with this PK.
import { fromClearances, type PkParams } from '../compartment.ts';
import type { TciSet } from './types.ts';
import { READ_BY_T2, UNITS_MCG } from './common.ts';

/** Sufentanil ke0 = ke0ForTtpe(Gepts PK, 5.6 min, Shafer & Varvel 1991): 0.1757 → 0.176 with Table 3's estimated
 * parameters, as it was (0.1755) with the rounded micro rate constants. */
export const SUFENTANIL_KE0 = 0.176;

/** Gepts 1995 sufentanil (Anesthesiology 83:1194), Table 3 p. 1201 estimated parameters; no covariates. */
export function geptsSufentanil(): PkParams {
  return fromClearances(14.3, 63.1, 261.6, 0.92, 1.55, 0.33, [SUFENTANIL_KE0]);
}

export const GEPTS: TciSet = {
  params: () => geptsSufentanil(),
  meta: {
    id: 'gepts',
    drugId: 'sufentanil',
    name: 'Gepts (sufentanil)',
    paper: { authors: 'Gepts E, Shafer SL, Camu F, Stanski DR, Woestenborghs R, Van Peer A, Heykants JJP', year: 1995, journal: 'Anesthesiology', vol: '83', pages: '1194–1204', doi: '10.1097/00000542-199512000-00010', pmid: '8533912' },
    table: 'Table 3, p. 1201, two-stage (n = 18) column, estimated parameters: V1 14.3, V2 63.1, V3 261.6 L; Cl1 0.92, Cl2 1.55, Cl3 0.33 L/min',
    population: { ageY: [14, 68], src: 'abstract p. 1194: 23 patients aged 14–68 yr; no relation of any parameter to age, weight or LBM' },
    covariates: [],
    reference: { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' },
    ke0: {
      value: SUFENTANIL_KE0,
      method: 'ttpe',
      src: { authors: 'Shafer SL, Varvel JR', year: 1991, journal: 'Anesthesiology', vol: '74', pages: '53–63', doi: '10.1097/00000542-199101000-00010', pmid: '1824743' },
      fittedWith: 'this set (the 5.6 min time to peak, p. 55, was computed with Hudson 1989 PK and ke0 0.227; the time is carried over, the ke0 refitted to this PK)',
      ttpeMin: 5.6,
    },
    site: 'arterial',
    units: UNITS_MCG,
    worked: {
      patient: { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' },
      values: { v1: '14.3', v2: '63.1', v3: '261.6', cl1: '0.92', cl2: '1.55', cl3: '0.33', k31: '0.0013' },
      src: 'Table 3, p. 1201, two-stage column. Of the derived rows, Vss 339 L, t½α 3.3 min and k31 0.0013 /min are reproduced; t½β is 66.4 min against 67, t½γ 763 against 769, and k10, k12, k13, k21 differ in the last printed digit (0.0643, 0.1084, 0.0231, 0.0246 against 0.0645, 0.1086, 0.0229, 0.0245): the derived rows were computed from the unrounded estimates',
    },
    readBy: READ_BY_T2,
  },
};
