# Writing a formulary entry

The formulary is the data the learner remote's preparation bench reads: for each injectable drug of the library, the
products a learner prepares from, their strengths, the diluents the label lists, and what the sources say about
compatibility and stability. It lives in `packages/controller/formulary/`; the engine never reads it. The plan is
`docs/plans/learner-action-remote.md` (§5 and the rulings LQ5, LQ6 in its section 0).

**Every number in an entry names its source.** There are no placeholders: a value the sources do not give is written
as a gap that names the owner's question, and the bench says so. The CI check
(`packages/controller/test/formulary/sources.test.ts`) refuses an entry that breaks any of the rules below, on every
pull request.

## The files

| File | What it holds |
|---|---|
| `<drugId>.json` | one drug: its products, its diluents, its admixtures, its stability figures, its `has` flags. The name is the library's id (`dantrolene.json`) |
| `diluents/<id>.json` | one diluent (0.9 % sodium chloride, 5 % dextrose, sterile water for injection, Ringer's lactate, and any a label names) |
| `sources.json` | every source an entry cites, by key; an entry's `src` is one of these keys |
| `pending.json` | the injectable ids that have no file yet. A batch that adds a drug's file removes its id here; the list only shrinks, and the last batch empties it |
| `schema.json` | the files' shape (JSON Schema); the source rules beyond shape are `checkFormulary` in `packages/controller/src/formulary/load.ts` |

The layer covers the library's 61 injectable drugs (the four volatiles are not prepared). A drug added to the
library without a file and without a line in `pending.json` fails the build.

## Which source answers what

| Source | `kind` in `sources.json` | It answers | Its required fields |
|---|---|---|---|
| **Stabilis** (stabilis.org), the source of record | `stabilis` | compatibility and stability statements and their figures | `id` (the monograph), `retrieved` (YYYY-MM-DD), `cites` (the reference Stabilis gives for the figure) |
| **Trissel's Handbook on Injectable Drugs, 17th edition (2013)**, the cross-check | `trissel` | the cross-check of every statement; the statement itself only where Stabilis has none | `edition` (`17 (2013)`, the only one accepted), `monograph`, `page`, `reader`, `date` |
| **The product's label** (DailyMed or EMC for now, the department's leaflet once the stock list arrives) | `monograph` | products, strengths, concentrations, the listed diluents (a diluent not listed is a wrong diluent) | `product`, `holder`, `version`, `issuer` (`DailyMed`, `EMC` or `department`) |
| A paper | `study` | a preparation time or a measured loss | `citation`, and a `doi` or a `pmid` |

## The rules the check enforces

1. Every number sits in an object that has a `src`, or in one marked `gap`; every `src` is a key of `sources.json`.
2. Every source has its kind's required fields (the table above).
3. Every compatibility (`diluents[].compat`), admixture and stability statement cites Stabilis, or Trissel when the
   file's `has.stabilis` is false; and carries `crossCheck.trissel`: `agrees`, `differs` or `not listed`, with the
   Trissel page as `crossCheck.src` unless `not listed`. A `differs` carries a `ruling`: who ruled, the date, and which
   source the entry follows.
4. A `gap` names an owner question of the plan's §10 (`LQ1`–`LQ14`) and holds no number. A preparation time may be a
   gap (`{ "gap": "LQ7" }`: the preparation is ready at once and the Debrief says "no source for the preparation
   time"); a strength, a reconstitution or a diluent's content may not, because the bench cannot deliver without it.
5. The drug files and `pending.json` together are exactly the 61 injectable ids, with no id in both.
6. Every string is at most 200 characters, and the folder holds JSON entries only, none larger than 32 kB.

What no check can prove is that an entry says what its source says. Every entry is read against its sources by a
second reader before its batch merges, and the batch's pull request lists each entry with the reader's "agrees" or
the difference.

## The `has` field

Every file says which of the three sources it has: `"has": { "stabilis": true, "trissel": true, "monograph": true }`.
The flags must match the sources the file actually cites (rule 3): a file that cites a Trissel page has
`trissel: true`, and one that cites none has `false`. A drug Stabilis does not cover has `stabilis: false`, and its
statements then come from Trissel, which the entry says by that flag.

## The copyright rule

Trissel's Handbook is a paid publication. It is read in place, in the workspace library
(`library/sources/full-pdfs/`, outside this repository), and cited by edition and page. **Never copy it, a page of it
or text extracted from it into the repository**: no PDF, no text file, no pasted passage. A statement is written in
our words, in at most 200 characters. The check refuses a PDF anywhere under `packages/`, any file in the formulary
folder that is not a JSON entry, and any string longer than 200 characters. The same holds for Stabilis and the
labels: an entry paraphrases and cites; it does not reproduce.

## An entry's shape

The angle-bracketed values are placeholders showing where each value comes from (in a real file a number is a number); they are not data.

```json
{
  "drugId": "<the library id>",
  "products": [{
    "id": "<the label's product>", "form": "<powder, solution or emulsion>",
    "strength": { "amount": "<from the label>", "unit": "mg", "perVial": true, "src": "<a monograph key>" },
    "reconstitute": { "diluents": ["water"], "volumeMl": "<from the label>", "src": "<a monograph key>" },
    "prepTime": { "gap": "LQ7" }
  }],
  "diluents": [
    { "id": "water", "listed": true, "src": "<a monograph key>" },
    { "id": "saline", "listed": false, "src": "<a monograph key>",
      "compat": { "verdict": "<verdict>", "statement": "<our words>", "src": "<a stabilis key>",
                  "crossCheck": { "trissel": "<agrees, differs or not listed>", "src": "<a trissel key>" } } }
  ],
  "admixtures": [],
  "stability": [],
  "has": { "stabilis": true, "trissel": true, "monograph": true }
}
```

`verdict` is `incompatible`, `compatible`, `conditional` or `not tested`. A stability row gives the diluent, the
container (`vial`, `syringe-pp`, `bag-pvc`, `bag-polyolefin`), the temperature in °C and the source's points as
`[hours, fraction remaining]`, as the source gives them; the bench never extrapolates past the last point.
