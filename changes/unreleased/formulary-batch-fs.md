### Added

- **Formulary batch FS: the fourteen showcase drugs and six diluents** (plan `docs/plans/learner-action-remote.md`
  §FS, §5, LQ5/LQ6). `packages/controller/formulary/` gains entries for epinephrine, propofol, dantrolene, rocuronium,
  midazolam, fentanyl, tranexamic acid, succinylcholine, sodium bicarbonate, salbutamol, insulin with dextrose,
  calcium chloride, phenylephrine and ephedrine, and diluent files for 0.9 % sodium chloride, 5 % glucose, water for
  injections, Ringer's lactate (compound sodium lactate), 5 % glucose in 0.9 % sodium chloride and 4 % glucose in
  0.18 % sodium chloride. Products, strengths, reconstitution and listed diluents come from public labels (EMC
  SmPCs; DailyMed for Adrenalin and Akovaz); stability and admixture statements from Stabilis (retrieved
  2026-11-10), rows at 20–27 °C in PVC or polyolefin bags and polypropylene syringes, each cross-checked against
  Trissel's Handbook, 17th edition (2013), by PDF page. `pending.json` shrinks from 61 to 47 ids. Two midazolam rows where Stabilis and Trissel differ follow Stabilis by the owner's ruling (10 November). Each stability point is the Stabilis level-of-evidence floor (0.9), or 0.95 at level A/A+. Every entry had a second, independent reading.
