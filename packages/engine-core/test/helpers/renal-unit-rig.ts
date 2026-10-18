// FU-9 unit rig for the 7d kidney alone: 70 kg at the healthy reference inputs (MAP 93, CVP 5, CO 5.6 L/min).
import { createRenal, stepRenal, type RenalInputs, type RenalState } from '../../src/l2/renal/model.ts';

export const RENAL_W = 70;
export const RENAL_BASE: RenalInputs = { map: 93, cvp: 5, iap: 0, coLpm: 5.6, bvRel: 1, albuminGL: 42, anaesthesia: 'none', pawExcessCmH2O: 0, alphaExcess: 0, sepsis: 0 };
export const uopMlKgH = (s: RenalState): number => (s.uopMlMin * 60) / RENAL_W;
/** Create the kidney settled at `start` (with nephron loss `aki`), then hold `inp` for `secs` in 1 s steps. */
export function renalHold(inp: RenalInputs, secs: number, aki = 0, start: RenalInputs = RENAL_BASE): RenalState {
  const s = createRenal(start, RENAL_W, aki);
  for (let i = 0; i < secs; i++) stepRenal(s, inp, 1);
  return s;
}
