import type { OracleRow } from './scenarios.ts';
/** agree: |ours − pulse| ≤ tol·max(1, |pulse|); expect-differ: must be OUTSIDE (a Pulse fix is then noticed). */
export function compareRow(ours: number, pulse: number, row: OracleRow): 'agree' | 'expect-differ-ok' | 'excluded' | 'fail' {
  if (row.expect === 'exclude') return 'excluded';
  const inside = Math.abs(ours - pulse) <= row.tol * Math.max(1, Math.abs(pulse));
  if (row.expect === 'agree') return inside ? 'agree' : 'fail';
  return inside ? 'fail' : 'expect-differ-ok';
}
