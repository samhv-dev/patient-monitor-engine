// Plan learner-action-remote.md L4 (§4 D3, D4): the laptop's host makes every learner preparation from the SHIPPED
// formulary layer (packages/controller/formulary/), loaded by the app as its own chunk; it must load whole, under the
// same rules as the CI's source check, and hold the showcase drugs the remotes will prepare first.
import { describe, expect, it } from 'vitest';
import { loadShippedFormulary } from './formulary.ts';

describe("the app's formulary", () => {
  it('loads the shipped layer whole (every rule kept) with its drugs and diluents', async () => {
    const f = await loadShippedFormulary();
    expect(f).not.toBeNull();
    expect(Object.keys(f?.drugs ?? {})).toEqual(expect.arrayContaining(['fentanyl', 'midazolam', 'dantrolene', 'propofol']));
    expect(Object.keys(f?.diluents ?? {})).toEqual(expect.arrayContaining(['saline', 'water', 'dextrose5']));
  });
});
