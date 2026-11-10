// Schnider 1998 propofol PK: Table 2, p. 1176 (θ1–θ11, centred at age 53, weight 77 kg, LBM 59 kg, height 177 cm);
// James LBM as printed p. 1173. ke0 0.456 /min: Schnider 1999 (abstract p. 1502, text p. 1510). Read by two readers.
import { lbmJames, type PkPatient } from '../covariates.ts';
import { fromClearances, type PkParams } from '../compartment.ts';
import type { TciSet } from './types.ts';
import { READ_BY_T2, UNITS_MG } from './common.ts';

/** Schnider 1998/1999 propofol (Anesthesiology 88:1170; 90:1502); ke0 0.456 (TTPE 1.6 min). */
export function schniderPropofol(p: PkPatient): PkParams {
  const lbm = lbmJames(p);
  const v2 = 18.9 - 0.391 * (p.ageY - 53);
  const cl1 = 1.89 + 0.0456 * (p.weightKg - 77) - 0.0681 * (lbm - 59) + 0.0264 * (p.heightCm - 177);
  const cl2 = 1.29 - 0.024 * (p.ageY - 53);
  return fromClearances(4.27, v2, 238, cl1, cl2, 0.836, [0.456]);
}

export const SCHNIDER: TciSet = {
  params: schniderPropofol,
  meta: {
    id: 'schnider',
    drugId: 'propofol',
    name: 'Schnider (propofol)',
    paper: { authors: 'Schnider TW, Minto CF, Gambus PL, Andresen C, Goodale DB, Shafer SL, Youngs EJ', year: 1998, journal: 'Anesthesiology', vol: '88', pages: '1170–1182', doi: '10.1097/00000542-199805000-00006', pmid: '9605675' },
    table: 'Table 2, p. 1176 (θ1–θ11 and the model equations); LBM (James) p. 1173',
    population: { ageY: [26, 81], sex: ['m', 'f'], src: 'abstract p. 1170: 24 healthy volunteers aged 26–81 yr' },
    covariates: ['ageY', 'weightKg', 'heightCm', 'sex'],
    scalars: ['lbm:james'],
    reference: { ageY: 53, weightKg: 77, heightCm: 177, sex: 'm' },
    ke0: {
      value: 0.456,
      method: 'pkpd',
      src: { authors: 'Schnider TW, Minto CF, Shafer SL, Gambus PL, Andresen C, Goodale DB, Youngs EJ', year: 1999, journal: 'Anesthesiology', vol: '90', pages: '1502–1516', doi: '10.1097/00000542-199906000-00003', pmid: '10360845' },
      fittedWith: 'Schnider 1998 PK (this set): "With the pharmacokinetic model from our companion study and the ke0 value of 0.456 min-1" (p. 1510)',
      note: 'Schnider 1999 Table 4 (p. 1510) prints 0.459; its abstract and text print 0.456. The owner\'s ruling TQ1 (10 Nov 2026, "A for TQ1"): the ke0 stays 0.456 /min, as the abstract and the text state it for use with the companion PK, with Table 4\'s 0.459 recorded here beside it',
    },
    site: 'arterial',
    units: UNITS_MG,
    worked: { none: 'Schnider 1998 prints the coefficients (Table 2) but no values for a typical or reference individual; both readers checked the eleven coefficients and the four centring values line by line' },
    readBy: READ_BY_T2,
  },
};
