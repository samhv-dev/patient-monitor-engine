# Adding a TCI model set

A TCI model set is a published pharmacokinetic set, and the ke0 that goes with it, that a target-controlled infusion
pump predicts from. A real pump never measures the patient. It computes its rates from the set it was told to use and
the age, weight, height and sex typed into it, so its Cp and Ce are predictions. In this engine each set is data with
its source: a pure function of the typed patient and a metadata row saying where every number comes from. The sets
live in `packages/engine-core/src/l2/pk/tci-sets/`. The plan is `docs/plans/pump-rack-tci.md`, §6.

**Five sets are registered** (piece T2, 10 November 2026): Eleveld and Schnider for propofol, Minto for remifentanil,
Shafer for fentanyl, Gepts for sufentanil. Each was read against its paper by two readers. The engine's patient models
and the TCI command read their parameters and ids from the registry. **Marsh stays pending.** Its PK is confirmed, but
its ke0 of 0.26 /min has no source; the reason is recorded in `PENDING_TCI_REASONS`.

The CI check (`packages/engine-core/test/l2/pk/tci-sets.test.ts`) runs in the unit job on every pull request. It
refuses a set that breaks any of the rules below, and each rule also has a fixture made to break it, which shows the
rule really checks something.

## The files

| File | What it holds |
|---|---|
| `types.ts` | The shape: `TciSet` (`meta` + `params(patient, opts) → PkParams`), `TciSetMeta`, `TciPaper`, `TciPopulation`, `TciKe0`, `TciWorked`, `TciCovariate` |
| `index.ts` | `TCI_SETS` (the registry, in the order a pump lists the sets), `PENDING_TCI_MODEL_IDS`, `tciSet(id)`, `tciModeRefusal(set, mode)` and its text `NO_KE0_REFUSAL` |
| `common.ts` | The units strings and the T2 readers shared by the five set modules |
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
   must not also be pending. Since T2 the command's list is built from the registry's ids and
   `PENDING_TCI_MODEL_IDS` (`TCI_MODEL_IDS` in `pipeline.ts`). The pending list only shrinks; today it holds `marsh`.

## What the check cannot prove

The check cannot prove that a coefficient is the paper's. Every set is read against its paper by a second executor
before its batch merges, as the formulary is. The pull request lists each set with "agrees", or with the difference
found. If a set's numbers differ from what the engine used before, the pull request states the difference and runs
the validation workflow.

## The T2 reading (10 November 2026)

A set registers only when every constant it uses has been read in the paper itself, from the papers in the workspace
library (`library/sources/papers/tci/`, read in place). Two readers took part:
- the T2 executor;
- an independent agent that rendered and read the same pages without seeing the first reader's values.

Most of the papers are page photographs. Each table was read twice, first whole and then row by row at a higher zoom.
A constant registers only when both readers read the same digits. They agreed on every constant below, and neither
found an illegible digit.

