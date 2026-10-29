// Type-level (checked by `tsc`, pnpm typecheck; not run): ClinicalEvent carries the engine's event shapes (plan F1;
// design §9.1 side finding, plan "Where the design and the code disagree" 5), so the events the two demo cards already
// send are typed, and so is each shape the engine's drug model takes. The schema checks `kind` only.
import type { ClinicalEvent } from '../../src/protocol.ts';

// the MH card's
const mh: ClinicalEvent[] = [
  { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' },
  { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 0, fgfLpm: 10 },
  { kind: 'airwayDevice', device: 'ett' },
  { kind: 'fluid', fluid: 'saline', volumeMl: 1600, overS: 900 },
  { kind: 'drug', drugId: 'sodiumBicarbonate', dose: 1, unit: 'mmol/kg', route: 'iv' },
];
// the haemorrhage card's
const haem: ClinicalEvent[] = [
  { kind: 'airwayDevice', device: 'ett' },
  { kind: 'fluid', fluid: 'balanced', volumeMl: 1000, overS: 90 },
];
// the engine's drug shapes: every PkRoute, a drug's overS and concentrationPct, a TCI
const pk: ClinicalEvent[] = [
  { kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'central' },
  { kind: 'drug', drugId: 'epinephrine', dose: 0.5, unit: 'mg', route: 'im' },
  { kind: 'drug', drugId: 'hypertonicSaline', dose: 3, unit: 'mL/kg', route: 'iv', overS: 600, concentrationPct: 3 },
  { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 },
];
// @ts-expect-error — still no unknown kind
const bad: ClinicalEvent = { kind: 'teleport' };
// @ts-expect-error — nor an unknown route
const badRoute: ClinicalEvent = { kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg', route: 'oral' };
void [mh, haem, pk, bad, badRoute];
