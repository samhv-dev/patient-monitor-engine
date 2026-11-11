// The drug long run's TCI events (test/engine/pk-longrun.test.ts), shared with its control
// (test/engine/pk-tci-pump-control.test.ts) so the two rigs cannot drift apart. Propofol's pump is typed "with
// opioids" (Eleveld's co-administration flag): the rig runs remifentanil from t = 0, so the pump's data match the
// patient's and the long-run row has one cause (pump-rack E2; the orchestrator's ruling on brief 144).
export const LONGRUN_TCI_EVENTS = [
  { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 2.5, opioids: true },
  { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 2 },
] as const;
