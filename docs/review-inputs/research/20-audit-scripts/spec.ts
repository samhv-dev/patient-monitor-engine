// Coverage run DV (devices, pacing, defibrillation, CPR; research/12 §5.8): the cell type, the shared rigs and the
// measure helpers, copied from run CM/BF and adapted. A cell names its arms, a `measure` over the arms' results and
// `expect` items the grader turns into a verdict. Bands are PROPOSALS for Ali with their source (research/12 §2.2) and
// are never widened to fit (R45). Stochastic cells (shock outcomes) run many seeds and report proportions (§6).
import { A, VENTED, mean, maxOf, minOf, r1, r2, type Arm, type ArmResult, type FineRow, type Row, type Step } from './runner.ts';

export type Verdict = 'PL' | 'TW' | 'TS' | 'WR' | 'MI' | 'IN' | 'NE' | 'NM';
export interface Expect {
  m: string; lo?: number; hi?: number; dir?: 1 | -1; tol?: number; quiet?: boolean; event?: boolean; invert?: boolean; src: string;
}
export interface Cell {
  id: string; tier: 'P1' | 'P2' | 'P3'; ctx: string; state: string; intv: string; sys: string;
  arms: Record<string, Arm>;
  measure?: (R: Record<string, ArmResult>) => Record<string, number | boolean | string>;
  expect: Expect[];
  owner: string;
  fu4?: boolean;
  known?: string; // another stage already owns the fix: reported as "<known> pending"
  hand?: { verdict: Verdict; why: string };
  ne?: string; // not expressible: the reason (probe arms, when given, still run; the verdict stays NE)
  dirOnly?: boolean;
}
export const CELLS: Cell[] = [];
export const add = (c: Cell): void => { CELLS.push(c); };

// ---- contexts -------------------------------------------------------------------------------------------------------
export const XA: Record<string, unknown> = {};
export const HF = { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] };
export const HFMI = { ageY: 65, weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] };

// ---- rigs -----------------------------------------------------------------------------------------------------------
export const V = (steps: Step[], tEnd: number, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
export const TVF = 60; // instructor VF onset in the plain arrest rigs
export const VF: Step = [TVF, A.rhythm('vfCoarse'), 'VF (instructor)'];
export const cpr = (t: number, q = 0.8, rate?: number): Step => [t, A.cpr(true, q, rate), `CPR q ${q}`];
export const cprOff = (t: number): Step => [t, A.cpr(false), 'CPR off'];
export const epi = (t: number): Step => [t, A.drug('epinephrine', 1000, 'mcg'), 'adrenaline 1 mg'];
/** Charge at t − 9 (the 7 s charge fits), shock at t. `sync` turns SYNC on first. `pre` pre-selects the outcome. */
export const shock = (t: number, J: number, o: { sync?: boolean; pre?: string } = {}): Step[] => [
  ...(o.sync ? [[t - 10, A.defib('syncOn'), 'SYNC on'] as Step] : []),
  ...(o.pre ? [[t - 9.5, A.defib('preselect', { outcome: o.pre }), `preselect ${o.pre}`] as Step] : []),
  [t - 9, A.defib('charge', { energyJ: J }), `charge ${J} J`], [t, A.defib('shock'), `shock ${J} J${o.sync ? ' (sync)' : ''}`]];
export const seeds = (n: number, f: (seed: number) => Arm, from = 1): Record<string, Arm> => Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${from + i}`, f(from + i)]));

// ---- measure helpers ------------------------------------------------------------------------------------------------
export const m = (x: Record<string, number | boolean | string>): Record<string, number | boolean | string> => x;
export const w = (rows: Row[], k: string, t0: number, t1: number): number => r1(mean(rows, k, t0, t1));
export const w2 = (rows: Row[], k: string, t0: number, t1: number): number => r2(mean(rows, k, t0, t1));
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => r1(maxOf(rows, k, t0, t1).v);
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => r1(minOf(rows, k, t0, t1).v);
/** The heart ejects (a pulse): an organised rhythm without the pulseless flag that has ejected within 3 s. */
export const perfusing = (r: Row): boolean => r.pulseless !== true && r.noEject !== true;
export const pulseAt = (rows: Row[], t0: number, t1: number): number => { const r = rows.find((x) => (x.t as number) > t0 && (x.t as number) <= t1 && perfusing(x)); return r ? (r.t as number) - t0 : NaN; };
export const sustained = (rows: Row[], t0: number, t1: number): boolean => rows.filter((x) => (x.t as number) > t0 && (x.t as number) <= t1).every(perfusing);
export const anyR = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): boolean => rows.some((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r));
export const outcome = (R: ArmResult): string => { const d = [...R.device].reverse().find((x) => x.defib?.lastShock); return d ? String(d.defib.lastShock.outcome) : 'none'; };
export const share = (xs: string[], pred: (x: string) => boolean): number => r1((100 * xs.filter(pred).length) / Math.max(1, xs.length));
export const rh = (R: ArmResult): string => R.rhythms.map(([t, id]) => `${t}s ${id}`).join(', ');
export const arms = (R: Record<string, ArmResult>, prefix: string): ArmResult[] => Object.entries(R).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);

// ---- beat analysis on the 10 ms fine window (IABP) ------------------------------------------------------------------
export interface FBeat { tOpen: number; tClose: number; sys: number; edp: number; diaPeak: number; sv: number }
/** Beats from the fine rows: opening = qAv crosses 0 upward; sys = max aortic pressure while qAv > 0; edp = aortic
 *  pressure at the opening (the end-diastolic pressure the beat ejects against); diaPeak = the maximum aortic pressure
 *  between this beat's closure and the next opening (the balloon's diastolic augmentation, or the notch); sv = ∫qAv. */
export function fbeats(f: FineRow[]): FBeat[] {
  const out: FBeat[] = [];
  let cur: FBeat | null = null;
  let open = false;
  for (let i = 1; i < f.length; i++) {
    const a = f[i - 1]!, b = f[i]!;
    const nowOpen = b.qAv > 1;
    if (nowOpen && !open) { if (cur) out.push(cur); cur = { tOpen: b.t, tClose: NaN, sys: b.pAo, edp: a.pAo, diaPeak: -Infinity, sv: 0 }; }
    if (!nowOpen && open && cur) cur.tClose = b.t;
    if (cur) {
      if (nowOpen) { cur.sys = Math.max(cur.sys, b.pAo); cur.sv += b.qAv * (b.t - a.t); }
      else cur.diaPeak = Math.max(cur.diaPeak, b.pAo);
    }
    open = nowOpen;
  }
  return out; // the last (incomplete) beat is dropped
}
export const avgOf = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
