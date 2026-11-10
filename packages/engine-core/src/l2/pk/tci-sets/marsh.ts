// Marsh 1991 propofol: the adult model the first-generation pumps (Diprifusor) ran, Table I p. 42: V1 228 ml/kg (the
// authors' pilot studies) and microconstants the table attributes to Gepts 1987. Two sets: `marsh` with the devices'
// ke0 0.26 /min (kind `device`: derivation never published, Absalom 2009 p. 30; the owner's ruling TQ2) and
// `marsh-modified` (its own module) with Struys 2000's 1.21 /min. Read by two readers.
import type { PkPatient } from '../covariates.ts';
import type { PkParams } from '../compartment.ts';
import type { TciPaper, TciSet, TciSetMeta } from './types.ts';
import { READ_BY_T2, UNITS_MG } from './common.ts';

/**
 * Marsh 1991 propofol (Br J Anaesth 67:41), Table I p. 42: weight-proportional V1 228 ml/kg, microconstants as printed
 * there (attributed to Gepts 1987, whose mean k12 is 0.1140: the papers' own inconsistency, recorded in the guide).
 * ke0 0.26 (the Diprifusor's; derivation unpublished, Absalom 2009 p. 30) or 1.21 (modified: Struys 2000 p. 404).
 */
export function marshPropofol(p: PkPatient, modified = false): PkParams {
  return { v1: 0.228 * p.weightKg, k10: 0.119, k12: 0.112, k21: 0.055, k13: 0.0419, k31: 0.0033, ke0: [modified ? 1.21 : 0.26] };
}

const MARSH_PAPER: TciPaper = { authors: 'Marsh B, White M, Morton N, Kenny GNC', year: 1991, journal: 'Br J Anaesth', vol: '67', pages: '41–48', doi: '10.1093/bja/67.1.41', pmid: '1859758' };
const ABSALOM_2009: TciPaper = { authors: 'Absalom AR, Mani V, De Smet T, Struys MMRF', year: 2009, journal: 'Br J Anaesth', vol: '103', pages: '26–37', doi: '10.1093/bja/aep143', pmid: '19520702' };
export const STRUYS_2000: TciPaper = { authors: 'Struys MMRF, De Smet T, Depoorter B, Versichelen LFM, Mortier EP, Dumortier FJE, Shafer SL, Rolly G', year: 2000, journal: 'Anesthesiology', vol: '92', pages: '399–406', doi: '10.1097/00000542-200002000-00021', pmid: '10691226' };
const REF: PkPatient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };

/** What `marsh` and `marsh-modified` share: the PK, its paper and the readers. */
export const MARSH_BASE: Omit<TciSetMeta, 'id' | 'name' | 'ke0'> = {
  drugId: 'propofol',
  paper: MARSH_PAPER,
  table: 'Table I, p. 42 ("Adult pharmacokinetic variables for propofol [9]"): Vc 228 ml/kg (from the authors\' pilot studies); k10 0.119, k12 0.112, k13 0.0419, k21 0.055, k31 0.0033 /min, attributed to ref. 9, Gepts 1987 (Anesth Analg 66:1256, doi 10.1213/00000539-198712000-00010), Table 3 p. 1261, "Mean (n = 17)" column, whose k12 is 0.1140',
  population: { src: 'The adult model was not estimated in Marsh 1991\'s subjects (children): its microconstants are Gepts 1987\'s adults (Table 3, n = 17), its V1 the authors\' pilot studies; Absalom 2009 p. 30 notes the Gepts study appears to include few elderly or obese patients. Only weight is a covariate ("adjustments ... solely on the basis of body weight", Marsh p. 42)' },
  covariates: ['weightKg'],
  reference: REF,
  site: 'unstated',
  units: UNITS_MG,
  worked: {
    patient: REF,
    values: { k10: '0.119', k12: '0.112', k13: '0.0419', k21: '0.055', k31: '0.0033' },
    src: 'Table I, p. 42 (the microconstants are the set\'s own printed values; V1 is per kg)',
  },
  readBy: READ_BY_T2,
};

export const MARSH: TciSet = {
  params: (p) => marshPropofol(p),
  meta: {
    ...MARSH_BASE,
    id: 'marsh',
    name: 'Marsh (propofol; ke0 as the Diprifusor ran it)',
    ke0: {
      value: 0.26,
      method: 'device',
      src: ABSALOM_2009,
      page: 'p. 30 (and Table 1, p. 30)',
      device: 'Diprifusor (first-generation propofol TCI pumps)',
      usedWith: 'Marsh 1991 Table I PK (this set)',
      derivation: 'unpublished',
      derivationNote: 'Absalom 2009 reports that 0.26 /min came to be used with the Marsh model in the first-generation pumps and that the data behind it never appeared in the peer-reviewed literature; it compares it only with Billard 1997\'s 0.2 /min. Its Table 1 prints a time to peak of 4.5 min beside 0.26, which this PK does not give (0.26 peaks at 3.92 min; 4.5 min is ke0 0.20\'s, Struys 2000 p. 400)',
      label: 'device value; derivation unpublished',
    },
  },
};
