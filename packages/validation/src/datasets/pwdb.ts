// PWDB (PDDL 1.0) virtual-subject indices: per-site, per-age distributions of the timing metrics we also measure.
// Columns (pwdb_pw_indices.csv, header cells carry a leading space): "<Site>_PTT" (s, foot of the site's pressure
// wave after the aortic-root foot), "<Site>_SBP_T" (s, systolic peak after the site's foot), "<Site>_PPGdic_T"
// (s, dicrotic notch of the site's PPG after its foot), "Age".
import { readCsv } from './csv.ts';

export const PWDB_RECORD = '2633175';
export const PWDB_FILES = {
  indices: { file: 'pwdb_pw_indices.csv', md5: 'e713ed5a817ad821d3a2a5fc91e12c85' },
  onsets: { file: 'pwdb_onset_times.csv', md5: '1103ddc3852d6f2164b981582fad8d23' },
  haemod: { file: 'pwdb_haemod_params.csv', md5: 'd0f525c8659383daeb7b9f7206bab142' },
} as const;

export type PwdbSite = 'Radial' | 'Femoral' | 'Brachial' | 'Digital';
export interface PwdbStat { site: PwdbSite; ageY: number; n: number; pttMs: [number, number, number]; sysAfterFootMs: [number, number, number] }

const q = (v: number[], p: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))] as number;

/** [p10, p50, p90] per site and age band (25…75 y in 10-year steps) in ms. */
export function pwdbStats(indicesCsv: string, sites: PwdbSite[] = ['Radial', 'Femoral']): PwdbStat[] {
  const rows = readCsv(indicesCsv);
  const out: PwdbStat[] = [];
  const ages = [...new Set(rows.map((r) => Number(r.Age)))].filter(Number.isFinite).sort((a, b) => a - b);
  for (const site of sites) {
    for (const age of ages) {
      const sel = rows.filter((r) => Number(r.Age) === age);
      // non-positive times mark subjects whose onset detection failed in PWDB; they are dropped [ENG]
      const col = (k: string) => sel.map((r) => 1000 * Number(r[k])).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      const ptt = col(`${site}_PTT`);
      const sys = col(`${site}_SBP_T`);
      if (!ptt.length) continue;
      out.push({ site, ageY: age, n: sel.length, pttMs: [q(ptt, 0.1), q(ptt, 0.5), q(ptt, 0.9)], sysAfterFootMs: [q(sys, 0.1), q(sys, 0.5), q(sys, 0.9)] });
    }
  }
  return out;
}
