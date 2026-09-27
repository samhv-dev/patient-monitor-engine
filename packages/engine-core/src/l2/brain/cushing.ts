// Cushing response (tables §5.1): brainstem ischaemia when CPP — computed on the PRE-SURGE MAP, so the response
// cannot switch itself off — stays below 40 mmHg, OR the ICP comes within 10 mmHg of the (current) head MAP, for
// > 30 s (the tables' two triggers). Drive 0–1 (onset τ 15 s → MAP +30–50 over 30–60 s), giving ΔMAP = 50·drive
// (sympathetic surge), HR × (1 − 0.4·drive) (vagal) and ataxic breathing = drive.
import { CUSH_CPP, CUSH_DELAY_S, CUSH_DMAP, CUSH_GAP, CUSH_HR_DROP, CUSH_OFF_S, CUSH_TAU_OFF_S, CUSH_TAU_ON_S } from './params.ts';

export interface CushingState {
  lowS: number; // time a trigger (pre-surge CPP < 40, or MAP_head − ICP < 10) has held
  okS: number; // time neither has held
  active: boolean;
  drive: number; // 0–1
}

export const createCushing = (): CushingState => ({ lowS: 0, okS: 0, active: false, drive: 0 });

/** Advance by dt (s) with the pre-surge CPP and the current head-MAP − ICP gap (Infinity: gap trigger unused). */
export function stepCushing(c: CushingState, cppBase: number, gap: number, dt: number): void {
  const gapLow = gap < CUSH_GAP;
  if (cppBase < CUSH_CPP || gapLow) {
    c.lowS += dt;
    c.okS = 0;
  } else {
    c.okS += dt;
    c.lowS = 0;
  }
  if (!c.active && c.lowS >= CUSH_DELAY_S) c.active = true;
  if (c.active && c.okS >= CUSH_OFF_S) c.active = false;
  // full surge at CPP ≤ 31; 70 % at the threshold (tables: MAP +30–50 once triggered) [ENG]
  const target = c.active ? (gapLow ? 1 : Math.min(1, 0.7 + (CUSH_CPP - cppBase) / 30)) : 0;
  const tau = target > c.drive ? CUSH_TAU_ON_S : CUSH_TAU_OFF_S;
  c.drive += (target - c.drive) * (1 - Math.exp(-dt / tau));
  if (c.drive < 1e-4 && target === 0) c.drive = 0;
}

export const cushingDMap = (c: CushingState): number => CUSH_DMAP * c.drive;
export const cushingHrFactor = (c: CushingState): number => 1 - CUSH_HR_DROP * c.drive;
