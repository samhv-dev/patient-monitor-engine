// Built-in scenarios (JSON under packages/controller/scenarios/). All are [draft] until Ali's clinical review.
import aclsVf from '../../scenarios/acls-vf-witnessed.json';
import aclsPea from '../../scenarios/acls-pea-hypovolaemia.json';
import aclsBrady from '../../scenarios/acls-bradycardia-unstable.json';
import svtAdenosine from '../../scenarios/svt-adenosine.json';
import orInduction from '../../scenarios/or-induction-hypotension.json';
// FU-8 (Stage 9 R-S9-2): the six Stage 7f documents join the list — the driver loaded only the first five by id
import depthAwareness from '../../scenarios/depth-awareness.json';
import depthLight from '../../scenarios/depth-light-anaesthesia.json';
import depthOpioidApnoea from '../../scenarios/depth-opioid-apnoea.json';
import nmbMhTrigger from '../../scenarios/nmb-mh-trigger.json';
import nmbResidualBlock from '../../scenarios/nmb-residual-block.json';
import nmbSuxBurn from '../../scenarios/nmb-sux-burn.json';

const LIST: Array<{ id: string; title: string }> = [
  aclsVf, aclsPea, aclsBrady, svtAdenosine, orInduction, depthAwareness, depthLight, depthOpioidApnoea, nmbMhTrigger, nmbResidualBlock, nmbSuxBurn,
];

/** id → raw document (validated by the driver on load). */
export const BUILTIN_SCENARIOS: Record<string, unknown> = Object.fromEntries(LIST.map((d) => [d.id, d]));
/** For the panel's built-in list. */
export const BUILTIN_CATALOGUE: Array<{ id: string; title: string }> = LIST.map((d) => ({ id: d.id, title: d.title }));
