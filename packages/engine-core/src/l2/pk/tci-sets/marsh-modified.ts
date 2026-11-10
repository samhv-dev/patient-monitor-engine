// Modified Marsh: Marsh 1991 Table I PK (marsh.ts) with Struys 2000's ke0 1.21 /min, which Struys calculated to give a
// 1.6 min time to peak with this PK (p. 404; the 1.6 min is Schnider 1999's). Absalom 2009 (p. 30) calls the pair the
// "modified Marsh" and rounds the ke0 to 1.2. Read by two readers.
import { MARSH_BASE, STRUYS_2000, marshPropofol } from './marsh.ts';
import type { TciSet } from './types.ts';

export const MARSH_MODIFIED: TciSet = {
  params: (p) => marshPropofol(p, true),
  meta: {
    ...MARSH_BASE,
    id: 'marsh-modified',
    name: 'Modified Marsh (propofol; ke0 1.21, Struys 2000)',
    ke0: {
      value: 1.21,
      method: 'ttpe',
      src: STRUYS_2000,
      fittedWith: 'this set (Marsh PK): "a ke0 of 1.21 min-1 would produce a peak effect-site concentration of 1.6 min when using the Marsh pharmacokinetics" (p. 404); the 1.6 min is Schnider 1999\'s',
      ttpeMin: 1.6,
      note: 'Absalom 2009 (p. 30) rounds it to 1.2 /min; Struys 2000 prints 1.21, which the engine carries',
    },
  },
};
