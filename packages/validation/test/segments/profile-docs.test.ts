// FU-3 item 9 (G8a ruling, FU-3 addition 9): the ten documents Stage 8a listed as NOT MEASURABLE (gate note
// Deviation 3: a patient profile pme-scenario/1 could not carry) now run on their own patient through
// `patient.profile` (chronic conditions) and t = 0 actions (acute events). This asserts that they RUN and grade every
// target — not that the rows are green: a red row is a calibration row (R44/R45), queued like any other.
import { describe, expect, it } from 'vitest';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';
import { runValidationDoc } from '../../src/segments/run.ts';

const PROFILE_DOCS = [
  't10-as-cad-propofol', 't11-chronic-mr-fluid', 't15-rv-infarct', 't16-septic-shock-warm', 't17b-class3-bb',
  't18-htn-hypocapnia-cbf', 't19-tbi-haematoma', 't20-low-flow-oliguria', 't22-term-spinal', 't23-term-apnoea',
];
/** A command no stage implements yet (decision 8), by document: `neuraxial` (spinal level) has no owner in 7a–7g. */
const STILL_REFUSED: Record<string, RegExp> = { 't22-term-spinal': /^applyEvent neuraxial$/ };

/** FU-3 Task 11 Step 3b (R50 review finding 2): this base has no 7e `condition sepsis`, so t16 is an expected failure
 * with the measured refusal in its title. When 7e lands: delete this constant and the `it.fails`, and restore
 * `it.each(PROFILE_DOCS)` (t16 then runs like the other nine). */
const WAITS_FOR_7E = 't16-septic-shock-warm';
describe('profile documents run on their own patient (FU-3 item 9)', { timeout: 900_000 }, () => {
  it.fails(`${WAITS_FOR_7E}: needs 7e condition sepsis — measured unsupported: [{ t: 0.1, type: "applyEvent condition", reason: "condition sepsis arrives in Stage 7" }]`, async () => {
    const d = SANITY_DOCS.find((x) => x.id === WAITS_FOR_7E);
    if (!d) throw new Error(`no document ${WAITS_FOR_7E}`);
    const r = await runValidationDoc(d);
    console.log(`${WAITS_FOR_7E} unsupported: ${JSON.stringify(r.unsupported)}`);
    expect(r.unsupported).toEqual([]);
    expect(r.measurable).toBe(true);
  });
  it.each(PROFILE_DOCS.filter((x) => x !== WAITS_FOR_7E))('%s: no "patient profile" refusal; every target graded', async (id) => {
    const d = SANITY_DOCS.find((x) => x.id === id);
    if (!d) throw new Error(`no document ${id}`);
    const r = await runValidationDoc(d);
    for (const x of r.results) console.log(`${x.grade} | ${id} / ${x.segment} / ${x.target} | ${x.measured.toFixed(1)} | ${x.expected}`);
    const refused = STILL_REFUSED[id];
    expect(r.unsupported.filter((u) => !refused?.test(u.type))).toEqual([]);
    if (refused) return expect(r.measurable).toBe(false);
    expect(r.measurable).toBe(true);
    expect(r.results.map((x) => `${x.segment}/${x.target}`)).toEqual(d.segments.flatMap((s) => s.targets.map((t) => `${s.id}/${t.id}`)));
  });
});
