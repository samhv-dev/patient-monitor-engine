// Eleveld 2018 propofol, ARTERIAL PK and ke0: the paper's Table 2 (θ1–θ18, p. 950) and its PK equations (p. 948), the
// ke0 equation (p. 948) and Table 3 θ2 (p. 952). Read against the paper by two readers (docs/guides/tci-sets.md).
import { ffmAlSallami, type PkPatient } from '../covariates.ts';
import { fromClearances, type PkParams } from '../compartment.ts';
import type { TciSet, TciSetOpts } from './types.ts';
import { READ_BY_T2, UNITS_MG } from './common.ts';

const sig = (x: number, e50: number, g: number) => x ** g / (x ** g + e50 ** g);

/**
 * Eleveld 2018 propofol (Br J Anaesth 120:942–959), ARTERIAL PK, Table 2 θ1–θ18, reference 35 y, 70 kg, 170 cm,
 * male, no opioids. ke0 (arterial) 0.146·(W/70)^−0.25 (the same paper's PD part). PMA, when not typed, is age + 40
 * weeks (the paper's own rule, p. 948); 52.143 weeks per year [ENG: conversion].
 */
export function eleveldPropofol(p: PkPatient, o: TciSetOpts = {}): PkParams {
  const ref: PkPatient = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' };
  const pma = p.pmaWeeks ?? p.ageY * 52.143 + 40;
  const pmaRef = 35 * 52.143 + 40;
  const fCentral = (w: number) => sig(w, 33.6, 1);
  const fAging = (x: number) => Math.exp(x * (p.ageY - 35));
  const fOpi = (x: number) => (o.opioids ? Math.exp(x * p.ageY) : 1);
  const fClMat = sig(pma, 42.3, 9.06) / sig(pmaRef, 42.3, 9.06);
  const fQ3Mat = (a: number) => sig(a * 52.143 + 40, 68.3, 1);
  const v1 = 6.28 * (fCentral(p.weightKg) / fCentral(70));
  const v2 = 25.5 * (p.weightKg / 70) * fAging(-0.0156);
  const v3 = 273 * (ffmAlSallami(p) / ffmAlSallami(ref)) * fOpi(-0.0138);
  const cl = (p.sex === 'm' ? 1.79 : 2.1) * (p.weightKg / 70) ** 0.75 * fClMat * fOpi(-0.00286);
  const q2 = 1.75 * (v2 / 25.5) ** 0.75 * (1 + 1.3 * (1 - fQ3Mat(p.ageY)));
  const q3 = 1.11 * (v3 / 273) ** 0.75 * (fQ3Mat(p.ageY) / fQ3Mat(35));
  return fromClearances(v1, v2, v3, cl, q2, q3, [0.146 * (p.weightKg / 70) ** -0.25]);
}

const REF: PkPatient = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' };

export const ELEVELD: TciSet = {
  params: eleveldPropofol,
  meta: {
    id: 'eleveld',
    drugId: 'propofol',
    name: 'Eleveld (propofol, arterial)',
    paper: { authors: 'Eleveld DJ, Colin P, Absalom AR, Struys MMRF', year: 2018, journal: 'Br J Anaesth', vol: '120', pages: '942–959', doi: '10.1016/j.bja.2018.01.018', pmid: '29661412' },
    table: 'Table 2 (θ1–θ18), p. 950; PK equations p. 948 (Q2 carries 1 + θ16·(1 − f_Q3maturation), not normalised to the reference); FFM (Al-Sallami) p. 946; ke0 equation p. 948 with Table 3 θ2, p. 952',
    population: { ageY: [0, 88], weightKg: [0.68, 160], sex: ['m', 'f'], src: 'abstract p. 942: 27 weeks PMA to 88 yr, 0.68–160 kg, 672 males and 361 females (the 27-week lower bound is preterm, below age 0)' },
    covariates: ['ageY', 'weightKg', 'heightCm', 'sex', 'pmaWeeks', 'opioids'],
    scalars: ['ffm:alsallami', 'bmi'],
    reference: REF,
    ke0: { expr: '0.146·(WGT/70)^−0.25 (arterial PK)', method: 'pkpd', src: 'pk-paper' },
    site: 'arterial',
    units: UNITS_MG,
    worked: {
      patient: REF,
      values: { v1: '6.28', v2: '25.5', v3: '273', cl1: '1.79', cl2: '1.83', cl3: '1.11', ke0: '0.146' },
      src: 'abstract p. 942, with Q2 1.83 L/min from the corrigendum, Br J Anaesth 2018;121:519 (doi 10.1016/j.bja.2018.05.045), which replaced the abstract\'s 1.75',
    },
    readBy: READ_BY_T2,
  },
};
