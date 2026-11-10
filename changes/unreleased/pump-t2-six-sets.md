### Changed

- **Engine: the six TCI model sets stay pending, each with its reason (pump-rack plan, T2).** Two readers tried
  to read the engine's six TCI sets against their papers: Eleveld, Schnider and Marsh for propofol, Minto for
  remifentanil, Shafer for fentanyl, Gepts for sufentanil. Neither could read a full text. The publishers' pages
  refused automated reading or offered only a PDF file, and the workspace library holds none of the papers. So no set
  registers, and no value changes. `PENDING_TCI_REASONS` now records, for each pending id, why it is pending and the
  table its registration needs, and a test requires a reason for every pending id. The abstracts confirm part of each
  set and show two differences that only the tables can settle: Eleveld's Q2 at the reference patient (abstract
  1.75 L/min, engine 1.830) and Gepts's V2 and V3 implied by the engine's microconstants (63.4 and 251.9 L, against
  63.1 and 261.6 L). Details: `docs/guides/tci-sets.md`, "The T2 reading".
