# Adding a TCI model set

A TCI model set is a published pharmacokinetic set, and the ke0 that goes with it, that a target-controlled infusion
pump predicts from. A real pump never measures the patient. It computes its rates from the set it was told to use and
the age, weight, height and sex typed into it, so its Cp and Ce are predictions. In this engine each set is data with
its source: a pure function of the typed patient and a metadata row saying where every number comes from. The sets
live in `packages/engine-core/src/l2/pk/tci-sets/`. The plan is `docs/plans/pump-rack-tci.md`, §6.

**The registry ships empty.** The engine's six models (Eleveld, Schnider and Marsh for propofol, Minto for
remifentanil, Shafer for fentanyl, Gepts for sufentanil) move into it in piece T2, each read against its paper. Until
then the engine reads none of it, and its TCI behaves exactly as before.

The CI check (`packages/engine-core/test/l2/pk/tci-sets.test.ts`) runs in the unit job on every pull request. It
refuses a set that breaks any of the rules below, and each rule also has a fixture made to break it, which shows the
rule really checks something.

## The files

| File | What it holds |
|---|---|
| `types.ts` | The shape: `TciSet` (`meta` + `params(patient, opts) → PkParams`), `TciSetMeta`, `TciPaper`, `TciPopulation`, `TciKe0`, `TciWorked`, `TciCovariate` |
| `index.ts` | `TCI_SETS` (the registry, in the order a pump lists the sets), `PENDING_TCI_MODEL_IDS`, `tciSet(id)`, `tciModeRefusal(set, mode)` and its text `NO_KE0_REFUSAL` |
| `<id>.ts` | One set: its function and its metadata, exported together as one `TciSet`. The file name is the set's id (`schnider.ts`) |

To add a set: write `<id>.ts`, add it to `TCI_SETS` in `index.ts`, and remove its id from `PENDING_TCI_MODEL_IDS` if
it is there. Run the check, then have a second reader read the set against its paper (below).

## Which source answers what

| Field | Answered by | Notes |
|---|---|---|
| `paper` | The PK paper: authors, year, journal, volume, pages, and a `doi` or a `pmid` | A set whose paper cannot be read (open access or the workspace library) is not registered |
| `table` | The table or equation in that paper that holds the coefficients, with its page | Example: "Table 3, p. 1175" |
| the function's coefficients | That table, transcribed as printed | Units are converted to the engine's (L, L/min, /min) exactly, without rounding |
| `covariates`, `scalars` | The paper's model equations | `scalars` names a body-size formula with its author (`lbm:james`, `ffm:alsallami`) |
| `population` | The paper's description of its subjects (methods, or its Table 1) | Gives the age, weight and height ranges, and the sexes studied, with `src` |
| `reference` | A patient inside that population | Usually the paper's own reference or typical patient |
| `worked` | The values the paper prints for its reference or typical patient, copied as printed strings | The string carries the paper's precision. When the paper prints none, `{ none: "<why>" }` |
| `ke0` | The PK paper's PK-PD analysis; or a separate PK-PD paper; or a published time to peak effect | A separate paper must name the PK it was fitted with. A time-to-peak-effect ke0 is labelled `ttpe` |
| `site` | The paper's sampling methods | `arterial`, `venous`, or `unstated` when the paper does not say |
| `readBy` | The two executors who read the set against its paper, and the date | Both names, different people |

## The rules the check enforces

1. **Metadata.** Every registered set has its metadata. Its paper has a DOI or a PMID. It names its table, and the
   row is complete: an id in lower case with hyphens and registered once, a library drug with a compartment model, a
   population with a source and the reference patient inside it, a site, units, and two different readers with a
   date.
2. **The covariates are what the function reads.** Each covariate is perturbed: age, weight, height, sex,
   postmenstrual age, co-administered opioids, and the cholinesterase phenotype, which no set may read. Each
   perturbation is made at the reference patient and at the population's two corners. A covariate that is listed must
   change at least one parameter. One that is not listed must leave every parameter bit-identical.
3. **No ke0 means plasma targeting only.** A set with `ke0: { none: true }` returns no effect site (`ke0: []`), and
   `tciModeRefusal` refuses effect-site mode with "this model has no ke0: plasma targeting only". A set that states a
   ke0 returns at least one effect site.
4. **The paper's own numbers.** At the worked patient the function reproduces every printed value (`v1`–`v3`,
   `cl1`–`cl3`, the microconstants, `ke0`) to within half a unit of the last digit printed. A paper with no worked
   values says why in `worked.none`, and the second reader checks the coefficients line by line.
5. **No `[VERIFY]` mark** remains in a registered set's module or its metadata. A set whose module is missing is
   refused.
6. **Every ke0 says where it comes from.** A ke0 gives exactly one of `value` or `expr`, and a `value` is the one the
   function returns. A ke0 that is not the PK paper's own names its source, with a DOI or PMID, and the PK model it
   was fitted with (a ke0 belongs to the PK it was estimated with). A ke0 fitted to a published time to peak effect is
   `method: 'ttpe'`. It names the paper that gives the time and states `ttpeMin`, and with this set's PK it must peak
   within 0.02 min of that time. The engine's fentanyl 0.117 /min and sufentanil 0.176 /min are ke0s of this kind.
7. **The TCI command and the registry agree.** The engine's TCI command must accept every registered id (with its
   drug) and every id in `PENDING_TCI_MODEL_IDS`, and refuse the published set names not registered. A registered id
   must not also be pending. `PENDING_TCI_MODEL_IDS` holds the six ids the command accepts today from its own list in
   `pipeline.ts`. The list only shrinks. When it is empty, T2 replaces the command's list with the registry's ids.

## What the check cannot prove

The check cannot prove that a coefficient is the paper's. Every set is read against its paper by a second executor
before its batch merges, as the formulary is. The pull request lists each set with "agrees", or with the difference
found. If a set's numbers differ from what the engine used before, the pull request states the difference and runs
the validation workflow.
