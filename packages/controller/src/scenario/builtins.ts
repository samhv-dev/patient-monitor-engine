// Built-in scenarios (JSON under packages/controller/scenarios/). All are [draft] until Ali's clinical review.
import aclsVf from '../../scenarios/acls-vf-witnessed.json';
import aclsPea from '../../scenarios/acls-pea-hypovolaemia.json';
import aclsBrady from '../../scenarios/acls-bradycardia-unstable.json';
import svtAdenosine from '../../scenarios/svt-adenosine.json';
import orInduction from '../../scenarios/or-induction-hypotension.json';

const LIST: Array<{ id: string; title: string }> = [aclsVf, aclsPea, aclsBrady, svtAdenosine, orInduction];

/** id → raw document (validated by the driver on load). */
export const BUILTIN_SCENARIOS: Record<string, unknown> = Object.fromEntries(LIST.map((d) => [d.id, d]));
/** For the panel's built-in list. */
export const BUILTIN_CATALOGUE: Array<{ id: string; title: string }> = LIST.map((d) => ({ id: d.id, title: d.title }));
