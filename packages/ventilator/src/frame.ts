// vent → engine: one R27 VentFrame from the ventilator's current step. Volume is the volume delivered since the
// breath started (a real ventilator's VT trace), so trapped gas (auto-PEEP) never inflates the engine's VT.
// Pause and inspiratory hold count as inspiration (Ti includes the pause, as a ventilator reports it).
import type { VentFrameExt } from '@pme/engine-core';
import type { VentState } from './types.ts';

/** The R27 frame: Stage 3's VentFrame + Stage V's optional alveolar pressure and mode (engine-core types-vent-link.ts). */
export type LinkFrame = VentFrameExt & { palvCmH2O: number; mode: string };

export function toVentFrame(vs: VentState, mode: string): LinkFrame {
  const p = vs.p;
  const open = vs.circuit === 'disconnected';
  const insp = !open && (vs.hold === 'insp' || (vs.hold === null && p.phase !== 'exp'));
  return {
    pawCmH2O: p.Paw,
    palvCmH2O: open ? 0 : p.Palv,
    flowLps: open ? 0 : p.Q,
    volumeMl: open ? 0 : Math.max(0, p.V - p.breathVstart),
    fio2: vs.cfg.fio2 / 100,
    peepCmH2O: vs.cfg.peep,
    phase: insp ? 'insp' : 'exp',
    mode,
  };
}
