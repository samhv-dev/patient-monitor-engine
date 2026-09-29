// FU-4 G6 (Task 11, D9): one disease, one command. The engine applies an obstructive-shock event to BOTH owners before
// its normal chain: the circulation (7a: PVR by the φ mapping — the one PE PVR source) and the lungs (7b: dead space,
// shunt, resistance; the per-side pleural pressure — the one tension-PTX source, `lp.pPtx`). Whichever spelling the
// scenario, the console or the ventilator link uses, the patient gets the same state.
import type { Command } from '../../types.ts';

export interface AliasPair {
  circ: Command | null; // the Stage 2/7a condition to apply (null: none)
  lung: Command; // the Stage 3/7b lung condition to apply
}

const withEvent = (cmd: Command, event: Record<string, unknown>): Command => ({ ...(cmd as object), event } as unknown as Command);

/** The pair an event expands to, or null when it is not an aliased obstructive-shock event. */
export function obstructiveAlias(cmd: Command): AliasPair | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as { kind: string; id?: string; severity?: number; side?: 'L' | 'R' };
  const s = ev.severity ?? 1;
  if (ev.kind === 'condition' && ev.id === 'pe') return { circ: cmd, lung: withEvent(cmd, { kind: 'lungCondition', id: 'pe', severity: s }) };
  if (ev.kind === 'lungCondition' && ev.id === 'pe') return { circ: withEvent(cmd, { kind: 'condition', id: 'pe', severity: s }), lung: cmd };
  if (ev.kind === 'condition' && ev.id === 'tensionPtx') return { circ: null, lung: withEvent(cmd, { kind: 'lungCondition', id: 'ptxTension', severity: s, side: ev.side ?? 'R' }) };
  return null;
}
