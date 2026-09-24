import type { Modifiers } from './types.ts';

/** Default modifiers (brief §5 defaults; awake-adult HRV per §4.1). */
export function defaultModifiers(): Modifiers {
  return { pvc: null, rsa: 0.67, hrvScale: 1, qtc: 400, artefact: { noise: 1 } };
}
