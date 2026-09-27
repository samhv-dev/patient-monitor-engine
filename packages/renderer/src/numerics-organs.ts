// Stage 7d numeric tiles: ICP (mean) with CPP, PbtO2, urine output (mL/h over 60 min, cumulative). Pure formatters
// (Node has no DOM); the tiles reuse PressureTile like Stage 3's (numerics-resp.ts).
import type { Measured } from '@pme/engine-core';

const ok = (x: Measured | undefined): x is Measured & { value: number } => !!x && x.value !== null && x.flag !== 'invalid';
export const ICP_HIGH = 22; // BTF 2016 threshold (tables §5.1)
export const PBTO2_LOW = 20; // BOOST threshold (tables §5.1)
export const OLIGURIA_ML_KG_H = 0.5; // KDIGO (tables §5.2)

export function formatIcp(icp: Measured | undefined, cpp: Measured | undefined): { main: string; sub: string; status: string } {
  return {
    main: ok(icp) ? String(Math.round(icp.value)) : '--',
    sub: `CPP ${ok(cpp) ? Math.round(cpp.value) : '--'}`,
    status: ok(icp) && icp.value > ICP_HIGH ? 'ICP HIGH' : '',
  };
}

export function formatPbto2(p: Measured | undefined): { main: string; status: string } {
  return { main: ok(p) ? String(Math.round(p.value)) : '--', status: ok(p) && p.value <= PBTO2_LOW ? 'LOW PbtO2' : '' };
}

/** UOP in mL/h; `weightKg` (optional) turns on the < 0.5 mL/kg/h OLIGURIA text. */
export function formatUop(uop: Measured | undefined, cumMl?: number, weightKg?: number): { main: string; sub: string; status: string } {
  return {
    main: ok(uop) ? String(Math.round(uop.value)) : '--',
    sub: cumMl === undefined ? '' : `Σ ${Math.round(cumMl)} mL`,
    status: ok(uop) && weightKg !== undefined && uop.value / weightKg < OLIGURIA_ML_KG_H ? 'OLIGURIA' : '',
  };
}