| Set | Paper, table, page | What both readers read | Against the engine | Worked values (rule 4) | Status |
|---|---|---|---|---|---|
| `eleveld` | Eleveld 2018, Table 2 p. 950 (θ1–θ18); equations p. 948; FFM p. 946; ke0 p. 948 and Table 3 p. 952; corrigendum Br J Anaesth 2018;121:519 | θ1–θ18 as the code has them (θ15 printed 2.10). Q2 carries 1 + θ16·(1 − f_Q3mat) and is **not** normalised to the reference. The opioid factor is exp(θ·AGE), as printed | Agrees. The abstract's reference Q2 of 1.75 L/min was corrected to **1.83** by the corrigendum, which the engine already gives (1.830) | The abstract's values with the corrigendum's Q2 | registered |
| `schnider` | Schnider 1998, Table 2 p. 1176; James LBM p. 1173; ke0 from Schnider 1999, p. 1510 | θ1–θ11, centred at 53 y, 77 kg, LBM 59 kg, 177 cm; arterial sampling (p. 1171) | Agrees. The ke0 is printed as 0.456 in the 1999 abstract and text, "with the pharmacokinetic model from our companion study", but as 0.459 in that paper's Table 4. The engine keeps 0.456, and the difference is recorded in the metadata | The paper prints none (both readers checked the coefficients line by line). t½ke0 1.5 min (1999 Table 4) is reproduced | registered |
| `minto` | Minto 1997 I, Table 3 p. 17 (PK) and Table 5 p. 19 (ke0); James LBM p. 12 | Every coefficient, centred at 40 y and LBM 55 kg; ke0 0.595 − 0.007·(Age − 40) | Agrees | Minto 1997 II, Tables 1–2 p. 28, at 20 y with LBM 55 kg: V1 5.5, Cl1 2.9. t½ke0 and tpeak at 20, 50 and 80 y are reproduced. That table's V1 of 5.1 L at 50 y is not: paper I's Table 3 gives 4.9 | registered |
| `shafer` | Shafer 1990, Table 2 p. 1098, "Current Study" column; ke0 from the 3.6 min of Shafer & Varvel 1991, p. 55 | V1 6.09; k10 0.0827, k12 0.471, k13 0.225, k21 0.102, k31 0.00600 | Agrees. The `[VERIFY]` mark is resolved | V1–V3, Cl1–Cl3 and the microconstants; t½ 0.82 and 17.2 min are reproduced, and the terminal comes out 465.7 against the printed 465 | registered |
| `gepts` | Gepts 1995, Table 3 p. 1201, two-stage column; ke0 from the 5.6 min of Shafer & Varvel 1991, p. 55 | Estimated V1 14.3, V2 63.1, V3 261.6 L; Cl1 0.92, Cl2 1.55, Cl3 0.33 L/min. Derived k10 0.0645, k12 0.1086, k13 0.0229, k21 0.0245, k31 0.0013 | **Changed.** The engine used the derived, rounded microconstants. They give V2 63.4 and V3 251.9 L, and Vss 330 L, against the printed 63.1, 261.6 and 339. The set now uses the estimated parameters, which reproduce Vss 339 and t½α 3.3. The ke0 refitted to 5.6 min stays 0.176 (0.1757) | The six estimated parameters and k31 | registered |
| `marsh` | Marsh 1991, Table I p. 42; Gepts 1987 Table 3 p. 1261 (its stated origin); Absalom 2009 p. 30 and Table 1 (the ke0) | Vc 228 ml/kg (from the authors' pilot studies). k10 0.119, k12 0.112, k13 0.0419, k21 0.055, k31 0.0033, attributed to Gepts 1987. Gepts 1987's "Mean (n = 17)" column gives k10 0.1190, k13 0.0419, k21 0.0550 and k31 0.0033, which match, **but k12 0.1140**, which does not match 0.112 (no infusion-rate group gives 0.112 either: 0.0961, 0.0696, 0.1733) | The PK agrees with Marsh's Table I as printed. **ke0 0.26:** Absalom 2009 reports that it "came to be used with this model in first generation TCI pumps", and that "the data on which this keo value was based were never published in the peer-reviewed literature". Absalom's Table 1 pairs 0.26 with a time to peak of 4.5 min, but with Marsh's PK 0.26 peaks at 3.92 min; 4.5 min is the peak for ke0 0.20 (Struys 2000, p. 400). The modified ke0 of 1.2/1.21 is Struys 2000 (Absalom p. 30 agrees) | — | **pending**: rule 6 cannot state a ke0 of unpublished derivation truthfully (see below) |

The registered sets compute bit-identical parameters to the code before T2 for every patient. The exception is Gepts,
whose change is attributed in the pull request. Times to peak, half-lives and Vss are checked by
`test/l2/pk/tci-sets-papers.test.ts`.

**Schnider's ke0, the owner's ruling TQ1 (10 November 2026, "A for TQ1").** The ke0 stays 0.456 /min, as the abstract
and the text of Schnider 1999 (p. 1510) state it for use with the companion PK. Table 4's 0.459 is recorded beside it
in the set's metadata.

**Why Marsh stays pending.** Rule 6 lets a ke0 be one of two things:
- **`pkpd`**: estimated with a PK-PD model, naming the PK it was estimated with (`fittedWith`);
- **`ttpe`**: fitted to a published time to peak with this set's PK.

Marsh's 0.26 is neither. Absalom 2009 reports that it was the value first-generation pumps used, and that its
derivation was never published. No PK it was fitted with is known. Registering Marsh with 0.26 would therefore need
one of two things:
- a published derivation of 0.26;
- a third kind of ke0 in rule 6, meaning a device's value of unpublished derivation. It would carry the reporting
  paper with a DOI (Absalom 2009), the device (the Diprifusor), the PK it was used with (Marsh) and no `fittedWith`.
  It would also need the check to decide what to do with Absalom's printed time to peak of 4.5 min, which 0.26 does
  not reproduce with this PK (3.92 min).

The rule was not changed in T2.

