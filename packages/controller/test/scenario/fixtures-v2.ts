// A small pme-scenario/2 document for the format-2 tests (plan F1). Plain JSON, as a card file is: the tests mutate it.
/** A minimal valid /2 document: three phases, one drug action. */
export const minimalV2 = () => ({
  schema: 'pme-scenario/2', id: 'mh2', title: 'MH (format 2)',
  phases: [
    { id: 'baseline', label: 'Baseline', initial: true, next: ['early'] },
    { id: 'early', label: 'Early signs', notes: 'EtCO₂ is climbing.', enter: { value: { var: 'etco2', op: '>', value: 45, forS: 20 } }, next: ['treated'] },
    { id: 'treated', label: 'Treated', enter: { all: [{ value: { var: 'dantroleneE', op: '>', value: 0.1 } }, { slope: { var: 'mhActivity', op: '<', perMin: 0, overS: 60 } }] } },
  ],
  actions: [
    {
      id: 'dantrolene', label: 'Dantrolene 2.5 mg/kg', kind: 'drug', phases: ['early'],
      give: [{ type: 'applyEvent', event: { kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' } }],
      drug: { id: 'dantrolene', dose: { value: 2.5, min: 2, max: 3, unit: 'mg/kg' }, route: { set: ['iv', 'central'], preferred: 'iv' } },
      window: { anchor: 'phase:early', withinS: 300 },
    },
  ],
}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

