// Type-level (checked by `tsc`, not run): the types F2 and F3 share are fixed here (plan F1), so the two pieces can be
// built in parallel. F3 may only ADD fields to Administration, and updates this file in the same commit when it does.
import type { Administration, AnyScenarioDoc, PhaseEntry, RuleEdge, RunnerInputV2, ScenarioDoc, ScenarioDocV2 } from '../../src/scenario/index.ts';
import { isV2 } from '../../src/scenario/index.ts';

const entry: PhaseEntry = { id: 'early', t: 488, exitT: 509.1, rule: 'enter:early' };
const edge: RuleEdge = { rule: 'phase:early', t: 488, value: true };
const given: Administration = {
  seq: 1, t: 509.1, source: 'action', actionId: 'dantrolene', kind: 'drug', drugId: 'dantrolene', cls: 'dantrolene', dose: 2.5, unit: 'mg/kg', perKg: 2.5,
  route: 'iv', result: { accepted: true },
};
const refused: Administration = { seq: 2, t: 600, source: 'sheet', kind: 'drug', drugId: 'dantrolene', route: 'im', result: { accepted: false, reason: 'route im not modelled', routeNotModelled: true } };
const inputs: RunnerInputV2[] = [
  { kind: 'signals', signals: { pulse: true, dantroleneE: 0.4, setMinuteVentilationLMin: 6, map: 72, mhActivity: 0.3 } },
  { kind: 'values', rank: 3, values: { etco2: 50 } },
];
// @ts-expect-error — an administration's result says why it was refused
const noReason: Administration = { seq: 3, t: 1, source: 'panel', kind: 'cpr', result: { accepted: false } };

declare const any: AnyScenarioDoc;
if (isV2(any)) {
  const v2: ScenarioDocV2 = any;
  void v2.phases;
} else {
  const v1: ScenarioDoc = any;
  void v1.states;
}
void [entry, edge, given, refused, inputs, noReason];
