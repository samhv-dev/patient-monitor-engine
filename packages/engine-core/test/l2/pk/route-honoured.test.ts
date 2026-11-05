// F5.1a: routeHonoured asks the engine which routes it models, so the validator, the record and the Drug sheet stop
// parsing the refusal's sentence. It must agree with validatePkCommand for every row and every route.
import { describe, expect, it } from 'vitest';
import { DRUGS, DRUG_IDS, IV_ROUTES, routeHonoured, type Command, type PkRoute } from '../../../src/index.ts';
import { createPkState, validatePkCommand } from '../../../src/l2/pk/pipeline.ts';

const ROUTES: PkRoute[] = ['iv', 'io', 'im', 'inh', 'neb', 'sc', 'perineural', 'central'];
const bolus = (drugId: string, route: PkRoute) => ({ type: 'applyEvent', event: { kind: 'drug', drugId, dose: 1, unit: DRUGS[drugId]!.amountUnit, route } }) as unknown as Command;

describe('routeHonoured (F5.1a)', () => {
  it('equals what validatePkCommand accepts, for every row and every route', () => {
    const pk = createPkState();
    const off: string[] = [];
    for (const id of DRUG_IDS)
      for (const r of ROUTES) {
        const accepted = validatePkCommand(bolus(id, r), pk) === undefined;
        if (routeHonoured(id, r) !== accepted) off.push(`${id} ${r}: routeHonoured ${routeHonoured(id, r)}, validatePk ${validatePkCommand(bolus(id, r), pk) ?? 'accepts'}`);
      }
    expect(off).toEqual([]);
  });
  it('IM epinephrine is not honoured; IV and IM dantrolene are (IM: its route model, F5.2); nebulised salbutamol is; an unknown drug is not', () => {
    expect(routeHonoured('epinephrine', 'im')).toBe(false);
    expect(routeHonoured('dantrolene', 'im')).toBe(true);
    expect(routeHonoured('dantrolene', 'iv')).toBe(true);
    expect(routeHonoured('salbutamol', 'neb')).toBe(true);
    expect(routeHonoured('unobtainium', 'iv')).toBe(false);
  });
  it('the package index exports IV_ROUTES', () => {
    expect(IV_ROUTES).toEqual(['iv', 'io', 'central']);
  });
});
