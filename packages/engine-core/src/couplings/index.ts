// The coupling registry (docs/plans/mechanism-tree.md piece R1): every row, one file per model module, and the nodes
// they name. Rows for the six first triggers (haemorrhage, propofol, phenylephrine, esmolol, tension pneumothorax, PEEP)
// and every edge on their paths to the monitor; the other modules' rows are piece R2. The census seams no row carries
// yet are listed in unregistered.ts, which may shrink and never grow (scripts/couplings.ts --check).
import { BLOOD } from './blood.ts';
import { BREATHING } from './breathing.ts';
import { CIRCULATION } from './circulation.ts';
import { ENDOCRINE } from './endocrine-thermal.ts';
import { GAS_EXCHANGE } from './gas-exchange.ts';
import { LUNGS } from './lungs.ts';
import { MONITOR } from './monitor.ts';
import { NEURO } from './neuro.ts';
import { ORGANS } from './organs.ts';
import { PHARMACOLOGY } from './pharmacology.ts';
import { PRESSURE_WAVEFORMS } from './pressure-waveforms.ts';
import type { Coupling } from './types.ts';

export type { AuditRef, ConstRef, Coupling, EdgeClass, Form, NodeKind, NodeRef, SeamKey, Sign } from './types.ts';
export { EFFECTORS, OBSERVABLES, TRIGGERS, type EffectorDecl, type ObservableDecl, type TriggerDecl } from './nodes.ts';
export { UNREGISTERED } from './unregistered.ts';

export const COUPLINGS: readonly Coupling[] = [
  ...PRESSURE_WAVEFORMS, ...CIRCULATION, ...PHARMACOLOGY, ...ENDOCRINE, ...ORGANS, ...BLOOD, ...LUNGS, ...BREATHING,
  ...NEURO, ...GAS_EXCHANGE, ...MONITOR,
];
