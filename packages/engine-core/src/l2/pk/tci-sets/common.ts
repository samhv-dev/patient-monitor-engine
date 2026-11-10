// What the six T2 sets share: the units string and the two readers (docs/guides/tci-sets.md, "The T2 reading").
export const UNITS_MG = 'L, L/min, /min; amount mg → µg/mL';
export const UNITS_MCG = 'L, L/min, /min; amount µg → ng/mL';
/** The two readings of 10 Nov 2026: the T2 executor, and an agent that rendered and read the same pages without the
 * first reader's values. A constant registered only where both read the same digits. */
export const READ_BY_T2 = { first: 'T2 executor (Claude Opus 5.5)', second: 'independent second reader (Claude Opus 5.5 agent)', date: '2026-11-10' } as const;
