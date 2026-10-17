// Stage 8b: scripts/finish-dist.ts rewrites relative `.ts` specifiers in emitted declarations (tsc keeps them).
import { describe, expect, it } from 'vitest';
import { rewriteDts } from '../../../scripts/finish-dist.ts';

describe('scripts/finish-dist rewriteDts', () => {
  it('rewrites relative .ts specifiers to .js and leaves package and JSON specifiers alone', () => {
    const src = [
      "export * from './calibration.ts';",
      "export { a, type B } from '../l2/x.ts';",
      'import type { C } from "./c.ts";',
      "export type D = import('./d.ts').D;",
      "import { createEngine } from '@pme/engine-core';",
      "import data from './data.json';",
    ].join('\n');
    expect(rewriteDts(src)).toBe([
      "export * from './calibration.js';",
      "export { a, type B } from '../l2/x.js';",
      'import type { C } from "./c.js";',
      "export type D = import('./d.js').D;",
      "import { createEngine } from '@pme/engine-core';",
      "import data from './data.json';",
    ].join('\n'));
  });
});
